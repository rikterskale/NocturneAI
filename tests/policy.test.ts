import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "../packages/policy/src/evaluate.js";
import { sampleAuthorization, sampleScope } from "../apps/control-plane/src/sample-engagement.js";

const now = new Date("2026-08-14T12:00:00.000Z");

test("permits an in-scope target within the risk ceiling", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test/app", requestedRisk: "R2", now });
  assert.equal(decision.allowed, true);
});

test("denies an out-of-scope target before any worker is considered", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://outside.example.test", requestedRisk: "R0", now });
  assert.deepEqual(decision, { allowed: false, normalizedTarget: "https://outside.example.test/", reason: "Target is outside the approved scope." });
});

test("denies a risk level above the ceiling", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test", requestedRisk: "R3", now });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /exceeds scope ceiling/);
});
