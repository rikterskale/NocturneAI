import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAuditStore, type SqlClient } from "../packages/audit/src/postgres-audit-store.js";
import { SigningKeyRing } from "../packages/grants/src/signing-keys.js";

class FakeSqlClient implements SqlClient {
  readonly calls: string[] = [];
  readonly rows: Record<string, unknown>[];
  constructor(rows: Record<string, unknown>[] = []) { this.rows = rows; }
  async query(sql: string, values?: readonly unknown[]): Promise<{ readonly rows: readonly Record<string, unknown>[] }> {
    this.calls.push(sql);
    if (sql.startsWith("INSERT INTO audit_event")) this.rows.push({ sequence: values![1], event_type: values![2], occurred_at: values![3], payload: values![4], previous_hash: values![5], event_hash: values![6] });
    return { rows: sql.startsWith("SELECT") ? this.rows : [] };
  }
}

test("PostgreSQL audit store locks, appends, and verifies a durable audit chain", async () => {
  const client = new FakeSqlClient();
  const store = new PostgresAuditStore(client);
  const event = await store.append("eng-1", "dispatch_started", { target: "https://lab.example.test" }, new Date("2026-08-14T12:00:00.000Z"));
  assert.equal(event.sequence, 1);
  assert.match(client.calls[1]!, /FOR UPDATE/);
  assert.deepEqual(await store.verify("eng-1"), { valid: true, eventCount: 1 });
});

test("PostgreSQL audit store rolls back when persisted evidence is corrupted", async () => {
  const client = new FakeSqlClient([{ sequence: 2, event_type: "policy_allowed", occurred_at: "2026-08-14T12:00:00.000Z", payload: {}, previous_hash: "GENESIS", event_hash: "bad" }]);
  await assert.rejects(new PostgresAuditStore(client).append("eng-1", "dispatch_started", {}), /Persisted audit chain is invalid/);
  assert.equal(client.calls.at(-1), "ROLLBACK");
});

test("key rings require one active key and retain verify-only keys during rotation", () => {
  assert.throws(() => new SigningKeyRing([]), /exactly one active/);
  assert.throws(() => new SigningKeyRing([{ id: "same", secret: "one", status: "active" }, { id: "same", secret: "two", status: "verify-only" }]), /unique/);
  const ring = new SigningKeyRing([{ id: "old", secret: "old", status: "verify-only" }, { id: "new", secret: "new", status: "active" }, { id: "retired", secret: "gone", status: "retired" }]);
  assert.equal(ring.active().id, "new");
  assert.equal(ring.forVerification("old")?.secret, "old");
  assert.equal(ring.forVerification("retired"), undefined);
  assert.equal(ring.forVerification("unknown"), undefined);
});
