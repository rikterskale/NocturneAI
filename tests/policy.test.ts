import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "../packages/policy/src/evaluate.js";
import { sampleAuthorization, sampleScope } from "../apps/control-plane/src/sample-engagement.js";
import { riskClasses } from "../packages/contracts/src/domain.js";

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

test("accepts an allowed subdomain and strips URL fragments", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://api.lab.example.test/path#fragment", requestedRisk: "R0", now });
  assert.deepEqual(decision, {
    allowed: true,
    normalizedTarget: "https://api.lab.example.test/path",
    reason: "Authorization, scope, and risk ceiling permit policy evaluation."
  });
});

test("denies an explicitly excluded host", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://admin.lab.example.test", requestedRisk: "R0", now });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "Target is explicitly denied by scope.");
});

test("denies a malformed or non-HTTP target", () => {
  for (const target of ["not-a-url", "ftp://lab.example.test"]) {
    const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target, requestedRisk: "R0", now });
    assert.deepEqual(decision, { allowed: false, reason: "Target must be an absolute HTTP(S) URL." });
  }
});

test("denies an unknown risk class at runtime", () => {
  const decision = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test", requestedRisk: "R99" as never, now });
  assert.deepEqual(decision, { allowed: false, normalizedTarget: "https://lab.example.test/", reason: "Requested risk class is invalid." });
});

test("denies authorizations outside their validity interval", () => {
  const future = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test", requestedRisk: "R0", now: new Date("2025-12-31T23:59:59.999Z") });
  const expired = evaluatePolicy({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test", requestedRisk: "R0", now: new Date("2027-01-01T00:00:00.000Z") });
  assert.equal(future.reason, "Authorization is not currently valid.");
  assert.equal(expired.reason, "Authorization is not currently valid.");
});

test("publishes the complete ordered risk-class contract", () => {
  assert.deepEqual(riskClasses, ["R0", "R1", "R2", "R3", "R4", "R5"]);
});

test("uses the current clock when a caller does not supply one", () => {
  const authorization = { ...sampleAuthorization, validFrom: "2000-01-01T00:00:00.000Z", validUntil: "2999-01-01T00:00:00.000Z" };
  const decision = evaluatePolicy({ authorization, scope: sampleScope, target: "https://lab.example.test", requestedRisk: "R0" });
  assert.equal(decision.allowed, true);
});
