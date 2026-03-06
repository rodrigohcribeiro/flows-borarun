"use client";

import type { NodeProps } from "@xyflow/react";
import {
  MessageSquare,
  Image,
  FileText,
  Mic,
  LayoutTemplate,
} from "lucide-react";
import { NodeWrapper } from "./node-wrapper";
import { NODE_CONFIG } from "@/lib/constants";
import { hasWhatsAppReplyButtons } from "@/lib/whatsapp";
import { NODE_TYPES } from "@/types/flow";
import type { SendMessageNodeData } from "@/types/node-data";

const messageIcons = {
  text: <MessageSquare size={14} />,
  template: <LayoutTemplate size={14} />,
  image: <Image size={14} />,
  file: <FileText size={14} />,
  audio: <Mic size={14} />,
};

const messageLabels = {
  text: "Texto",
  template: "Template",
  image: "Imagem",
  file: "Arquivo",
  audio: "Audio",
};

export function SendMessageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as SendMessageNodeData;
  const config = NODE_CONFIG[NODE_TYPES.SEND_MESSAGE];
  const replyButtons = nodeData.replyButtons || [];
  const sourceHandles = hasWhatsAppReplyButtons(nodeData)
    ? replyButtons.map((button) => ({
        id: button.id,
        label: button.title,
      }))
    : undefined;

  return (
    <NodeWrapper
      id={id}
      label={nodeData.label || config.label}
      icon={messageIcons[nodeData.messageType] || <MessageSquare size={14} />}
      color={config.color}
      selected={selected}
      sourceHandles={sourceHandles}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-gray-500">Tipo:</span>
        <span className="font-medium">
          {messageLabels[nodeData.messageType]}
        </span>
      </div>

      {nodeData.messageType === "text" && nodeData.textContent && (
        <p className="text-gray-700 line-clamp-3 whitespace-pre-wrap">
          {nodeData.textContent}
        </p>
      )}

      {replyButtons.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {replyButtons.map((button) => (
            <div
              key={button.id}
              className="rounded-md border border-[#8bb7f0] bg-[#ebf3ff] px-2 py-1 text-center text-[11px] font-medium text-[#3977d8]"
            >
              {button.title}
            </div>
          ))}
        </div>
      )}

      {nodeData.messageType === "template" && nodeData.templateName && (
        <div className="px-2 py-0.5 bg-green-50 rounded text-green-700 truncate">
          {nodeData.templateName}
        </div>
      )}

      {(nodeData.messageType === "image" ||
        nodeData.messageType === "file" ||
        nodeData.messageType === "audio") &&
        nodeData.mediaUrl && (
          <div className="px-2 py-0.5 bg-gray-50 rounded text-gray-600 truncate">
            {nodeData.fileName || "Arquivo anexado"}
          </div>
        )}

      {!nodeData.textContent &&
        !nodeData.templateName &&
        !nodeData.mediaUrl && (
          <p className="text-gray-400 italic">Clique para configurar</p>
        )}
    </NodeWrapper>
  );
}
