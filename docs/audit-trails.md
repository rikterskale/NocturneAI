# Audit trails

The control plane records typed audit events in a hash chain. Each event contains an ordered sequence, timestamp, payload, previous hash, and its own SHA-256 hash. `audit-check` demonstrates recording a policy outcome and immediately verifying the resulting trail:

```powershell
npm start -- audit-check https://lab.example.test R2
```

Verification fails when sequence, linkage, or content changes. `PostgresAuditStore` persists the same hash chain in the `audit_event` table and locks the engagement chain during append so ordering is durable. Production callers must use a transaction-capable PostgreSQL client and keep tenant isolation at their service boundary.
