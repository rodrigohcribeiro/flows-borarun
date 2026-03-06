"use client";

import { type DragEvent } from "react";
import { Zap, MessageSquare, ImageIcon, Shuffle } from "lucide-react";
import { NODE_TYPES } from "@/types/flow";
import { NODE_CONFIG } from "@/lib/constants";

const nodeItems = [
  {
    type: NODE_TYPES.TRIGGER,
    icon: <Zap size={18} />,
    ...NODE_CONFIG[NODE_TYPES.TRIGGER],
  },
  {
    type: NODE_TYPES.SEND_MESSAGE,
    icon: <MessageSquare size={18} />,
    ...NODE_CONFIG[NODE_TYPES.SEND_MESSAGE],
  },
  {
    type: NODE_TYPES.TEMPLATE_IMAGE,
    icon: <ImageIcon size={18} />,
    ...NODE_CONFIG[NODE_TYPES.TEMPLATE_IMAGE],
  },
  {
    type: NODE_TYPES.RANDOMIZER,
    icon: <Shuffle size={18} />,
    ...NODE_CONFIG[NODE_TYPES.RANDOMIZER],
  },
];

function onDragStart(event: DragEvent, nodeType: string) {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
}

export function FlowSidebar() {
  return (
    <aside className="w-56 border-r bg-white flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold text-gray-700">Componentes</h2>
      </div>
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        {nodeItems.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex items-center gap-3 p-2.5 rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors"
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-md"
              style={{ backgroundColor: `${item.color}15`, color: item.color }}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{item.label}</p>
              <p className="text-[10px] text-gray-500 leading-tight">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
