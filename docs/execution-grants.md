# Execution grants

An execution grant is an HMAC-signed, short-lived record binding an active authorization to a normalized target, capability ID, arguments hash, risk class, and signing-key ID. It is issued only after deterministic policy evaluation and is revalidated immediately before a worker-dispatch boundary.

Use the demonstration CLI:

```powershell
npm start -- grant-check https://lab.example.test R2 engagement.execution-grant.issue <arguments-sha256>
```

The returned token is demonstration-only and uses a local development key. Production deployment injects a versioned key ring from a managed secret service; keys can be rotated with a temporary `verify-only` period. The `DispatchBroker` performs fresh revalidation before it calls a constrained adapter; see [worker dispatch](worker-dispatch.md).
