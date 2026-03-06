"use client";

import type { NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
import { NodeWrapper } from "./node-wrapper";
import { NODE_CONFIG } from "@/lib/constants";
import { NODE_TYPES } from "@/types/flow";
import type { RandomizerNodeData } from "@/types/node-data";

export function RandomizerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as RandomizerNodeData;
  const config = NODE_CONFIG[NODE_TYPES.RANDOMIZER];

  const sourceHandles = nodeData.splits.map((split) => ({
    id: split.id,
    label: `${split.label}: ${split.percentage}%`,
  }));

  return (
    <NodeWrapper
      id={id}
      label={nodeData.label || config.label}
      icon={<Shuffle size={14} />}
      color={config.color}
      selected={selected}
      sourceHandles={sourceHandles}
    >
      <div className="space-y-1.5">
        {nodeData.splits.map((split) => (
          <div key={split.id} className="flex items-center gap-2">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${split.percentage}%`,
                backgroundColor: config.color,
                minWidth: 8,
              }}
            />
            <span className="whitespace-nowrap font-medium">
              {split.label}: {split.percentage}%
            </span>
          </div>
        ))}
      </div>
    </NodeWrapper>
  );
}
