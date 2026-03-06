"use client";

import type { NodeProps } from "@xyflow/react";
import { ImageIcon } from "lucide-react";
import { NodeWrapper } from "./node-wrapper";
import { NODE_CONFIG } from "@/lib/constants";
import { NODE_TYPES } from "@/types/flow";
import type { TemplateImageNodeData } from "@/types/node-data";

export function TemplateImageNode({ id, data, selected }: NodeProps) {
  const nodeData = data as TemplateImageNodeData;
  const config = NODE_CONFIG[NODE_TYPES.TEMPLATE_IMAGE];

  return (
    <NodeWrapper
      id={id}
      label={nodeData.label || config.label}
      icon={<ImageIcon size={14} />}
      color={config.color}
      selected={selected}
    >
      {nodeData.headerImageUrl && (
        <div className="mb-2 rounded overflow-hidden">
          <img
            src={nodeData.headerImageUrl}
            alt="Header"
            className="w-full h-16 object-cover"
          />
        </div>
      )}

      {nodeData.templateName ? (
        <div className="px-2 py-0.5 bg-blue-50 rounded text-blue-700 truncate">
          {nodeData.templateName}
        </div>
      ) : (
        <p className="text-gray-400 italic">Clique para configurar</p>
      )}

      {nodeData.bodyVariables &&
        Object.keys(nodeData.bodyVariables).length > 0 && (
          <div className="mt-1 text-gray-500">
            {Object.keys(nodeData.bodyVariables).length} variavel(is)
          </div>
        )}
    </NodeWrapper>
  );
}
