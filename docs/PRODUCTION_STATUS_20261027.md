# TLU production status — 2026-10-27

**Decision: NO-GO.** Publishing source to GitHub is not a production deployment or approval.

- The staging frontend served `X-TLU-Release: 2293ec9` while this branch was at `a324bb5` before the pending source commit. The exact candidate has not been deployed and verified on staging.
- A single public staging search request (`water`, English) returned HTTP 200 in 2.73 s, above the agreed 2 s search budget. This is a smoke sample, not a p95 measurement.
- The latest public production post was dated 2026-10-27 (ID 57819). The latest CMS post was dated 2026-10-25, and a CMS lookup by the production post's slug returned no result. Content parity is not established.
- The local WPX FULLTEXT cap candidate has only passed PHP lint and arithmetic fixtures. It can alter ranking above the cap and has not passed live MariaDB or VI/EN result checks; see `release/wpx-fulltext/STATUS.md`.
- A current, checksum-verified CMS/production data backup, isolated restore rehearsal, content synchronization, production routing checks, and rollback rehearsal have not been demonstrated.

Before a cutover, deploy the exact reviewed source to staging, repeat functional and cold/warm performance checks, reconcile content and media, verify restorable backups, and rehearse the production rollback. Keep the existing public WordPress site unchanged until those gates pass.
