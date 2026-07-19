import { createHmac, timingSafeEqual } from "node:crypto";
import { getMetaConfig } from "../settings/service.js";

/**
 * Verify the X-Hub-Signature-256 header Meta sends with every webhook POST.
 * Requires the exact raw request body — parsing then re-serializing would
 * change bytes and break the HMAC. See webhooks/routes.ts for how rawBody is captured.
 *
 * The signing secret is the Meta app secret, resolved from settings (DB or env).
 * If no secret is configured, verification fails closed.
 */
export async function isValidSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const { appSecret } = await getMetaConfig();
  if (!appSecret) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
