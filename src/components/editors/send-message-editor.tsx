"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFlowStore } from "@/hooks/use-flow-store";
import {
  createWhatsAppReplyButton,
  hasWhatsAppReplyButtons,
  sanitizeWhatsAppReplyButtonTitle,
  WHATSAPP_REPLY_BUTTON_LIMIT,
  WHATSAPP_REPLY_BUTTON_TITLE_LIMIT,
} from "@/lib/whatsapp";
import type {
  SendMessageNodeData,
  WhatsAppReplyButton,
} from "@/types/node-data";
import { MediaUploader } from "./media-uploader";

interface SendMessageEditorProps {
  nodeId: string;
  data: SendMessageNodeData;
}

export function SendMessageEditor({ nodeId, data }: SendMessageEditorProps) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const edges = useFlowStore((s) => s.edges);
  const replyButtons = data.replyButtons || [];

  const update = (partial: Partial<SendMessageNodeData>) => {
    updateNodeData(nodeId, partial);
  };

  const removeEdgesBySourceHandles = (sourceHandleIds: string[]) => {
    if (sourceHandleIds.length === 0 || edges.length === 0) return;

    const handleIdSet = new Set(sourceHandleIds);
    const store = useFlowStore.getState();
    const nextEdges = store.edges.filter(
      (edge) =>
        edge.source !== nodeId ||
        !edge.sourceHandle ||
        !handleIdSet.has(edge.sourceHandle)
    );

    if (nextEdges.length !== store.edges.length) {
      useFlowStore.setState({ edges: nextEdges, isDirty: true });
    }
  };

  const removeGenericOutgoingEdges = () => {
    if (edges.length === 0) return;

    const store = useFlowStore.getState();
    const nextEdges = store.edges.filter(
      (edge) => !(edge.source === nodeId && !edge.sourceHandle)
    );

    if (nextEdges.length !== store.edges.length) {
      useFlowStore.setState({ edges: nextEdges, isDirty: true });
    }
  };

  const updateReplyButtons = (nextButtons: WhatsAppReplyButton[]) => {
    const previousButtons = replyButtons;
    const nextIds = new Set(nextButtons.map((button) => button.id));
    const removedIds = previousButtons
      .filter((button) => !nextIds.has(button.id))
      .map((button) => button.id);

    if (previousButtons.length === 0 && nextButtons.length > 0) {
      removeGenericOutgoingEdges();
    }

    if (removedIds.length > 0) {
      removeEdgesBySourceHandles(removedIds);
    }

    update({ replyButtons: nextButtons });
  };

  const addReplyButton = () => {
    if (replyButtons.length >= WHATSAPP_REPLY_BUTTON_LIMIT) return;

    updateReplyButtons([
      ...replyButtons,
      createWhatsAppReplyButton(replyButtons.length),
    ]);
  };

  const updateReplyButton = (
    buttonId: string,
    partial: Partial<WhatsAppReplyButton>
  ) => {
    updateReplyButtons(
      replyButtons.map((button) =>
        button.id === buttonId ? { ...button, ...partial } : button
      )
    );
  };

  const removeReplyButton = (buttonId: string) => {
    updateReplyButtons(
      replyButtons.filter((button) => button.id !== buttonId)
    );
  };

  const duplicateReplyTitles = new Set(
    replyButtons
      .map((button) => button.title.trim())
      .filter(Boolean)
      .filter(
        (title, index, titles) =>
          titles.findIndex((value) => value === title) !== index
      )
  );

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
        <Label>Tipo de mensagem</Label>
        <Select
          value={data.messageType}
          onValueChange={(value) => {
            if (replyButtons.length > 0) {
              removeEdgesBySourceHandles(
                replyButtons.map((button) => button.id)
              );
            }

            update({
              messageType: value as SendMessageNodeData["messageType"],
              textContent: undefined,
              templateId: undefined,
              templateName: undefined,
              mediaUrl: undefined,
              fileName: undefined,
              replyButtons: [],
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto livre</SelectItem>
            <SelectItem value="template">Template WhatsApp</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
            <SelectItem value="file">Arquivo</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.messageType === "text" && (
        <>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={data.textContent || ""}
              onChange={(e) => update({ textContent: e.target.value })}
              placeholder="Digite a mensagem..."
              rows={5}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Label>Botoes de resposta</Label>
                <p className="text-xs text-gray-500">
                  WhatsApp permite ate {WHATSAPP_REPLY_BUTTON_LIMIT} botoes
                  interativos. Cada botao vira uma saida do card no flow.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={addReplyButton}
                disabled={replyButtons.length >= WHATSAPP_REPLY_BUTTON_LIMIT}
              >
                <Plus size={14} className="mr-1" />
                Adicionar
              </Button>
            </div>

            {replyButtons.length === 0 && (
              <p className="text-xs text-gray-400">
                Sem botoes. A mensagem segue pelo proximo no conectado.
              </p>
            )}

            {replyButtons.map((button, index) => {
              const title = button.title.trim();
              const isDuplicate = duplicateReplyTitles.has(title);

              return (
                <div key={button.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-gray-500">
                      Botao {index + 1}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReplyButton(button.id)}
                    >
                      <Trash2 size={14} className="text-gray-400" />
                    </Button>
                  </div>
                  <Input
                    value={button.title}
                    onChange={(e) =>
                      updateReplyButton(button.id, {
                        title: sanitizeWhatsAppReplyButtonTitle(
                          e.target.value
                        ),
                      })
                    }
                    placeholder="Texto do botao"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={
                        isDuplicate ? "text-destructive" : "text-gray-400"
                      }
                    >
                      {isDuplicate
                        ? "Cada botao precisa ter um texto diferente."
                        : "O clique do usuario segue pela saida desse botao."}
                    </span>
                    <span className="text-gray-400">
                      {button.title.length}/{WHATSAPP_REPLY_BUTTON_TITLE_LIMIT}
                    </span>
                  </div>
                </div>
              );
            })}

            {hasWhatsAppReplyButtons(data) && !data.textContent?.trim() && (
              <p className="text-xs text-destructive">
                Mensagens com botoes precisam de texto no corpo.
              </p>
            )}
          </div>
        </>
      )}

      {data.messageType === "template" && (
        <div className="space-y-2">
          <Label>Template</Label>
          <Input
            value={data.templateName || ""}
            onChange={(e) =>
              update({
                templateName: e.target.value,
                templateId: e.target.value,
              })
            }
            placeholder="Nome do template..."
          />
          <p className="text-xs text-gray-500">
            Os templates serao carregados da sua conta Meta Cloud API
          </p>
        </div>
      )}

      {data.messageType === "image" && (
        <div className="space-y-2">
          <Label>Imagem</Label>
          <MediaUploader
            type="image"
            accept="image/*"
            value={data.mediaUrl}
            fileName={data.fileName}
            onChange={(url, name) => update({ mediaUrl: url, fileName: name })}
            onRemove={() =>
              update({ mediaUrl: undefined, fileName: undefined })
            }
          />
        </div>
      )}

      {data.messageType === "file" && (
        <div className="space-y-2">
          <Label>Arquivo</Label>
          <MediaUploader
            type="file"
            accept="*/*"
            value={data.mediaUrl}
            fileName={data.fileName}
            onChange={(url, name) => update({ mediaUrl: url, fileName: name })}
            onRemove={() =>
              update({ mediaUrl: undefined, fileName: undefined })
            }
          />
        </div>
      )}

      {data.messageType === "audio" && (
        <div className="space-y-2">
          <Label>Audio</Label>
          <MediaUploader
            type="audio"
            accept="audio/*"
            value={data.mediaUrl}
            fileName={data.fileName}
            onChange={(url, name) => update({ mediaUrl: url, fileName: name })}
            onRemove={() =>
              update({ mediaUrl: undefined, fileName: undefined })
            }
          />
        </div>
      )}
    </div>
  );
}
