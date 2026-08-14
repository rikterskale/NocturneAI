# Python worker adapters

Python is reserved for isolated adapters where it has a stronger security-analysis ecosystem. Every adapter will consume a signed, expiring control-plane grant and emit typed evidence; it must never decide authorization, scope, approval, or risk itself.

No target-facing code belongs here until the execution broker, worker manifests, and safe-lab fixtures are implemented.

