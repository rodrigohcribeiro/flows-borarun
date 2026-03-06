import type { WhatsAppReplyButton } from "./node-data";

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  messages: ChatMessage[];
  status: "running" | "paused" | "completed" | "human";
  currentNodeId: string | null;
  abTestPath?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  type: "text" | "image" | "file" | "audio" | "template" | "system";
  sender: "bot" | "contact" | "human" | "system";
  mediaUrl?: string;
  fileName?: string;
  templateName?: string;
  nodeId?: string;
  replyButtons?: WhatsAppReplyButton[];
  timestamp: Date;
}

export type SimulationStatus = "idle" | "running" | "paused" | "completed";

export type ActiveTab = "flows" | "conversations";
