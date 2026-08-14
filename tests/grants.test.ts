import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { issueExecutionGrant, verifyExecutionGrant } from "../packages/grants/src/execution-grant.js";
import { sampleAuthorization, sampleGrantSigningKey, sampleScope } from "../apps/control-plane/src/sample-engagement.js";

const now = new Date("2026-08-14T12:00:00.000Z");
const permittedInput = {
  authorization: sampleAuthorization,
  scope: sampleScope,
  target: "https://lab.example.test/app",
  capabilityId: "engagement.execution-grant.issue",
  argumentsHash: "a".repeat(64),
  riskClass: "R2" as const,
  signingKey: sampleGrantSigningKey,
  ttlMs: 60_000,
  now
};

test("issues a signed, target-bound execution grant after policy approval", () => {
  const decision = issueExecutionGrant(permittedInput);
  assert.equal(decision.allowed, true);
  if (decision.allowed) {
    assert.equal(decision.claims.target, "https://lab.example.test/app");
    assert.equal(decision.claims.expiresAt, "2026-08-14T12:01:00.000Z");
    assert.match(decision.token, /\./);
  }
});

test("refuses grants that policy denies or that have a non-positive lifetime", () => {
  const outsideScope = issueExecutionGrant({ ...permittedInput, target: "https://outside.example.test" });
  const invalidLifetime = issueExecutionGrant({ ...permittedInput, ttlMs: 0 });
  assert.deepEqual(outsideScope, { allowed: false, reason: "Target is outside the approved scope." });
  assert.deepEqual(invalidLifetime, { allowed: false, reason: "Grant lifetime must be positive." });
});

test("revalidates a valid, unexpired grant before execution", () => {
  const issued = issueExecutionGrant(permittedInput);
  assert.equal(issued.allowed, true);
  if (issued.allowed) {
    const verified = verifyExecutionGrant({ token: issued.token, authorization: sampleAuthorization, scope: sampleScope, signingKey: sampleGrantSigningKey, now: new Date("2026-08-14T12:00:30.000Z") });
    assert.equal(verified.allowed, true);
  }
});

test("uses the current clock when grant issuance and verification omit one", () => {
  const authorization = { ...sampleAuthorization, validFrom: "2000-01-01T00:00:00.000Z", validUntil: "2999-01-01T00:00:00.000Z" };
  const { now: ignoredClock, ...inputWithoutClock } = permittedInput;
  assert.ok(ignoredClock);
  const issued = issueExecutionGrant({ ...inputWithoutClock, authorization, ttlMs: 60_000 });
  assert.equal(issued.allowed, true);
  if (issued.allowed) {
    const verified = verifyExecutionGrant({ token: issued.token, authorization, scope: sampleScope, signingKey: sampleGrantSigningKey });
    assert.equal(verified.allowed, true);
  }
});

test("fails closed for tampered, malformed, expired, mismatched, and revalidation-denied grants", () => {
  const issued = issueExecutionGrant(permittedInput);
  assert.equal(issued.allowed, true);
  if (!issued.allowed) return;
  const malformedPayload = signedToken("not-json");
  const missingClaim = signedToken(JSON.stringify({ version: 1 }));
  const cases = [
    ["tampered", `${issued.token}x`, sampleAuthorization, sampleScope, now, "Execution grant signature is invalid."],
    ["extra-part", `${issued.token}.extra`, sampleAuthorization, sampleScope, now, "Execution grant signature is invalid."],
    ["malformed-payload", malformedPayload, sampleAuthorization, sampleScope, now, "Execution grant payload is invalid."],
    ["missing-claim", missingClaim, sampleAuthorization, sampleScope, now, "Execution grant payload is invalid."],
    ["expired", issued.token, sampleAuthorization, sampleScope, new Date("2026-08-14T12:02:00.000Z"), "Execution grant has expired."],
    ["authorization-mismatch", issued.token, { ...sampleAuthorization, id: "other" }, sampleScope, now, "Execution grant authorization does not match the active authorization."],
    ["revoked", issued.token, { ...sampleAuthorization, revokedAt: "2026-08-14T12:00:01.000Z" }, sampleScope, now, "Execution grant revalidation failed: Authorization is revoked."]
  ] as const;
  for (const [, token, authorization, scope, verificationTime, reason] of cases) {
    const decision = verifyExecutionGrant({ token, authorization, scope, signingKey: sampleGrantSigningKey, now: verificationTime });
    assert.deepEqual(decision, { allowed: false, reason });
  }
});

function signedToken(payload: string): string {
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", sampleGrantSigningKey).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}
