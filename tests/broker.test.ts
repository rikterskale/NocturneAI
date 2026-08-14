import assert from "node:assert/strict";
import test from "node:test";
import { DispatchBroker } from "../packages/broker/src/dispatch-broker.js";
import { issueExecutionGrant } from "../packages/grants/src/execution-grant.js";
import { SigningKeyRing } from "../packages/grants/src/signing-keys.js";
import { sampleAuthorization, sampleScope } from "../apps/control-plane/src/sample-engagement.js";

const now = new Date("2026-08-14T12:00:00.000Z");
const keyRing = new SigningKeyRing([{ id: "key-2026", secret: "managed-secret", status: "active" }]);
const issue = () => issueExecutionGrant({ authorization: sampleAuthorization, scope: sampleScope, target: "https://lab.example.test/app", capabilityId: "worker.dispatch.revalidate", argumentsHash: "b".repeat(64), riskClass: "R1", signingKey: "", keyRing, ttlMs: 60_000, now });

test("broker revalidates a key-ring grant immediately before constrained adapter dispatch", async () => {
  const issued = issue();
  assert.equal(issued.allowed, true);
  if (!issued.allowed) return;
  const calls: unknown[] = [];
  const adapter = { profile: "test", capabilityIds: ["worker.dispatch.revalidate"], dispatch: async (input: unknown) => { calls.push(input); } };
  const result = await new DispatchBroker(keyRing).dispatch({ token: issued.token, authorization: sampleAuthorization, scope: sampleScope, target: issued.claims.target, capabilityId: issued.claims.capabilityId, argumentsHash: issued.claims.argumentsHash, adapter, now: new Date("2026-08-14T12:00:01.000Z") });
  assert.equal(result.allowed, true);
  assert.equal(result.dispatched, true);
  assert.equal(result.auditEvent, "dispatch_completed");
  assert.equal(calls.length, 1);
});

test("broker denies changed requests, unsupported adapters, revoked authorizations, and retired keys before adapter invocation", async () => {
  const issued = issue();
  assert.equal(issued.allowed, true);
  if (!issued.allowed) return;
  let calls = 0;
  const adapter = { profile: "test", capabilityIds: [] as string[], dispatch: async () => { calls += 1; } };
  const broker = new DispatchBroker(keyRing);
  const base = { token: issued.token, authorization: sampleAuthorization, scope: sampleScope, target: issued.claims.target, capabilityId: issued.claims.capabilityId, argumentsHash: issued.claims.argumentsHash, adapter, now };
  const changed = await broker.dispatch({ ...base, argumentsHash: "c".repeat(64) });
  const unsupported = await broker.dispatch(base);
  const revoked = await broker.dispatch({ ...base, authorization: { ...sampleAuthorization, revokedAt: "2026-08-14T11:59:00.000Z" } });
  const { now: ignoredClock, ...withoutClock } = base;
  assert.ok(ignoredClock);
  const currentClock = await broker.dispatch(withoutClock);
  const retired = await new DispatchBroker(new SigningKeyRing([{ id: "key-2026", secret: "managed-secret", status: "retired" }, { id: "next", secret: "next-secret", status: "active" }])).dispatch(base);
  for (const decision of [changed, unsupported, revoked, currentClock, retired]) assert.equal(decision.allowed, false);
  assert.equal(calls, 0);
});
