import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Shared Postgres connection pool. All DB access goes through this so we open
 * a single pool per process instead of a connection per query.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("[db] unexpected error on idle client:", err);
});
