"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFlowStore } from "@/hooks/use-flow-store";
import { NODE_CONFIG } from "@/lib/constants";
import { TriggerEditor } from "./trigger-editor";
import { SendMessageEditor } from "./send-message-editor";
import { TemplateImageEditor } from "./template-image-editor";
import { RandomizerEditor } from "./randomizer-editor";
import type { NodeData, TriggerNodeData, SendMessageNodeData, TemplateImageNodeData, RandomizerNodeData } from "@/types/node-data";

export function NodeEditorPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const nodes = useFlowStore((s) => s.nodes);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const nodeData = selectedNode?.data as NodeData | undefined;

  const nodeType = nodeData?.type;
  const config = nodeType
    ? NODE_CONFIG[nodeType as keyof typeof NODE_CONFIG]
    : null;

  return (
    <Sheet
      open={!!selectedNodeId}
      onOpenChange={(open) => {
        if (!open) setSelectedNodeId(null);
      }}
    >
      <SheetContent className="w-[380px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {config && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
            )}
            {config?.label || "Editar no"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          {selectedNodeId && nodeData?.type === "trigger" && (
            <TriggerEditor
              nodeId={selectedNodeId}
              data={nodeData as TriggerNodeData}
            />
          )}
          {selectedNodeId && nodeData?.type === "sendMessage" && (
            <SendMessageEditor
              nodeId={selectedNodeId}
              data={nodeData as SendMessageNodeData}
            />
          )}
          {selectedNodeId && nodeData?.type === "templateImage" && (
            <TemplateImageEditor
              nodeId={selectedNodeId}
              data={nodeData as TemplateImageNodeData}
            />
          )}
          {selectedNodeId && nodeData?.type === "randomizer" && (
            <RandomizerEditor
              nodeId={selectedNodeId}
              data={nodeData as RandomizerNodeData}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
