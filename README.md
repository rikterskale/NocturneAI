# NocturneAI

NocturneAI is a policy-first control plane for **authorized** security assessments. The control plane is TypeScript; target-facing integrations belong in constrained worker adapters, including Python when its ecosystem is the best fit.

## Current foundation

This initial slice establishes the non-negotiable boundary: a capability is evaluated against an active authorization record, explicit scope, and a risk ceiling before any worker dispatch can be considered.

- Canonical domain contracts live in `packages/contracts`.
- Deterministic authorization and scope decisions live in `packages/policy`.
- `apps/control-plane` provides a small JSON CLI proof of the shared contract.
- `workers/python` documents the future typed adapter boundary. It deliberately contains no target-facing implementation.

## Run locally

```powershell
npm install
npm test
npm start -- policy-check https://lab.example.test R2
npm start -- grant-check https://lab.example.test R2 engagement.execution-grant.issue <arguments-sha256>
npm start -- audit-check https://lab.example.test R2
```

The sample engagement only permits `lab.example.test` and has an R2 ceiling. A denial returns an explanation and no execution grant.

## Delivery alignment

This is the start of Phase 0 / Phase 1 from the supplied blueprints: traceable capability manifests, deterministic governance, and a walking skeleton. It does not implement scanners, exploitation, credential handling, or worker dispatch.
