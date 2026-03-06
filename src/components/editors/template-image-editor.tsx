"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { MediaUploader } from "./media-uploader";
import { useFlowStore } from "@/hooks/use-flow-store";
import type { TemplateImageNodeData } from "@/types/node-data";

interface TemplateImageEditorProps {
  nodeId: string;
  data: TemplateImageNodeData;
}

export function TemplateImageEditor({
  nodeId,
  data,
}: TemplateImageEditorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const update = (partial: Partial<TemplateImageNodeData>) => {
    updateNodeData(nodeId, partial);
  };

  const variables = data.bodyVariables || {};

  const addVariable = () => {
    const key = `var_${Object.keys(variables).length + 1}`;
    update({ bodyVariables: { ...variables, [key]: "" } });
  };

  const updateVariable = (key: string, value: string) => {
    update({ bodyVariables: { ...variables, [key]: value } });
  };

  const removeVariable = (key: string) => {
    const next = { ...variables };
    delete next[key];
    update({ bodyVariables: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome do no</Label>
        <Input
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Template</Label>
        <Input
          value={data.templateName || ""}
          onChange={(e) =>
            update({ templateName: e.target.value, templateId: e.target.value })
          }
          placeholder="Nome do template..."
        />
        <p className="text-xs text-gray-500">
          Os templates serao carregados da sua conta Meta Cloud API
        </p>
      </div>

      <div className="space-y-2">
        <Label>Imagem de header</Label>
        <MediaUploader
          type="image"
          accept="image/*"
          value={data.headerImageUrl}
          fileName="Header image"
          onChange={(url) => update({ headerImageUrl: url })}
          onRemove={() => update({ headerImageUrl: undefined })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Variaveis do body</Label>
          <Button variant="ghost" size="sm" onClick={addVariable}>
            <Plus size={14} className="mr-1" />
            Adicionar
          </Button>
        </div>
        {Object.entries(variables).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Input
              value={key}
              disabled
              className="w-24 text-xs bg-gray-50"
            />
            <Input
              value={value}
              onChange={(e) => updateVariable(key, e.target.value)}
              placeholder="Valor..."
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeVariable(key)}
            >
              <Trash2 size={14} className="text-gray-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
