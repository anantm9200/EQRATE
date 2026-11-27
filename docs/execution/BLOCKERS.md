# Blockers

| ID | Blocker | Evidence | Impact | Unblock path |
|---|---|---|---|---|
| B1 | DGX cannot reach GLEIF/npm/Docker Hub | FortiGuard SDNS answers 208.91.112.55 (docs/NETWORK_ALLOWLIST.md) | unattended DGX-side refresh impossible | network admin allow-list; interim: Mac launchd relay (D5) |
| B2 | Exchange XBRL and MCA filings not used | exchange terms restrict automation; MCA per-document fees | slower financial coverage | user legal sign-off or licensed vendor |
| B3 | SEC financials disabled by policy | DECISIONS 2026-11-19, 2026-11-27 | no US financial coverage | user reversal + contact email |
| B4 | Single DGX = no high availability | one host, manual LUKS unlock after reboot | outage until operator unlocks | second site / PITR to off-site object store (cost decision) |
| B5 | Plaintext pre-encryption DB copy still on root disk | `~/creqor-platform/data/postgres` exists | data at rest partly unencrypted | operator: `sudo rm -rf …/data/postgres && sudo fstrim -v /` (destructive; user-run) |
| B6 | Operator Mac network also filters Indian company and exchange sites | 2026-11-27: TLS from the Mac to tcs.com, ril.com, hdfcbank.com, icicibank.com, sbi.co.in, airtel.in, larsentoubro.com, wipro.com, hul.co.in, tatamotors.com, tatasteel.com, mahindra.com, infosys.com, nseindia.com, bseindia.com is answered by the "Fortiguard SDNS Blocked Page" certificate | annual-report acquisition (F3, F6) cannot run from this network; not bypassed | allow-list the IR domains, or the operator supplies PDFs fetched on a permitted network into the relay drop folder (`--file` ingestion records the original URL) |
