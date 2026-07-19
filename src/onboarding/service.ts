import { encryptToken } from "../config/crypto.js";
import { env } from "../config/env.js";
import { graphRequest } from "../graph/client.js";
import { tenantStore } from "../tenants/store.js";
import type { TokenExchangeResult } from "../types/whatsapp.js";

/**
 * Embedded Signup onboarding flow. The browser SDK returns two things to your
 * frontend: an OAuth `code` and, via the message event, the `wabaId` and
 * `phoneNumberId` the client selected. The frontend forwards all three here.
 *
 * Steps:
 *  1. Exchange the code for a business access token.
 *  2. Subscribe our app to the client's WABA so we receive their webhooks.
 *  3. Register the phone number for Cloud API messaging.
 *  4. Persist the tenant (token encrypted at rest).
 */

interface OnboardInput {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  const res = await graphRequest<TokenResponse>("oauth/access_token", {
    method: "GET",
    // App-level call: authenticated via query params, not a bearer token.
    accessToken: `${env.META_APP_ID}|${env.META_APP_SECRET}`,
    query: {
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      code,
    },
  });
  return {
    accessToken: res.access_token,
    tokenType: res.token_type,
    expiresInSeconds: res.expires_in,
  };
}

/** Subscribe our app to the client's WABA to start receiving their webhooks. */
async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  await graphRequest(`${wabaId}/subscribed_apps`, { method: "POST", accessToken });
}

/**
 * Register the phone number so it can send via Cloud API. `pin` is only needed
 * when two-step verification is enabled on the number; for numbers newly created
 * through Embedded Signup, registration is typically automatic and this is a no-op
 * that surfaces a clear error otherwise.
 */
async function registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<void> {
  await graphRequest(`${phoneNumberId}/register`, {
    method: "POST",
    accessToken,
    body: { messaging_product: "whatsapp", pin: "000000" },
  });
}

interface PhoneNumberInfo {
  display_phone_number?: string;
}

async function fetchDisplayNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<string | undefined> {
  const info = await graphRequest<PhoneNumberInfo>(phoneNumberId, {
    accessToken,
    query: { fields: "display_phone_number" },
  });
  return info.display_phone_number;
}

export async function onboardClient(input: OnboardInput): Promise<{ wabaId: string }> {
  const { accessToken } = await exchangeCodeForToken(input.code);

  await subscribeAppToWaba(input.wabaId, accessToken);

  // Registration can fail if the number is already registered; treat that as OK.
  try {
    await registerPhoneNumber(input.phoneNumberId, accessToken);
  } catch (err) {
    // Re-throw only if it is not the "already registered" case.
    if (!(err instanceof Error) || !/already/i.test(err.message)) throw err;
  }

  const displayPhoneNumber = await fetchDisplayNumber(input.phoneNumberId, accessToken).catch(
    () => undefined,
  );

  const now = new Date().toISOString();
  await tenantStore.upsert({
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    displayPhoneNumber,
    encryptedAccessToken: encryptToken(accessToken),
    createdAt: now,
    updatedAt: now,
  });

  return { wabaId: input.wabaId };
}
