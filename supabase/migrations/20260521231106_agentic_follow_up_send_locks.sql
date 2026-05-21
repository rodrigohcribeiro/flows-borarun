create table if not exists public.message_send_locks (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  kind text not null,
  target_message_at timestamptz not null,
  node_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists message_send_locks_conversation_kind_target_idx
  on public.message_send_locks(conversation_id, kind, target_message_at);

create index if not exists message_send_locks_created_at_idx
  on public.message_send_locks(created_at);

alter table public.message_send_locks enable row level security;

grant select, insert, update, delete on public.message_send_locks to service_role;
