# Network allow-list request: CREQOR DGX host

**For:** network / firewall administrator
**Host:** the CREQOR DGX Spark (Ubuntu 24.04, arm64)
**Current behaviour:** the site's FortiGuard DNS filter answers the domains below with the "Fortiguard SDNS Blocked Page" address (208.91.112.55), so the host cannot reach them.

CREQOR imports **official public records** on a schedule. Today an operator workstation relays these files manually. Allow-listing the domains below lets the host refresh them unattended.

## Outbound HTTPS (TCP 443) only, no inbound changes

| Purpose | Domains | Volume |
| --- | --- | --- |
| GLEIF Golden Copy (legal entities, relationships) | `goldencopy.gleif.org`, `leidata-preview.gleif.org`, `api.gleif.org` | ~600 MB/day full files, or a few MB of deltas every 8 h |
| Container image updates | `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com` | occasional, < 1 GB |
| Node.js packages for builds | `registry.npmjs.org` | occasional, < 200 MB |
| Ubuntu security updates (optional) | `ports.ubuntu.com` | standard |

Not requested: SEC domains (SEC collection is disabled by policy), or any inbound port. Public access to CREQOR goes through the existing authenticated HTTPS gateway only.

## Verify after the change

```bash
getent ahostsv4 goldencopy.gleif.org   # must NOT return 208.91.112.55
curl -fsS -o /dev/null https://goldencopy.gleif.org/api/v2/golden-copies/publishes/lei2/latest && echo ok
```
