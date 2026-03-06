"use client";

import { useEffect, useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { FlowSidebar } from "@/components/layout/flow-sidebar";
import { FlowToolbar } from "@/components/canvas/flow-toolbar";
import { NodeEditorPanel } from "@/components/editors/node-editor-panel";
import { SimulatorView } from "@/components/simulator/simulator-view";
import { useFlowStore } from "@/hooks/use-flow-store";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSimulatorStore } from "@/hooks/use-simulator-store";

function FlowBuilderContent() {
  const { save, isSaving } = useAutoSave();
  const setFlow = useFlowStore((s) => s.setFlow);
  const activeTab = useSimulatorStore((s) => s.activeTab);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Try to load existing flow or create a new one
    async function initFlow() {
      try {
        const res = await fetch("/api/flows");
        if (res.ok) {
          const flows = await res.json();
          if (flows.length > 0) {
            const flow = flows[0];
            setFlow(flow.id, flow.name, flow.nodes || [], flow.edges || []);
            return;
          }
        }
      } catch {
        // Supabase not configured yet, work in local-only mode
      }

      try {
        const res = await fetch("/api/flows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Novo Flow" }),
        });
        if (res.ok) {
          const flow = await res.json();
          setFlow(flow.id, flow.name, [], []);
          return;
        }
      } catch {
        // Supabase not configured, use local-only mode
      }

      // Fallback: local-only mode without persistence
      setFlow("local", "Novo Flow", [], []);
    }

    initFlow();
  }, [setFlow]);

  return (
    <div className="h-screen flex flex-col">
      <FlowToolbar onSave={save} isSaving={isSaving} />

      {activeTab === "flows" ? (
        <div className="flex flex-1 overflow-hidden">
          <FlowSidebar />
          <FlowCanvas />
        </div>
      ) : (
        <SimulatorView />
      )}

      {activeTab === "flows" && <NodeEditorPanel />}
    </div>
  );
}

export default function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  );
}
