import { evaluatePolicy } from "../../../packages/policy/src/evaluate.js";
import { issueExecutionGrant } from "../../../packages/grants/src/execution-grant.js";
import { sampleAuthorization, sampleGrantSigningKey, sampleScope } from "./sample-engagement.js";
import type { RiskClass } from "../../../packages/contracts/src/domain.js";

const [command, target, risk, capabilityId, argumentsHash] = process.argv.slice(2);
if (command === "policy-check" && target && risk) {
  const decision = evaluatePolicy({
    authorization: sampleAuthorization,
    scope: sampleScope,
    target,
    requestedRisk: risk as RiskClass
  });
  console.log(JSON.stringify(decision, null, 2));
  if (!decision.allowed) process.exitCode = 1;
} else if (command === "grant-check" && target && risk && capabilityId && argumentsHash) {
  const decision = issueExecutionGrant({
    authorization: sampleAuthorization,
    scope: sampleScope,
    target,
    capabilityId,
    argumentsHash,
    riskClass: risk as RiskClass,
    signingKey: sampleGrantSigningKey,
    ttlMs: 60_000
  });
  console.log(JSON.stringify(decision, null, 2));
  if (!decision.allowed) process.exitCode = 1;
} else {
  console.error("Usage: nocturneai policy-check <https-url> <R0-R5> | grant-check <https-url> <R0-R5> <capability-id> <arguments-sha256>");
  process.exitCode = 2;
}
