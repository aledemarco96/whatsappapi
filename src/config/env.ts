import "dotenv/config";
import { z } from "zod";

/**
 * Validate environment variables at startup so the process fails fast
 * with a clear message instead of throwing deep inside a request handler.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  META_APP_ID: z.string().min(1, "META_APP_ID is required"),
  META_APP_SECRET: z.string().min(1, "META_APP_SECRET is required"),
  GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/, "expected format like v21.0").default("v21.0"),
  META_CONFIG_ID: z.string().min(1, "META_CONFIG_ID is required"),

  WEBHOOK_VERIFY_TOKEN: z.string().min(1, "WEBHOOK_VERIFY_TOKEN is required"),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid postgres connection string"),
  // Set to "true" when connecting to a Postgres that requires SSL (e.g. managed providers).
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const graphBaseUrl = `https://graph.facebook.com/${env.GRAPH_API_VERSION}`;
