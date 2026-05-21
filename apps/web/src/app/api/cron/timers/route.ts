export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { continueFlowQueue, resumeFlowOnTimeout } from "@/lib/flow-engine";
import { persistConversationMessage } from "@/lib/conversation-messages";
import { getOrganizationSettingsById } from "@/lib/organization";
import {
  getMetaConfigFromSettings,
  sendMetaWhatsAppTextMessage,
} from "@/lib/meta";
import { validateCronAuthorization } from "@/lib/internal-auth";
import {
  AGENTIC_SALES_FOLLOW_UP_AFTER_HOURS,
  AGENTIC_SALES_FOLLOW_UP_KIND,
  AGENTIC_SALES_FOLLOW_UP_LOOKBACK_HOURS,
  AGENTIC_SALES_FOLLOW_UP_MESSAGE,
  getAgenticSalesFollowUpDecisionFromState,
} from "@/lib/agentic-sales-follow-up";

const PAYMENT_FOLLOW_UP_AFTER_MINUTES = 45;
const PAYMENT_FOLLOW_UP_LOOKBACK_HOURS = 24;
const STALE_RUNNING_FLOW_AFTER_MINUTES = 2;
const PAYMENT_FOLLOW_UP_MESSAGE =
  "Conseguiu abrir o link para ativar o Premium? Se preferir Pix ou cartao e o checkout nao mostrar a melhor opcao, me responde aqui que eu te ajudo.";

type PendingPaymentRow = {
  id: string;
  conversation_id: string;
  organization_id: string;
  created_at: string;
};

type PaymentFollowUpMessageRow = {
  sender: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type PaymentFollowUpConversationRow = {
  id: string;
  contact_phone: string | null;
  organization_id: string;
  subscription_status: string | null;
  subscription_plan: string | null;
};

type AgenticSalesFollowUpConversationRow = {
  id: string;
  contact_phone: string | null;
  organization_id: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  current_node_id: string | null;
  flow_variables: Record<string, string> | null;
  updated_at: string;
};

type AgenticSalesFollowUpTimestampRow = {
  created_at: string;
};

type AgenticSalesFollowUpLockRow = {
  id: string;
};

type StaleRunningFlowConversationRow = {
  id: string;
  contact_phone: string | null;
  organization_id: string;
  updated_at: string;
};

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function processStaleRunningFlowContinuations(
  supabase: ReturnType<typeof createServerClient>
) {
  const cutoff = new Date(
    Date.now() - STALE_RUNNING_FLOW_AFTER_MINUTES * 60 * 1000
  ).toISOString();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, contact_phone, organization_id, updated_at")
    .eq("status", "running")
    .not("active_flow_id", "is", null)
    .not("flow_node_queue", "is", null)
    .is("current_node_id", null)
    .lte("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Timer cron: failed to query stale running flows", error);
    return { processed: 0, skipped: 0, error: "Query failed" };
  }

  let processed = 0;
  let skipped = 0;

  for (const conversation of (conversations ||
    []) as StaleRunningFlowConversationRow[]) {
    if (!conversation.contact_phone) {
      skipped++;
      continue;
    }

    const settings = await getOrganizationSettingsById(
      conversation.organization_id
    );
    const { config: metaConfig } = getMetaConfigFromSettings(settings);
    if (!metaConfig) {
      skipped++;
      continue;
    }

    try {
      await continueFlowQueue(
        supabase,
        conversation.id,
        conversation.contact_phone,
        {
          organizationId: conversation.organization_id,
          metaConfig,
        }
      );
      processed++;
      console.log(
        `Timer cron: continued stale running flow ${conversation.id}`
      );
    } catch (continuationError) {
      skipped++;
      console.error(
        `Timer cron: failed to continue stale running flow ${conversation.id}`,
        continuationError
      );
    }
  }

  return { processed, skipped };
}

async function processPendingPaymentFollowUps(
  supabase: ReturnType<typeof createServerClient>
) {
  const cutoff = new Date(
    Date.now() - PAYMENT_FOLLOW_UP_AFTER_MINUTES * 60 * 1000
  ).toISOString();
  const lookback = new Date(
    Date.now() - PAYMENT_FOLLOW_UP_LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: pendingPayments, error } = await supabase
    .from("payments")
    .select("id, conversation_id, organization_id, created_at")
    .eq("status", "pending")
    .gte("created_at", lookback)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(30);

  if (error) {
    console.error("Timer cron: failed to query pending payments", error);
    return { processed: 0, skipped: 0, error: "Query failed" };
  }

  const seenConversations = new Set<string>();
  let processed = 0;
  let skipped = 0;

  for (const payment of ((pendingPayments || []) as PendingPaymentRow[])) {
    if (seenConversations.has(payment.conversation_id)) {
      skipped++;
      continue;
    }
    seenConversations.add(payment.conversation_id);

    const { data: conversation } = await supabase
      .from("conversations")
      .select(
        "id, contact_phone, organization_id, subscription_status, subscription_plan"
      )
      .eq("id", payment.conversation_id)
      .maybeSingle();

    const conversationRow =
      conversation as PaymentFollowUpConversationRow | null;
    if (!conversationRow?.contact_phone) {
      skipped++;
      continue;
    }

    if (
      conversationRow.subscription_status === "active" &&
      conversationRow.subscription_plan === "premium"
    ) {
      skipped++;
      continue;
    }

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("sender, content, metadata, created_at")
      .eq("conversation_id", payment.conversation_id)
      .gte("created_at", payment.created_at)
      .order("created_at", { ascending: true })
      .limit(80);

    const messages = (recentMessages || []) as PaymentFollowUpMessageRow[];
    const alreadyFollowedUp = messages.some(
      (message) =>
        message.metadata?.payment_follow_up_kind === "pending_checkout" ||
        message.metadata?.payment_follow_up_for === payment.id
    );
    const userAlreadyReplied = messages.some(
      (message) => message.sender === "contact"
    );
    const paymentLinkWasSent = messages.some((message) => {
      const metadata = message.metadata || {};
      return (
        typeof metadata.payment_url === "string" ||
        (message.sender === "bot" &&
          (message.content || "")
            .toLowerCase()
            .includes("assinar o plano mensal premium"))
      );
    });

    if (alreadyFollowedUp || userAlreadyReplied || !paymentLinkWasSent) {
      skipped++;
      continue;
    }

    const settings = await getOrganizationSettingsById(
      conversationRow.organization_id
    );
    const { config: metaConfig } = getMetaConfigFromSettings(settings);
    if (!metaConfig) {
      skipped++;
      continue;
    }

    try {
      const sent = await sendMetaWhatsAppTextMessage(
        {
          to: conversationRow.contact_phone,
          body: PAYMENT_FOLLOW_UP_MESSAGE,
        },
        metaConfig
      );

      await persistConversationMessage({
        supabase,
        conversationId: payment.conversation_id,
        content: PAYMENT_FOLLOW_UP_MESSAGE,
        type: "text",
        sender: "bot",
        waMessageId: sent.messageId,
        metadata: {
          payment_follow_up_for: payment.id,
          payment_follow_up_kind: "pending_checkout",
        },
      });

      processed++;
    } catch (followUpError) {
      skipped++;
      console.error(
        `Timer cron: failed to send payment follow-up for ${payment.id}`,
        followUpError
      );
    }
  }

  return { processed, skipped };
}

async function loadAgenticSalesFollowUpState(
  supabase: ReturnType<typeof createServerClient>,
  conversation: AgenticSalesFollowUpConversationRow,
  lookback: string
) {
  if (!conversation.current_node_id) {
    return {
      latestAgenticBotMessageAt: null,
      latestContactMessageAt: null,
      alreadyFollowedUpForLatest: false,
    };
  }

  const { data: latestAgenticBotMessage, error: latestAgenticBotError } =
    await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conversation.id)
      .eq("sender", "bot")
      .eq("node_id", conversation.current_node_id)
      .is("metadata->>agentic_sales_follow_up_kind", null)
      .gte("created_at", lookback)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestAgenticBotError) {
    console.error(
      "Timer cron: failed to query latest agentic bot message",
      {
        conversationId: conversation.id,
        error: latestAgenticBotError,
      }
    );
    return null;
  }

  const latestAgenticBotMessageAt =
    (latestAgenticBotMessage as AgenticSalesFollowUpTimestampRow | null)
      ?.created_at || null;

  if (!latestAgenticBotMessageAt) {
    return {
      latestAgenticBotMessageAt,
      latestContactMessageAt: null,
      alreadyFollowedUpForLatest: false,
    };
  }

  const { data: latestContactMessage, error: latestContactError } =
    await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conversation.id)
      .eq("sender", "contact")
      .gte("created_at", lookback)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestContactError) {
    console.error(
      "Timer cron: failed to query latest contact message",
      {
        conversationId: conversation.id,
        error: latestContactError,
      }
    );
    return null;
  }

  const { data: latestFollowUp, error: latestFollowUpError } = await supabase
    .from("messages")
    .select("created_at")
    .eq("conversation_id", conversation.id)
    .eq("sender", "bot")
    .eq(
      "metadata->>agentic_sales_follow_up_kind",
      AGENTIC_SALES_FOLLOW_UP_KIND
    )
    .gte("created_at", lookback)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestFollowUpError) {
    console.error(
      "Timer cron: failed to query latest agentic sales follow-up",
      {
        conversationId: conversation.id,
        error: latestFollowUpError,
      }
    );
    return null;
  }

  const { data: existingFollowUp, error: existingFollowUpError } =
    await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", conversation.id)
      .eq("sender", "bot")
      .eq("node_id", conversation.current_node_id)
      .eq(
        "metadata->>agentic_sales_follow_up_kind",
        AGENTIC_SALES_FOLLOW_UP_KIND
      )
      .eq("metadata->>agentic_sales_follow_up_for", latestAgenticBotMessageAt)
      .limit(1)
      .maybeSingle();

  if (existingFollowUpError) {
    console.error(
      "Timer cron: failed to query existing agentic sales follow-up",
      {
        conversationId: conversation.id,
        latestAgenticBotMessageAt,
        error: existingFollowUpError,
      }
    );
    return null;
  }

  return {
    latestAgenticBotMessageAt,
    latestContactMessageAt:
      (latestContactMessage as AgenticSalesFollowUpTimestampRow | null)
        ?.created_at || null,
    latestFollowUpAt:
      (latestFollowUp as AgenticSalesFollowUpTimestampRow | null)
        ?.created_at || null,
    alreadyFollowedUpForLatest: Boolean(existingFollowUp),
  };
}

async function acquireAgenticSalesFollowUpLock(
  supabase: ReturnType<typeof createServerClient>,
  conversation: AgenticSalesFollowUpConversationRow,
  nodeId: string,
  latestAgenticBotMessageAt: string
) {
  const { data, error } = await supabase
    .from("message_send_locks")
    .insert({
      conversation_id: conversation.id,
      organization_id: conversation.organization_id,
      kind: AGENTIC_SALES_FOLLOW_UP_KIND,
      target_message_at: latestAgenticBotMessageAt,
      node_id: nodeId,
    })
    .select("id")
    .single();

  if (error) {
    if (!isUniqueViolation(error)) {
      console.error(
        "Timer cron: failed to acquire agentic sales follow-up lock",
        {
          conversationId: conversation.id,
          latestAgenticBotMessageAt,
          error,
        }
      );
    }

    return null;
  }

  return (data as AgenticSalesFollowUpLockRow).id;
}

async function processAgenticSalesFollowUps(
  supabase: ReturnType<typeof createServerClient>
) {
  const cutoff = new Date(
    Date.now() - AGENTIC_SALES_FOLLOW_UP_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString();
  const lookback = new Date(
    Date.now() - AGENTIC_SALES_FOLLOW_UP_LOOKBACK_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, contact_phone, organization_id, subscription_status, subscription_plan, current_node_id, flow_variables, updated_at"
    )
    .eq("status", "paused")
    .not("current_node_id", "is", null)
    .gte("updated_at", lookback)
    .lte("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(30);

  if (error) {
    console.error(
      "Timer cron: failed to query post-PDF agentic sales follow-ups",
      error
    );
    return { processed: 0, skipped: 0, error: "Query failed" };
  }

  let processed = 0;
  let skipped = 0;

  for (const conversation of (conversations ||
    []) as AgenticSalesFollowUpConversationRow[]) {
    if (!conversation.contact_phone) {
      skipped++;
      continue;
    }

    const followUpState = await loadAgenticSalesFollowUpState(
      supabase,
      conversation,
      lookback
    );

    if (!followUpState) {
      skipped++;
      continue;
    }

    const followUpDecision = getAgenticSalesFollowUpDecisionFromState({
      conversation,
      ...followUpState,
    });

    if (!followUpDecision.shouldSend) {
      skipped++;
      continue;
    }

    const settings = await getOrganizationSettingsById(
      conversation.organization_id
    );
    const { config: metaConfig } = getMetaConfigFromSettings(settings);
    if (!metaConfig) {
      skipped++;
      continue;
    }

    const lockId = await acquireAgenticSalesFollowUpLock(
      supabase,
      conversation,
      followUpDecision.nodeId,
      followUpDecision.latestAgenticBotMessageAt
    );

    if (!lockId) {
      skipped++;
      continue;
    }

    try {
      const sent = await sendMetaWhatsAppTextMessage(
        {
          to: conversation.contact_phone,
          body: AGENTIC_SALES_FOLLOW_UP_MESSAGE,
        },
        metaConfig
      );

      await persistConversationMessage({
        supabase,
        conversationId: conversation.id,
        content: AGENTIC_SALES_FOLLOW_UP_MESSAGE,
        type: "text",
        sender: "bot",
        nodeId: followUpDecision.nodeId,
        waMessageId: sent.messageId,
        metadata: {
          agentic_sales_follow_up_for:
            followUpDecision.latestAgenticBotMessageAt,
          agentic_sales_follow_up_kind: AGENTIC_SALES_FOLLOW_UP_KIND,
          agentic_sales_follow_up_node_id: followUpDecision.nodeId,
          agentic_sales_follow_up_lock_id: lockId,
        },
      });

      processed++;
    } catch (followUpError) {
      skipped++;
      console.error(
        `Timer cron: failed to send post-PDF agentic sales follow-up for ${conversation.id}`,
        followUpError
      );
    }
  }

  return { processed, skipped };
}

/**
 * Cron endpoint that checks for expired waitTimer nodes.
 * Should be called every minute (e.g. via Vercel Cron or external service).
 *
 * GET /api/cron/timers
 */
export async function GET(request: Request) {
  const auth = validateCronAuthorization(request.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const supabase = createServerClient();

  // Find all conversations with expired timers
  const { data: expired, error } = await supabase
    .from("conversations")
    .select("id, contact_phone, organization_id")
    .eq("status", "paused")
    .not("timeout_at", "is", null)
    .lte("timeout_at", new Date().toISOString());

  if (error) {
    console.error("Timer cron: failed to query expired timers", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  console.log(`Timer cron: processing ${(expired || []).length} expired timer(s)`);

  let processed = 0;
  for (const conversation of expired || []) {
    try {
      const settings = await getOrganizationSettingsById(
        conversation.organization_id as string
      );
      const { config: metaConfig } = getMetaConfigFromSettings(settings);
      await resumeFlowOnTimeout(
        supabase,
        conversation.id,
        conversation.contact_phone,
        conversation.organization_id as string,
        metaConfig
      );
      processed++;
      console.log(`Timer cron: resumed conversation ${conversation.id} (no response)`);
    } catch (error) {
      console.error(
        `Timer cron: failed to resume conversation ${conversation.id}`,
        error
      );
    }
  }

  const paymentFollowUps = await processPendingPaymentFollowUps(supabase);
  const agenticSalesFollowUps = await processAgenticSalesFollowUps(supabase);
  const staleRunningFlows = await processStaleRunningFlowContinuations(supabase);

  return NextResponse.json({
    processed,
    total: (expired || []).length,
    paymentFollowUps,
    agenticSalesFollowUps,
    staleRunningFlows,
  });
}
