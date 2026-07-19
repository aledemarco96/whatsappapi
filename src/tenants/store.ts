import { pool } from "../db/pool.js";
import type { Tenant } from "../types/whatsapp.js";

/**
 * Persistence contract for onboarded clients. The rest of the app depends only
 * on this interface, so the Postgres implementation can be swapped or mocked
 * without touching messaging or webhook code.
 */
export interface TenantStore {
  upsert(tenant: Tenant): Promise<void>;
  getByWabaId(wabaId: string): Promise<Tenant | undefined>;
  getByPhoneNumberId(phoneNumberId: string): Promise<Tenant | undefined>;
  list(): Promise<Tenant[]>;
}

interface TenantRow {
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  encrypted_access_token: string;
  created_at: Date;
  updated_at: Date;
}

function rowToTenant(row: TenantRow): Tenant {
  return {
    wabaId: row.waba_id,
    phoneNumberId: row.phone_number_id,
    displayPhoneNumber: row.display_phone_number ?? undefined,
    encryptedAccessToken: row.encrypted_access_token,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

const SELECT = `
  SELECT waba_id, phone_number_id, display_phone_number,
         encrypted_access_token, created_at, updated_at
  FROM tenants
`;

/** Postgres-backed tenant store. */
export class PgTenantStore implements TenantStore {
  async upsert(tenant: Tenant): Promise<void> {
    await pool.query(
      `INSERT INTO tenants
         (waba_id, phone_number_id, display_phone_number, encrypted_access_token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (waba_id) DO UPDATE SET
         phone_number_id        = EXCLUDED.phone_number_id,
         display_phone_number   = EXCLUDED.display_phone_number,
         encrypted_access_token = EXCLUDED.encrypted_access_token,
         updated_at             = now()`,
      [tenant.wabaId, tenant.phoneNumberId, tenant.displayPhoneNumber ?? null, tenant.encryptedAccessToken],
    );
  }

  async getByWabaId(wabaId: string): Promise<Tenant | undefined> {
    const { rows } = await pool.query<TenantRow>(`${SELECT} WHERE waba_id = $1`, [wabaId]);
    return rows[0] ? rowToTenant(rows[0]) : undefined;
  }

  async getByPhoneNumberId(phoneNumberId: string): Promise<Tenant | undefined> {
    const { rows } = await pool.query<TenantRow>(`${SELECT} WHERE phone_number_id = $1`, [phoneNumberId]);
    return rows[0] ? rowToTenant(rows[0]) : undefined;
  }

  async list(): Promise<Tenant[]> {
    const { rows } = await pool.query<TenantRow>(`${SELECT} ORDER BY created_at DESC`);
    return rows.map(rowToTenant);
  }
}

/** Default store instance used across the app. */
export const tenantStore: TenantStore = new PgTenantStore();
