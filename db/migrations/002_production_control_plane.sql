CREATE TABLE IF NOT EXISTS signing_key_metadata (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'verify-only', 'retired')),
  activated_at TIMESTAMPTZ NOT NULL,
  retired_at TIMESTAMPTZ,
  CHECK ((status = 'retired') = (retired_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS signing_key_one_active
  ON signing_key_metadata ((status)) WHERE status = 'active';
