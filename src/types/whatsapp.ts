/**
 * Minimal type definitions for the WhatsApp Cloud API payloads we use.
 * These cover only the fields this backend reads or sends — not the full Graph schema.
 */

/** A tenant is one onboarded client (one WABA) that we send/receive messages for. */
export interface Tenant {
  /** WhatsApp Business Account ID (owned by the client). */
  wabaId: string;
  /** Phone number ID used as the sender for Cloud API calls. */
  phoneNumberId: string;
  /** Display phone number in E.164, e.g. "+551140028922". */
  displayPhoneNumber?: string;
  /** Long-lived business access token for this client, encrypted at rest. */
  encryptedAccessToken: string;
  createdAt: string;
  updatedAt: string;
}

/** Result of exchanging the Embedded Signup code for an access token. */
export interface TokenExchangeResult {
  accessToken: string;
  tokenType: string;
  expiresInSeconds?: number;
}

/** Outbound: a plain text message. */
export interface SendTextInput {
  to: string;
  body: string;
  previewUrl?: boolean;
}

/** Outbound: a template message (required to open a conversation outside the 24h window). */
export interface SendTemplateInput {
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: number;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  [key: string]: unknown;
}

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// ----- Inbound webhook payloads -----

export interface WebhookEnvelope {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string; // WABA ID
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string; // e.g. "messages"
  value: WebhookValue;
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: { profile: { name: string }; wa_id: string }[];
  messages?: InboundMessage[];
  statuses?: MessageStatus[];
}

export interface InboundMessage {
  from: string; // sender wa_id
  id: string;
  timestamp: string;
  type: string; // "text" | "image" | ...
  text?: { body: string };
  [key: string]: unknown;
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string }[];
}
