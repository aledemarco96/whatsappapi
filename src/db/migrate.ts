import { pool } from "./pool.js";

/**
 * Idempotent schema setup. Runs on startup so a fresh Easypanel Postgres is
 * provisioned automatically without a separate migration step. For a larger
 * schema, switch to a versioned migration tool (e.g. node-pg-migrate).
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  waba_id                TEXT PRIMARY KEY,
  phone_number_id        TEXT NOT NULL,
  display_phone_number   TEXT,
  encrypted_access_token TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_phone_number_id_idx
  ON tenants (phone_number_id);
`;

export async function migrate(): Promise<void> {
  await pool.query(SCHEMA);
  console.log("[db] schema ready");
}
