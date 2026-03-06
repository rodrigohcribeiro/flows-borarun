export type NodeData =
  | TriggerNodeData
  | SendMessageNodeData
  | TemplateImageNodeData
  | RandomizerNodeData;

export type TriggerNodeData = {
  type: "trigger";
  label: string;
  triggerType: "keyword" | "newContact" | "manual";
  keyword?: string;
  [key: string]: unknown;
};

export type SendMessageNodeData = {
  type: "sendMessage";
  label: string;
  messageType: "text" | "template" | "image" | "file" | "audio";
  textContent?: string;
  templateId?: string;
  templateName?: string;
  mediaUrl?: string;
  fileName?: string;
  replyButtons?: WhatsAppReplyButton[];
  [key: string]: unknown;
};

export type TemplateImageNodeData = {
  type: "templateImage";
  label: string;
  templateId?: string;
  templateName?: string;
  headerImageUrl?: string;
  bodyVariables?: Record<string, string>;
  [key: string]: unknown;
};

export type RandomizerNodeData = {
  type: "randomizer";
  label: string;
  splits: RandomizerSplit[];
  [key: string]: unknown;
};

export interface RandomizerSplit {
  id: string;
  label: string;
  percentage: number;
}

export interface WhatsAppReplyButton {
  id: string;
  title: string;
}
