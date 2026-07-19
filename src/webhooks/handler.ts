import { handleInboundMessage } from "../ai/handler.js";
import type { MessageStatus, WebhookEnvelope, WebhookValue } from "../types/whatsapp.js";

/**
 * Dispatch a verified webhook envelope. Meta can batch multiple entries and
 * changes in a single POST, so we iterate over all of them.
 *
 * We intentionally never throw back to the HTTP layer: Meta retries on non-200
 * responses, which can cause duplicate processing. Errors are logged and swallowed
 * so we always ack, and individual message handling failures don't block the batch.
 */
export async function dispatchWebhook(envelope: WebhookEnvelope): Promise<void> {
  if (envelope.object !== "whatsapp_business_account") return;

  for (const entry of envelope.entry ?? []) {
    const wabaId = entry.id;
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      await handleChange(wabaId, change.value).catch((err) =>
        console.error(`[webhook] error handling change for WABA ${wabaId}:`, err),
      );
    }
  }
}

async function handleChange(wabaId: string, value: WebhookValue): Promise<void> {
  for (const message of value.messages ?? []) {
    await handleInboundMessage(wabaId, value, message).catch((err) =>
      console.error(`[webhook] failed to handle message ${message.id}:`, err),
    );
  }

  for (const status of value.statuses ?? []) {
    logStatus(wabaId, status);
  }
}

function logStatus(wabaId: string, status: MessageStatus): void {
  if (status.status === "failed") {
    console.warn(`[webhook] message ${status.id} failed:`, status.errors);
  }
}
