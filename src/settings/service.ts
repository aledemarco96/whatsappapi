import { decryptToken, encryptToken } from "../config/crypto.js";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

/**
 * Provider-level Meta app configuration. Values can come from the /admin UI
 * (stored in Postgres) or from environment variables. DB wins, env is fallback,
 * so existing env-based deploys keep working.
 *
 * The app secret is stored encrypted at rest and is never returned to clients
 * (see routes.ts, which exposes only whether it is set).
 */
export interface MetaConfig {
  appId?: string;
  appSecret?: string;
  configId?: string;
}

const KEY_APP_ID = "meta_app_id";
const KEY_APP_SECRET_ENC = "meta_app_secret_enc";
const KEY_CONFIG_ID = "meta_config_id";

/** In-memory cache of the resolved DB values, invalidated on save. */
let dbCache: Record<string, string> | null = null;

async function loadDbSettings(): Promise<Record<string, string>> {
  if (dbCache) return dbCache;
  const { rows } = await pool.query<{ key: string; value: string }>(
    "SELECT key, value FROM app_settings",
  );
  dbCache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return dbCache;
}

function invalidateCache(): void {
  dbCache = null;
}

/** Resolve the effective Meta config (DB over env), decrypting the secret. */
export async function getMetaConfig(): Promise<MetaConfig> {
  const db = await loadDbSettings();
  const encSecret = db[KEY_APP_SECRET_ENC];
  return {
    appId: db[KEY_APP_ID] ?? env.META_APP_ID,
    appSecret: encSecret ? decryptToken(encSecret) : env.META_APP_SECRET,
    configId: db[KEY_CONFIG_ID] ?? env.META_CONFIG_ID,
  };
}

/** Public-safe view for the settings UI: no secret value, only whether it is set. */
export async function getMetaConfigStatus(): Promise<{
  appId?: string;
  configId?: string;
  appSecretSet: boolean;
  source: { appId: "db" | "env" | "unset"; appSecret: "db" | "env" | "unset"; configId: "db" | "env" | "unset" };
}> {
  const db = await loadDbSettings();
  const src = (dbVal: string | undefined, envVal: string | undefined) =>
    dbVal ? ("db" as const) : envVal ? ("env" as const) : ("unset" as const);
  return {
    appId: db[KEY_APP_ID] ?? env.META_APP_ID,
    configId: db[KEY_CONFIG_ID] ?? env.META_CONFIG_ID,
    appSecretSet: Boolean(db[KEY_APP_SECRET_ENC] ?? env.META_APP_SECRET),
    source: {
      appId: src(db[KEY_APP_ID], env.META_APP_ID),
      appSecret: src(db[KEY_APP_SECRET_ENC], env.META_APP_SECRET),
      configId: src(db[KEY_CONFIG_ID], env.META_CONFIG_ID),
    },
  };
}

async function upsert(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

/**
 * Persist Meta config from the admin UI. Only provided fields are updated
 * (undefined = leave unchanged), so the secret is not wiped when the form
 * is saved without re-entering it.
 */
export async function saveMetaConfig(input: {
  appId?: string;
  appSecret?: string;
  configId?: string;
}): Promise<void> {
  if (input.appId !== undefined) await upsert(KEY_APP_ID, input.appId);
  if (input.configId !== undefined) await upsert(KEY_CONFIG_ID, input.configId);
  if (input.appSecret) await upsert(KEY_APP_SECRET_ENC, encryptToken(input.appSecret));
  invalidateCache();
}
