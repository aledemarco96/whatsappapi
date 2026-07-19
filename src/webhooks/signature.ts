import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Verify the X-Hub-Signature-256 header Meta sends with every webhook POST.
 * Requires the exact raw request body — parsing then re-serializing would
 * change bytes and break the HMAC. See webhooks/routes.ts for how rawBody is captured.
 */
export function isValidSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
