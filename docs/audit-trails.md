# Audit trails

The control plane records typed audit events in a hash chain. Each event contains an ordered sequence, timestamp, payload, previous hash, and its own SHA-256 hash. `audit-check` demonstrates recording a policy outcome and immediately verifying the resulting trail:

```powershell
npm start -- audit-check https://lab.example.test R2
```

Verification fails when sequence, linkage, or content changes. This slice keeps the trail in memory for deterministic tests; a production persistence adapter must preserve append-only storage, durable ordering, tenant isolation, and independently testable backup/restore before being released.
