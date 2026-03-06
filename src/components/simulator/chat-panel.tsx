"use client";

import { useEffect, useRef } from "react";
import { Headset, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFlowStore } from "@/hooks/use-flow-store";
import { useSimulatorStore } from "@/hooks/use-simulator-store";
import {
  continueSimulation,
  findNextNodesForReplyButton,
} from "@/lib/simulation-engine";
import type { WhatsAppReplyButton } from "@/types/node-data";
import type { Conversation } from "@/types/simulator";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";

interface ChatPanelProps {
  conversation: Conversation;
}

export function ChatPanel({ conversation }: ChatPanelProps) {
  const takeOver = useSimulatorStore((s) => s.takeOverConversation);
  const returnBot = useSimulatorStore((s) => s.returnToBot);
  const sendHuman = useSimulatorStore((s) => s.sendHumanMessage);
  const addMessage = useSimulatorStore((s) => s.addMessage);
  const setCurrentNode = useSimulatorStore((s) => s.setCurrentNode);
  const updateConversationStatus = useSimulatorStore(
    (s) => s.updateConversationStatus
  );
  const setSimulationStatus = useSimulatorStore((s) => s.setSimulationStatus);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHumanMode = conversation.status === "human";
  const isCompleted = conversation.status === "completed";
  const isAwaitingReply = conversation.status === "paused";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  const handleReplyButtonClick = async (
    nodeId: string | undefined,
    button: WhatsAppReplyButton
  ) => {
    if (!nodeId || !isAwaitingReply || conversation.currentNodeId !== nodeId) {
      return;
    }

    addMessage(conversation.id, {
      id: `contact-${conversation.id}-${nodeId}-${button.id}-${conversation.messages.length}`,
      content: button.title,
      type: "text",
      sender: "contact",
      nodeId,
      timestamp: new Date(),
    });
    updateConversationStatus(conversation.id, "running");

    const nextNodes = findNextNodesForReplyButton(nodeId, button.id, edges, nodes);

    await continueSimulation(nextNodes, nodes, edges, {
      onMessage: (message) => addMessage(conversation.id, message),
      onNodeChange: (nextNodeId) => setCurrentNode(conversation.id, nextNodeId),
      onWaitForReply: (waitingNodeId) => {
        setCurrentNode(conversation.id, waitingNodeId);
        updateConversationStatus(conversation.id, "paused");
      },
      onComplete: () => {
        updateConversationStatus(conversation.id, "completed");
        const store = useSimulatorStore.getState();
        const hasActive = store.conversations.some(
          (item) =>
            item.id !== conversation.id &&
            (item.status === "running" || item.status === "paused")
        );
        if (!hasActive) setSimulationStatus("completed");
      },
      shouldStop: () => false,
      isHumanMode: () => {
        const store = useSimulatorStore.getState();
        const currentConversation = store.conversations.find(
          (item) => item.id === conversation.id
        );
        return currentConversation?.status === "human";
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#e5ddd5]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#075e54] text-white">
        <div>
          <p className="text-sm font-medium">{conversation.contactName}</p>
          <p className="text-[10px] opacity-80">{conversation.contactPhone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isHumanMode ? "default" : "secondary"}
            className={
              isHumanMode
                ? "bg-blue-500 text-white text-[10px]"
                : "bg-white/20 text-white text-[10px]"
            }
          >
            {isHumanMode
              ? "Humano"
              : isCompleted
                ? "Finalizado"
                : isAwaitingReply
                  ? "Aguardando"
                  : "Bot"}
          </Badge>

          {!isCompleted &&
            (isHumanMode ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-white hover:bg-white/10"
                onClick={() => returnBot(conversation.id)}
              >
                <RotateCcw size={12} />
                Devolver ao bot
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-white hover:bg-white/10"
                onClick={() => takeOver(conversation.id)}
              >
                <Headset size={12} />
                Assumir
              </Button>
            ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {conversation.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onReplyButtonClick={
              isAwaitingReply && message.nodeId === conversation.currentNodeId
                ? (button) => {
                    void handleReplyButtonClick(message.nodeId, button);
                  }
                : undefined
            }
            replyButtonsDisabled={
              !(
                isAwaitingReply &&
                !isHumanMode &&
                message.nodeId === conversation.currentNodeId
              )
            }
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        disabled={!isHumanMode}
        placeholder={
          isHumanMode
            ? "Digite uma mensagem..."
            : isCompleted
              ? "Conversa finalizada"
              : isAwaitingReply
                ? "Clique em um botao acima para continuar"
                : "Assuma a conversa para digitar"
        }
        onSend={(text) => sendHuman(conversation.id, text)}
      />
    </div>
  );
}
