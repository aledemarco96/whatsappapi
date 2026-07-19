import { Router, type Request } from "express";
import { env } from "../config/env.js";
import type { WebhookEnvelope } from "../types/whatsapp.js";
import { dispatchWebhook } from "./handler.js";
import { isValidSignature } from "./signature.js";

export const webhookRouter = Router();

/** Request augmented with the raw body captured for signature verification. */
type RawRequest = Request & { rawBody?: Buffer };

/**
 * GET /webhooks — verification handshake.
 * Meta calls this once when you configure the webhook URL in the dashboard.
 */
webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

/**
 * POST /webhooks — inbound messages and statuses.
 * We verify the signature, ack immediately, then process asynchronously.
 */
webhookRouter.post("/", async (req: RawRequest, res) => {
  const valid = req.rawBody && (await isValidSignature(req.rawBody, req.get("x-hub-signature-256")));
  if (!valid) {
    return res.sendStatus(401);
  }

  // Ack right away so Meta does not retry; processing happens in the background.
  res.sendStatus(200);

  void dispatchWebhook(req.body as WebhookEnvelope).catch((err) =>
    console.error("[webhook] dispatch error:", err),
  );
});
