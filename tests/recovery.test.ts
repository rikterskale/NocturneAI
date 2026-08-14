import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "../packages/policy/src/evaluate.js";
import { issueExecutionGrant, verifyExecutionGrant } from "../packages/grants/src/execution-grant.js";
import { sampleAuthorization, sampleGrantSigningKey, sampleScope } from "../apps/control-plane/src/sample-engagement.js";

test("recovery path: a revoked authorization remains fail-closed after restart", () => {
  const revokedAuthorization = { ...sampleAuthorization, revokedAt: "2026-08-14T11:59:00.000Z" };
  const decision = evaluatePolicy({
    authorization: revokedAuthorization,
    scope: sampleScope,
    target: "https://lab.example.test",
    requestedRisk: "R0",
    now: new Date("2026-08-14T12:00:00.000Z")
  });
  assert.deepEqual(decision, {
    allowed: false,
    normalizedTarget: "https://lab.example.test/",
    reason: "Authorization is revoked."
  });
});

test("recovery path: an issued grant is rejected after authorization revocation", () => {
  const now = new Date("2026-08-14T12:00:00.000Z");
  const issued = issueExecutionGrant({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test", capabilityId: "engagement.execution-grant.issue", argumentsHash: "a".repeat(64), riskClass: "R0", signingKey: sampleGrantSigningKey, ttlMs: 60_000, now });
  assert.equal(issued.allowed, true);
  if (issued.allowed) {
    const result = verifyExecutionGrant({ token: issued.token, authorization: { ...sampleAuthorization, revokedAt: "2026-08-14T12:00:01.000Z" }, scope: sampleScope, signingKey: sampleGrantSigningKey, now });
    assert.equal(result.allowed, false);
  }
});
