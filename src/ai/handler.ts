import { markAsRead, sendText } from "../messaging/service.js";
import type { InboundMessage, WebhookValue } from "../types/whatsapp.js";

/**
 * Integration point for your AI customer-service agent.
 *
 * This is where you plug in your own model/logic. The default implementation
 * marks the message as read and echoes a placeholder reply so you can verify
 * the round trip end to end. Replace `generateReply` with a call to your AI.
 */
async function generateReply(userText: string): Promise<string> {
  // TODO: call your AI service here and return its response.
  return `Recebi sua mensagem: "${userText}". (resposta da IA vai aqui)`;
}

export async function handleInboundMessage(
  wabaId: string,
  value: WebhookValue,
  message: InboundMessage,
): Promise<void> {
  // Only text is handled by the default agent; extend for media/interactive types.
  if (message.type !== "text" || !message.text?.body) return;

  await markAsRead(wabaId, message.id).catch(() => undefined);

  const reply = await generateReply(message.text.body);
  await sendText(wabaId, { to: message.from, body: reply });
}
