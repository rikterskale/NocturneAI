import { evaluatePolicy } from "../../../packages/policy/src/evaluate.js";
import { sampleAuthorization, sampleScope } from "./sample-engagement.js";
import type { RiskClass } from "../../../packages/contracts/src/domain.js";

const [command, target, risk] = process.argv.slice(2);
if (command !== "policy-check" || !target || !risk) {
  console.error("Usage: nocturneai policy-check <https-url> <R0-R5>");
  process.exitCode = 2;
} else {
  const decision = evaluatePolicy({
    authorization: sampleAuthorization,
    scope: sampleScope,
    target,
    requestedRisk: risk as RiskClass
  });
  console.log(JSON.stringify(decision, null, 2));
  if (!decision.allowed) process.exitCode = 1;
}

