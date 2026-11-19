#!/usr/bin/env bash
# Encryption at rest for CREQOR's live data on a DGX whose root disk is plain ext4.
# Creates a LUKS2 file-backed volume, mounts it, and moves PostgreSQL data, imports and
# backups onto it. Run by an operator with sudo; every destructive step asks first.
#
#   sudo infrastructure/dgx/encrypted-volume.sh plan       # show what would happen (no changes)
#   sudo infrastructure/dgx/encrypted-volume.sh create     # create + format + mount the volume
#   sudo infrastructure/dgx/encrypted-volume.sh migrate    # stop stack, copy data, repoint, restart
#   sudo infrastructure/dgx/encrypted-volume.sh unlock     # after a reboot: open + mount (passphrase)
#   sudo infrastructure/dgx/encrypted-volume.sh tpm-enroll # optional: auto-unlock via TPM2 at boot
#   sudo infrastructure/dgx/encrypted-volume.sh verify     # read-only check after migrate or a failed restart
#
# Boot-order guard: the mount-point directory is made immutable (chattr +i) BEFORE the
# encrypted filesystem is mounted on it. If Docker restarts PostgreSQL at boot while the
# volume is still locked, it cannot create ${MNT}/postgres on the plaintext root disk, so
# the container fails to start instead of silently initialising an unencrypted database.
#
# Unattended restarts: a passphrase-only volume must be unlocked by hand after every
# reboot (`unlock`). TPM2 enrolment unlocks automatically but only protects the disk
# when it is removed from this machine; choose consciously.
set -euo pipefail
OWNER="${CREQOR_OWNER:-dgxadmin}"
OWNER_HOME="$(getent passwd "$OWNER" | cut -d: -f6)"
APP="${CREQOR_APP_DIR:-$OWNER_HOME/creqor-platform/app}"
# Source data path: explicit override, else the CREQOR_DATA_DIR the stack is actually using.
env_value(){ grep -E "^$1=" "$APP/.env.dgx" 2>/dev/null | tail -1 | cut -d= -f2-; }
OLD_DATA="${CREQOR_OLD_DATA_DIR:-$(env_value CREQOR_DATA_DIR)}"
OLD_DATA="${OLD_DATA:-$OWNER_HOME/creqor-platform/data}"
IMG="${CREQOR_LUKS_IMAGE:-/var/lib/creqor/creqor-data.luks}"
SIZE="${CREQOR_LUKS_SIZE:-250G}"
NAME="creqor_data"
MNT="${CREQOR_SECURE_MNT:-/srv/creqor-secure}"
confirm(){ read -r -p "$1 Type YES to continue: " a; [[ "$a" == "YES" ]] || { echo 'Aborted.'; exit 1; }; }
need_root(){ [[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 2; }; }
as_owner(){ sudo -u "$OWNER" -H bash -c "cd '$APP' && $*"; }
compose="docker compose --env-file .env.dgx -f infrastructure/dgx/compose.yaml"

case "${1:-plan}" in
  plan)
    echo "Owner:            $OWNER"
    echo "Encrypted image:  $IMG ($SIZE, LUKS2, sparse until written)"
    echo "Mount point:      $MNT  (postgres/, imports/, backups/)"
    echo "Current data:     $OLD_DATA ($(du -sh "$OLD_DATA" 2>/dev/null | cut -f1 || echo unknown))"
    echo "Free on target:   $(df -h --output=avail "$(dirname "$IMG")" 2>/dev/null | tail -1 || df -h --output=avail / | tail -1)"
    command -v cryptsetup >/dev/null && echo "cryptsetup:       $(cryptsetup --version)" || echo 'cryptsetup:       MISSING (apt install cryptsetup)'
    [[ -e /dev/tpmrm0 ]] && echo 'TPM2:             present (tpm-enroll available)' || echo 'TPM2:             not detected'
    ;;
  create)
    need_root; command -v cryptsetup >/dev/null || { echo 'Install cryptsetup first.' >&2; exit 2; }
    [[ -e "$IMG" ]] && { echo "$IMG already exists; refusing to overwrite." >&2; exit 2; }
    confirm "Create and format a NEW encrypted volume at $IMG ($SIZE)?"
    install -d -m 700 "$(dirname "$IMG")"
    fallocate -l "$SIZE" "$IMG"; chmod 600 "$IMG"
    echo 'Choose a strong passphrase and store it in your password manager. Losing it loses the data.'
    cryptsetup luksFormat --type luks2 --pbkdf argon2id "$IMG"
    cryptsetup open "$IMG" "$NAME"
    mkfs.ext4 -q -L creqor-secure "/dev/mapper/$NAME"
    install -d -m 700 "$MNT"; chattr +i "$MNT"   # boot-order guard on the underlying directory
    mount -o noatime "/dev/mapper/$NAME" "$MNT"
    install -d -m 700 -o "$OWNER" -g "$OWNER" "$MNT/imports" "$MNT/backups"
    install -d -m 700 "$MNT/postgres"
    echo "Encrypted volume mounted at $MNT. Next: sudo $0 migrate"
    ;;
  migrate)
    need_root; mountpoint -q "$MNT" || { echo "$MNT is not mounted (run create or unlock)." >&2; exit 2; }
    # Never copy over a destination that is already live: after cutover the encrypted copy is authoritative.
    if [[ "$(env_value CREQOR_DATA_DIR)" == "$MNT" ]]; then
      echo "Already migrated (.env.dgx points to $MNT). Use: sudo $0 verify" >&2; exit 2; fi
    [[ -d "$OLD_DATA/postgres" && -f "$OLD_DATA/postgres/PG_VERSION" ]] || { echo "No PostgreSQL data at $OLD_DATA/postgres; set CREQOR_OLD_DATA_DIR." >&2; exit 2; }
    [[ -z "$(ls -A "$MNT/postgres" 2>/dev/null)" ]] || { echo "$MNT/postgres is not empty; refusing to overwrite." >&2; exit 2; }
    umount "$MNT" && { lsattr -d "$MNT" | grep -q -- '-i-' || { echo 'Boot-order guard missing: chattr +i on the mount point.' >&2; mount -o noatime "/dev/mapper/$NAME" "$MNT"; exit 2; }; } && mount -o noatime "/dev/mapper/$NAME" "$MNT"
    confirm "Stop the CREQOR stack and copy $OLD_DATA to the encrypted volume?"
    as_owner "$compose stop engine postgres"
    rsync -aHAX --numeric-ids --info=progress2 "$OLD_DATA/postgres/" "$MNT/postgres/"
    rsync -a "$OLD_DATA/imports/" "$MNT/imports/"; rsync -a "$OLD_DATA/backups/" "$MNT/backups/"
    chown -R "$OWNER:$OWNER" "$MNT/imports" "$MNT/backups"
    cp "$APP/.env.dgx" "$APP/.env.dgx.pre-luks"
    sed -i "s#^CREQOR_DATA_DIR=.*#CREQOR_DATA_DIR=$MNT#; s#^DGX_BACKUP_DIR=.*#DGX_BACKUP_DIR=$MNT/backups#" "$APP/.env.dgx"
    chown "$OWNER:$OWNER" "$APP/.env.dgx" "$APP/.env.dgx.pre-luks"; chmod 600 "$APP/.env.dgx" "$APP/.env.dgx.pre-luks"
    as_owner "$compose up -d postgres engine"
    sleep 15
    as_owner "$compose exec -T postgres psql -At -U creqor -d creqor -c 'SELECT count(*) FROM public.cq_lei_catalogue'"
    echo "Verify /engine and the counts above, then remove the unencrypted copy with:"
    echo "  sudo rm -rf '$OLD_DATA/postgres'   # only after verification"
    ;;
  verify)
    mountpoint -q "$MNT" && echo "mounted: $MNT" || echo "NOT mounted: $MNT"
    echo "CREQOR_DATA_DIR=$(env_value CREQOR_DATA_DIR)"
    as_owner "$compose ps --format '{{.Name}} {{.Status}}'"
    as_owner "$compose exec -T postgres psql -At -U creqor -d creqor -c 'SELECT count(*) FROM public.cq_lei_catalogue'" || echo 'PostgreSQL not answering'
    ;;
  unlock)
    need_root
    [[ -e "/dev/mapper/$NAME" ]] || cryptsetup open "$IMG" "$NAME"
    mountpoint -q "$MNT" || mount -o noatime "/dev/mapper/$NAME" "$MNT"
    as_owner "$compose up -d postgres engine"
    echo 'Unlocked, mounted and CREQOR started.'
    ;;
  tpm-enroll)
    need_root; [[ -e /dev/tpmrm0 ]] || { echo 'No TPM2 device.' >&2; exit 2; }
    confirm 'Enrol TPM2 auto-unlock (protects against disk removal, not against access to this running machine)?'
    systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=7 "$IMG"
    grep -q "^$NAME " /etc/crypttab || echo "$NAME $IMG none luks,tpm2-device=auto,nofail" >> /etc/crypttab
    grep -q " $MNT " /etc/fstab || echo "/dev/mapper/$NAME $MNT ext4 noatime,nofail,x-systemd.requires=systemd-cryptsetup@$NAME.service 0 2" >> /etc/fstab
    systemctl daemon-reload
    echo 'Enrolled. The volume will unlock and mount at boot; docker restarts the stack.'
    ;;
  *) echo "usage: $0 plan|create|migrate|verify|unlock|tpm-enroll" >&2; exit 2 ;;
esac
