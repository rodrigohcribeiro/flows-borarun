import { NextResponse } from "next/server";
import {
  getMetaConfig,
  getMetaWebhookSummary,
  validateMetaWebhookSignature,
  validateMetaWebhookVerifyToken,
} from "@/lib/meta";

type MetaWebhookChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: { name?: string };
    wa_id?: string;
  }>;
  messages?: Array<{
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
    interactive?: {
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string; description?: string };
    };
  }>;
  statuses?: Array<{
    id?: string;
    status?: string;
    recipient_id?: string;
    timestamp?: string;
    errors?: Array<{ code?: number; title?: string; details?: string }>;
  }>;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: MetaWebhookChangeValue;
    }>;
  }>;
};

export async function GET(request: Request) {
  const { configured, missing } = getMetaConfig();

  if (!configured) {
    return NextResponse.json(
      {
        error: "Meta Cloud API credentials not configured",
        missing,
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && validateMetaWebhookVerifyToken(verifyToken)) {
    return new NextResponse(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid webhook verification" }, { status: 403 });
}

export async function POST(request: Request) {
  const { configured, missing } = getMetaConfig();

  if (!configured) {
    return NextResponse.json(
      {
        error: "Meta Cloud API credentials not configured",
        missing,
      },
      { status: 400 }
    );
  }

  const signature = request.headers.get("x-hub-signature-256");
  const rawBody = await request.text();

  if (!validateMetaWebhookSignature(signature, rawBody)) {
    return NextResponse.json({ error: "Invalid Meta signature" }, { status: 403 });
  }

  const payload = JSON.parse(rawBody) as MetaWebhookPayload;

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      for (const message of value.messages || []) {
        console.log("Meta WhatsApp inbound message", {
          ...getMetaWebhookSummary(request.url),
          object: payload.object,
          field: change.field,
          entryId: entry.id,
          from: message.from,
          type: message.type,
          text: message.text?.body,
          buttonReply: message.interactive?.button_reply,
          listReply: message.interactive?.list_reply,
          messageId: message.id,
          phoneNumberId: value.metadata?.phone_number_id,
          profileName: value.contacts?.[0]?.profile?.name,
        });
      }

      for (const status of value.statuses || []) {
        console.log("Meta WhatsApp status update", {
          ...getMetaWebhookSummary(request.url),
          object: payload.object,
          field: change.field,
          entryId: entry.id,
          messageId: status.id,
          status: status.status,
          recipientId: status.recipient_id,
          timestamp: status.timestamp,
          errors: status.errors,
          phoneNumberId: value.metadata?.phone_number_id,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
