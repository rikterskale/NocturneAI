# Recovery paths

The current control plane has a PostgreSQL schema foundation and no worker dispatcher. Its mandatory recovery behavior is therefore fail-closed: a revoked, expired, malformed, excluded, out-of-scope, or excessive-risk request is denied after a fresh process start.

This behavior is exercised by `tests/recovery.test.ts` as part of the release gate. CI also applies the PostgreSQL migrations, snapshots an engagement row, deletes it, restores it, and verifies the exact restored state plus durable-audit and signing-key metadata exercises through `npm run test:database`. A retired signing key or a changed dispatch request is denied before any adapter is invoked.
