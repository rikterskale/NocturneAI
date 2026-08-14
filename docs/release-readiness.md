# New-user release-readiness standard

NocturneAI may ship only when the `release:gate` command passes. This is a release blocker, not a target or aspiration. There are no waivers or exceptions.

## Required proof

1. **Proven installation.** CI performs a clean `npm ci` with every supported Node version, builds the project, and runs the new-user CLI smoke test.
2. **Guided troubleshooting.** Every release includes the current [troubleshooting guide](troubleshooting.md), and CI rejects a missing or empty guide.
3. **Full-feature validation.** Every capability manifest in `manifests/capabilities` must be registered in `release-readiness.json` and must have automated validation and user-facing documentation. CI rejects missing, duplicate, or unregistered evidence.
4. **Tested recovery paths.** Every declared capability has an executable recovery test. Recovery behavior must fail closed and preserve the authorization/scope boundary.
5. **Complete source coverage.** `c8` enforces 100% lines, functions, branches, and statements for all shipped TypeScript control-plane source. Uncovered code fails CI.

Adding a feature requires adding its manifest, docs, automated validation, and recovery exercise before it can merge. The standard applies to every command, argument form, option, and code path because branch coverage is 100% and the CLI contract tests enumerate all currently supported invocation shapes.

The current slice also validates a short-lived signed execution-grant flow, including tampering, expiration, authorization mismatch, and revocation revalidation.
