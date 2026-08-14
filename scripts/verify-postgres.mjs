import { readFileSync } from "node:fs";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for the PostgreSQL integration gate.");

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(readFileSync("db/migrations/001_control_plane.sql", "utf8"));
  await client.query("INSERT INTO schema_migration (version) VALUES ($1) ON CONFLICT DO NOTHING", ["001_control_plane"]);
  const id = "ci-recovery-exercise";
  const snapshot = { owner: "ci", scope: ["lab.example.test"] };
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
  console.log("PostgreSQL migration and snapshot recovery exercise passed.");
} finally {
  await client.end();
}

