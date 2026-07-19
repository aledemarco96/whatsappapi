import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env.js";

/**
 * Client access tokens are sensitive: they let us message on behalf of the client.
 * We encrypt them at rest with AES-256-GCM. The stored format is:
 *   base64(iv).base64(authTag).base64(ciphertext)
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted token");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
