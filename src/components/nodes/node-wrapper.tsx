"use client";

import { type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { X } from "lucide-react";
import { useFlowStore } from "@/hooks/use-flow-store";

interface NodeWrapperProps {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  children: ReactNode;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
  sourceHandles?: { id: string; label: string; position?: number }[];
  selected?: boolean;
}

export function NodeWrapper({
  id,
  label,
  icon,
  color,
  children,
  showTargetHandle = true,
  showSourceHandle = true,
  sourceHandles,
  selected,
}: NodeWrapperProps) {
  const deleteNode = useFlowStore((s) => s.deleteNode);

  return (
    <div
      className={`relative min-w-[220px] max-w-[280px] rounded-lg bg-white shadow-md border-2 transition-shadow ${
        selected ? "shadow-lg ring-2 ring-primary/30" : ""
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-sm font-medium text-gray-800 truncate">
            {label}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-2 text-xs text-gray-600">{children}</div>

      {sourceHandles
        ? sourceHandles.map((handle, index) => (
            <Handle
              key={handle.id}
              type="source"
              position={Position.Bottom}
              id={handle.id}
              className="!w-3 !h-3 !border-2 !border-white"
              style={{
                backgroundColor: color,
                left: `${((index + 1) / (sourceHandles.length + 1)) * 100}%`,
              }}
            />
          ))
        : showSourceHandle && (
            <Handle
              type="source"
              position={Position.Bottom}
              className="!w-3 !h-3 !border-2 !border-white"
              style={{ backgroundColor: color }}
            />
          )}
    </div>
  );
}
