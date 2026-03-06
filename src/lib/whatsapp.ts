import type { SendMessageNodeData, WhatsAppReplyButton } from "@/types/node-data";

export const WHATSAPP_REPLY_BUTTON_LIMIT = 3;
export const WHATSAPP_REPLY_BUTTON_TITLE_LIMIT = 20;

export function hasWhatsAppReplyButtons(
  data: Pick<SendMessageNodeData, "messageType" | "replyButtons">
): boolean {
  return data.messageType === "text" && (data.replyButtons?.length ?? 0) > 0;
}

export function sanitizeWhatsAppReplyButtonTitle(title: string): string {
  return title.slice(0, WHATSAPP_REPLY_BUTTON_TITLE_LIMIT);
}

export function createWhatsAppReplyButton(index: number): WhatsAppReplyButton {
  return {
    id: `reply-${Date.now()}-${index}`,
    title: sanitizeWhatsAppReplyButtonTitle(`Opcao ${index + 1}`),
  };
}

export function buildWhatsAppReplyButtonsPayload(
  bodyText: string,
  replyButtons: WhatsAppReplyButton[]
) {
  return {
    messaging_product: "whatsapp",
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: replyButtons.map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  };
}
