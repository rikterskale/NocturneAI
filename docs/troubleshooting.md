# Troubleshooting

## Installation fails

Use Node.js 22 or 24, remove only the local `node_modules` directory if it is corrupted, then run `npm ci`. Do not edit `package-lock.json` by hand.

## The release gate fails

Run `npm run release:gate` locally. Coverage failures identify the exact uncovered source; add a behavior-level test rather than lowering the threshold. Readiness failures name the missing manifest, test, documentation, or recovery exercise.

## The CLI exits with code 1

The requested target is outside the sample engagement scope, is explicitly excluded, the authorization is invalid, or the requested risk exceeds the R2 ceiling. Inspect the returned JSON `reason`; do not retry by weakening policy.

## The CLI exits with code 2

Use `npm start -- policy-check <https-url> <R0-R5>`. The command is intentionally fail-closed for unknown commands and incomplete arguments.

