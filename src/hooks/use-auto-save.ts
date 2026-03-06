"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useFlowStore } from "./use-flow-store";

export function useAutoSave() {
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flowId = useFlowStore((s) => s.flowId);
  const flowName = useFlowStore((s) => s.flowName);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const isDirty = useFlowStore((s) => s.isDirty);
  const setClean = useFlowStore((s) => s.setClean);

  const save = useCallback(async () => {
    if (!flowId || !isDirty) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: flowName, nodes, edges }),
      });

      if (res.ok) {
        setClean();
      }
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setIsSaving(false);
    }
  }, [flowId, flowName, nodes, edges, isDirty, setClean]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty || !flowId) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isDirty, flowId, save]);

  return { save, isSaving };
}
