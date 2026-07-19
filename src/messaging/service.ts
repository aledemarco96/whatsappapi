import { decryptToken } from "../config/crypto.js";
import { graphRequest } from "../graph/client.js";
import { tenantStore } from "../tenants/store.js";
import type {
  SendMessageResponse,
  SendTemplateInput,
  SendTextInput,
  Tenant,
} from "../types/whatsapp.js";

/** Thrown when we try to message on behalf of a client we have not onboarded. */
export class UnknownTenantError extends Error {
  constructor(wabaId: string) {
    super(`No onboarded tenant found for WABA ${wabaId}`);
    this.name = "UnknownTenantError";
  }
}

async function resolveTenant(wabaId: string): Promise<{ tenant: Tenant; accessToken: string }> {
  const tenant = await tenantStore.getByWabaId(wabaId);
  if (!tenant) throw new UnknownTenantError(wabaId);
  return { tenant, accessToken: decryptToken(tenant.encryptedAccessToken) };
}

async function postMessage(
  wabaId: string,
  payload: Record<string, unknown>,
): Promise<SendMessageResponse> {
  const { tenant, accessToken } = await resolveTenant(wabaId);
  return graphRequest<SendMessageResponse>(`${tenant.phoneNumberId}/messages`, {
    method: "POST",
    accessToken,
    body: { messaging_product: "whatsapp", ...payload },
  });
}

/**
 * Send a free-form text message. Only allowed inside the 24h customer service
 * window (i.e. after the user has messaged the business). Use a template otherwise.
 */
export function sendText(wabaId: string, input: SendTextInput): Promise<SendMessageResponse> {
  return postMessage(wabaId, {
    to: input.to,
    type: "text",
    text: { preview_url: input.previewUrl ?? false, body: input.body },
  });
}

/**
 * Send a pre-approved template message. Required to initiate a conversation
 * outside the 24h window.
 */
export function sendTemplate(wabaId: string, input: SendTemplateInput): Promise<SendMessageResponse> {
  return postMessage(wabaId, {
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      ...(input.components ? { components: input.components } : {}),
    },
  });
}

/** Mark an inbound message as read (blue ticks) — good UX for an AI agent. */
export function markAsRead(wabaId: string, messageId: string): Promise<unknown> {
  return postMessage(wabaId, { status: "read", message_id: messageId });
}
