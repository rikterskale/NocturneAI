import assert from "node:assert/strict";
import test from "node:test";
import { AuditTrail } from "../packages/audit/src/audit-trail.js";

test("records a hash-chained, immutable audit history", () => {
  const trail = new AuditTrail();
  const first = trail.append("policy_allowed", { target: "https://lab.example.test" }, new Date("2026-08-14T12:00:00.000Z"));
  const second = trail.append("grant_issued", { capability: "engagement.execution-grant.issue" }, new Date("2026-08-14T12:00:01.000Z"));
  assert.equal(first.previousHash, "GENESIS");
  assert.equal(second.previousHash, first.hash);
  assert.deepEqual(trail.verify(), { valid: true, eventCount: 2 });
  const exported = trail.events();
  assert.notEqual(exported, trail.events());
  assert.deepEqual(trail.verify(exported), { valid: true, eventCount: 2 });
});

test("detects a reordered chain and a modified event", () => {
  const trail = new AuditTrail();
  trail.append("policy_denied", { reason: "outside scope" }, new Date("2026-08-14T12:00:00.000Z"));
  trail.append("grant_denied", { reason: "revoked" }, new Date("2026-08-14T12:00:01.000Z"));
  const events = trail.events();
  const reordered = [events[1]!, events[0]!];
  const modified = [{ ...events[0]!, payload: { reason: "altered" } }, events[1]!];
  assert.deepEqual(trail.verify(reordered), { valid: false, reason: "Audit chain order is invalid at sequence 2." });
  assert.deepEqual(trail.verify(modified), { valid: false, reason: "Audit event hash is invalid at sequence 1." });
});
