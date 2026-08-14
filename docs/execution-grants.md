# Execution grants

An execution grant is an HMAC-signed, short-lived record binding an active authorization to a normalized target, capability ID, arguments hash, and risk class. It is issued only after deterministic policy evaluation and is revalidated immediately before a future worker-dispatch boundary.

Use the demonstration CLI:

```powershell
npm start -- grant-check https://lab.example.test R2 engagement.execution-grant.issue <arguments-sha256>
```

The returned token is demonstration-only and uses a local development key. It cannot authorize a worker: there is no dispatch broker in this slice. A production implementation must use a managed signing key, key rotation, durable audit records, and an explicit broker-side revalidation call.
