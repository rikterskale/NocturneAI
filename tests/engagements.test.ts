import assert from "node:assert/strict";
import test from "node:test";
import { EngagementLifecycle } from "../packages/engagements/src/lifecycle.js";
import { engagementStates } from "../packages/contracts/src/domain.js";

const roe = { version: "v1", scope: { allowHosts: ["lab.example.test"], denyHosts: [], riskCeiling: "R3" as const }, effectiveFrom: "2026-01-01T00:00:00.000Z", effectiveUntil: "2026-12-31T23:59:59.999Z" };

test("creates, activates, stops, and audits an engagement", () => {
  const lifecycle = new EngagementLifecycle();
  assert.deepEqual(engagementStates, ["draft", "active", "stopped"]);
  assert.equal(lifecycle.create("eng-1", "Lab", roe).state, "draft");
  assert.equal(lifecycle.activate("eng-1").state, "active");
  assert.equal(lifecycle.stop("eng-1").state, "stopped");
  assert.equal(lifecycle.list().length, 1);
  assert.equal(lifecycle.audit.verify().valid, true);
});

test("fails closed for invalid lifecycle transitions and approvals", () => {
  const lifecycle = new EngagementLifecycle();
  assert.throws(() => lifecycle.create("", "", roe));
  lifecycle.create("eng-1", "Lab", roe);
  assert.throws(() => lifecycle.create("eng-1", "Again", roe));
  assert.throws(() => lifecycle.stop("eng-1"));
  assert.throws(() => lifecycle.activate("missing"));
  assert.throws(() => lifecycle.approve({ engagementId: "eng-1", capabilityId: "x", target: "https://lab.example.test", argumentsHash: "a", expiresAt: "2027-01-01T00:00:00.000Z" }));
  lifecycle.activate("eng-1");
  assert.throws(() => lifecycle.approve({ engagementId: "eng-1", capabilityId: "x", target: "https://lab.example.test", argumentsHash: "a", expiresAt: "2020-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z")));
  const approval = lifecycle.approve({ engagementId: "eng-1", capabilityId: "x", target: "https://lab.example.test", argumentsHash: "a", expiresAt: "2027-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:00.000Z"));
  assert.ok(lifecycle.revokeApproval(approval.id).revokedAt);
  assert.throws(() => lifecycle.revokeApproval(approval.id));
});
