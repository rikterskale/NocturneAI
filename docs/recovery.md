# Recovery paths

The current control plane has a PostgreSQL schema foundation and no worker dispatcher. Its mandatory recovery behavior is therefore fail-closed: a revoked, expired, malformed, excluded, out-of-scope, or excessive-risk request is denied after a fresh process start.

This behavior is exercised by `tests/recovery.test.ts` as part of the release gate. CI also applies the PostgreSQL migration, snapshots an engagement row, deletes it, restores it, and verifies the exact restored state through `npm run test:database`. Future persistent services must add backup/restore and restart recovery exercises here and register them for every capability in `release-readiness.json` before release.
