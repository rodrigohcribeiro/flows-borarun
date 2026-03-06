import type { Node, Edge } from "@xyflow/react";
import type { NodeData, SendMessageNodeData, TemplateImageNodeData, RandomizerNodeData } from "@/types/node-data";
import type { ChatMessage } from "@/types/simulator";
import { hasWhatsAppReplyButtons } from "./whatsapp";

interface SimulationCallbacks {
  onMessage: (message: ChatMessage) => void;
  onNodeChange: (nodeId: string) => void;
  onComplete: () => void;
  onWaitForReply?: (nodeId: string) => void;
  shouldStop: () => boolean;
  isHumanMode: () => boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickRandomPath(splits: RandomizerNodeData["splits"]): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const split of splits) {
    cumulative += split.percentage;
    if (rand <= cumulative) return split.id;
  }
  return splits[splits.length - 1].id;
}

function findTriggerNode(nodes: Node<NodeData>[]): Node<NodeData> | undefined {
  return nodes.find((n) => (n.data as NodeData).type === "trigger");
}

function findNextNodes(
  nodeId: string,
  edges: Edge[],
  nodes: Node<NodeData>[],
  sourceHandle?: string
): Node<NodeData>[] {
  const outEdges = edges.filter(
    (e) => e.source === nodeId && (!sourceHandle || e.sourceHandle === sourceHandle)
  );
  return outEdges
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean) as Node<NodeData>[];
}

export function findNextNodesForReplyButton(
  nodeId: string,
  buttonId: string,
  edges: Edge[],
  nodes: Node<NodeData>[]
): Node<NodeData>[] {
  return findNextNodes(nodeId, edges, nodes, buttonId);
}

function nodeToMessage(node: Node<NodeData>): ChatMessage | null {
  const data = node.data as NodeData;

  if (data.type === "sendMessage") {
    const d = data as SendMessageNodeData;
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: d.textContent || d.templateName || d.fileName || "Mensagem configurada",
      type: d.messageType === "template" ? "template" : d.messageType,
      sender: "bot",
      mediaUrl: d.mediaUrl,
      fileName: d.fileName,
      templateName: d.templateName,
      nodeId: node.id,
      replyButtons: hasWhatsAppReplyButtons(d) ? d.replyButtons : undefined,
      timestamp: new Date(),
    };
  }

  if (data.type === "templateImage") {
    const d = data as TemplateImageNodeData;
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: d.templateName || "Template com imagem",
      type: "template",
      sender: "bot",
      mediaUrl: d.headerImageUrl,
      templateName: d.templateName,
      nodeId: node.id,
      timestamp: new Date(),
    };
  }

  return null;
}

async function processSimulationQueue(
  initialQueue: Node<NodeData>[],
  nodes: Node<NodeData>[],
  edges: Edge[],
  callbacks: SimulationCallbacks
): Promise<void> {
  const queue: Node<NodeData>[] = [...initialQueue];

  while (queue.length > 0) {
    if (callbacks.shouldStop()) return;

    // Wait while in human mode
    while (callbacks.isHumanMode()) {
      await delay(500);
      if (callbacks.shouldStop()) return;
    }

    const current = queue.shift()!;
    const data = current.data as NodeData;

    callbacks.onNodeChange(current.id);
    await delay(800);

    if (data.type === "trigger") {
      // Just move to next nodes
      const next = findNextNodes(current.id, edges, nodes);
      queue.push(...next);
      continue;
    }

    if (data.type === "randomizer") {
      const rd = data as RandomizerNodeData;
      const chosenSplitId = pickRandomPath(rd.splits);
      const chosenSplit = rd.splits.find((s) => s.id === chosenSplitId);

      callbacks.onMessage({
        id: `sys-${Date.now()}`,
        content: `Teste A/B: sorteou "${chosenSplit?.label || chosenSplitId}" (${chosenSplit?.percentage}%)`,
        type: "system",
        sender: "system",
        timestamp: new Date(),
      });

      const next = findNextNodes(current.id, edges, nodes, chosenSplitId);
      queue.push(...next);
      await delay(500);
      continue;
    }

    // sendMessage or templateImage
    const message = nodeToMessage(current);
    if (message) {
      callbacks.onMessage(message);

      if (
        data.type === "sendMessage" &&
        hasWhatsAppReplyButtons(data as SendMessageNodeData)
      ) {
        callbacks.onWaitForReply?.(current.id);
        return;
      }

      await delay(1000 + Math.random() * 500);
    }

    const next = findNextNodes(current.id, edges, nodes);
    queue.push(...next);
  }

  callbacks.onMessage({
    id: `sys-${Date.now()}`,
    content: "Conversa concluida",
    type: "system",
    sender: "system",
    timestamp: new Date(),
  });
  callbacks.onComplete();
}

export async function runSimulation(
  nodes: Node<NodeData>[],
  edges: Edge[],
  callbacks: SimulationCallbacks
): Promise<void> {
  const trigger = findTriggerNode(nodes);
  if (!trigger) {
    callbacks.onMessage({
      id: `sys-${Date.now()}`,
      content: "Nenhum no Trigger encontrado no flow",
      type: "system",
      sender: "system",
      timestamp: new Date(),
    });
    callbacks.onComplete();
    return;
  }

  callbacks.onMessage({
    id: `sys-${Date.now()}`,
    content: "Conversa iniciada",
    type: "system",
    sender: "system",
    timestamp: new Date(),
  });

  await processSimulationQueue([trigger], nodes, edges, callbacks);
}

export async function continueSimulation(
  nextNodes: Node<NodeData>[],
  nodes: Node<NodeData>[],
  edges: Edge[],
  callbacks: SimulationCallbacks
): Promise<void> {
  await processSimulationQueue(nextNodes, nodes, edges, callbacks);
}
