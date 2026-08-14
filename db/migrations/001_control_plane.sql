CREATE TABLE IF NOT EXISTS schema_migration (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS engagement_snapshot (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  roe_version TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_snapshot (
  id TEXT PRIMARY KEY,
  engagement_id TEXT NOT NULL REFERENCES engagement_snapshot(id) ON DELETE RESTRICT,
  capability_id TEXT NOT NULL,
  target TEXT NOT NULL,
  arguments_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_event (
  engagement_id TEXT NOT NULL REFERENCES engagement_snapshot(id) ON DELETE RESTRICT,
  sequence BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  PRIMARY KEY (engagement_id, sequence),
  UNIQUE (engagement_id, event_hash)
);
