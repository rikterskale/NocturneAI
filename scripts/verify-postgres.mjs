import { readFileSync } from "node:fs";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the PostgreSQL integration gate.");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  for (const version of ["001_control_plane", "002_production_control_plane"]) {
    await client.query(readFileSync(`db/migrations/${version}.sql`, "utf8"));
    await client.query("INSERT INTO schema_migration (version) VALUES ($1) ON CONFLICT DO NOTHING", [version]);
  }
  const id = "ci-recovery-exercise";
  const snapshot = { owner: "ci", scope: ["lab.example.test"] };
  await client.query("DELETE FROM audit_event WHERE engagement_id = $1", [id]);
  await client.query("DELETE FROM engagement_snapshot WHERE id = $1", [id]);
  await client.query("INSERT INTO engagement_snapshot (id, state, roe_version, payload) VALUES ($1, $2, $3, $4)", [id, "active", "v1", snapshot]);
  const backup = (await client.query("SELECT id, state, roe_version, payload FROM engagement_snapshot WHERE id = $1", [id])).rows[0];
  if (!backup) throw new Error("Backup exercise could not read the persisted engagement snapshot.");
  await client.query("DELETE FROM engagement_snapshot WHERE id = $1", [id]);
  await client.query("INSERT INTO engagement_snapshot (id, state, roe_version, payload) VALUES ($1, $2, $3, $4)", [backup.id, backup.state, backup.roe_version, backup.payload]);
  const restored = (await client.query("SELECT state, roe_version, payload FROM engagement_snapshot WHERE id = $1", [id])).rows[0];
  if (JSON.stringify(restored) !== JSON.stringify({ state: "active", roe_version: "v1", payload: snapshot })) {
    throw new Error("PostgreSQL recovery exercise did not restore the exact snapshot.");
  }
  const first = { sequence: 1, event_type: "policy_allowed", occurred_at: "2026-08-14T12:00:00.000Z", payload: { action: "created" }, previous_hash: "GENESIS", event_hash: "f".repeat(64) };
  await client.query("INSERT INTO audit_event (engagement_id, sequence, event_type, occurred_at, payload, previous_hash, event_hash) VALUES ($1, $2, $3, $4, $5, $6, $7)", [id, first.sequence, first.event_type, first.occurred_at, first.payload, first.previous_hash, first.event_hash]);
  const durableAudit = (await client.query("SELECT sequence, event_type, previous_hash, event_hash FROM audit_event WHERE engagement_id = $1", [id])).rows[0];
  if (!durableAudit || Number(durableAudit.sequence) !== 1 || durableAudit.event_type !== "policy_allowed" || durableAudit.previous_hash !== "GENESIS" || durableAudit.event_hash !== "f".repeat(64)) {
    throw new Error("PostgreSQL durable audit exercise could not restore exact evidence.");
  }
  await client.query("DELETE FROM signing_key_metadata");
  await client.query("INSERT INTO signing_key_metadata (id, status, activated_at) VALUES ($1, $2, $3)", ["ci-key-2026", "active", "2026-08-14T12:00:00.000Z"]);
  const key = (await client.query("SELECT id, status FROM signing_key_metadata WHERE id = $1", ["ci-key-2026"])).rows[0];
  if (!key || key.id !== "ci-key-2026" || key.status !== "active") throw new Error("Signing-key metadata exercise failed.");
  console.log("PostgreSQL migration and snapshot recovery exercise passed.");
} finally {
  await client.end();
}
