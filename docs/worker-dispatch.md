# Constrained worker dispatch

`DispatchBroker` is the only control-plane component allowed to invoke a worker adapter. It revalidates the signed grant immediately before dispatch, then requires the target, capability ID, argument hash, and adapter capability allowlist to exactly match the grant claims.

Adapters receive only these bound values and cannot make authorization, scope, risk, approval, or signing decisions. A failed signature, expired/revoked authorization, changed request, unknown key, or unsupported capability is denied before adapter invocation.

Production key material is injected from a managed secret service into `SigningKeyRing`; only non-secret key metadata belongs in PostgreSQL. Rotate by introducing exactly one new `active` key while retaining the prior key as `verify-only` until all of its grants have expired, then retire it. Never store key secrets in migrations, audit events, logs, or adapter configuration.
