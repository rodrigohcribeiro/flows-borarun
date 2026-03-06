"use client";

import { Save, Loader2, PenTool, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowStore } from "@/hooks/use-flow-store";
import { useSimulatorStore } from "@/hooks/use-simulator-store";
import type { ActiveTab } from "@/types/simulator";

interface FlowToolbarProps {
  onSave?: () => void;
  isSaving?: boolean;
}

export function FlowToolbar({ onSave, isSaving }: FlowToolbarProps) {
  const flowName = useFlowStore((s) => s.flowName);
  const setFlowName = useFlowStore((s) => s.setFlowName);
  const isDirty = useFlowStore((s) => s.isDirty);
  const activeTab = useSimulatorStore((s) => s.activeTab);
  const setActiveTab = useSimulatorStore((s) => s.setActiveTab);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "flows", label: "Flows", icon: <PenTool size={14} /> },
    { id: "conversations", label: "Conversas", icon: <MessageCircle size={14} /> },
  ];

  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Flows</span>
        <span className="text-gray-300">/</span>
        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="h-7 w-56 text-sm font-medium border-transparent hover:border-gray-300 focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="text-xs text-gray-400">Alteracoes nao salvas</span>
        )}
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Salvar
        </Button>
      </div>
    </header>
  );
}
