-- FounderCRM v2 — Full Schema
-- Run this in Supabase SQL Editor
-- If upgrading from v1: the new columns will be added, existing data preserved

-- ─── CONTACTS (extended) ───────────────────────────────────────────────────
create table if not exists public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Identity
  name text not null,
  business_name text,
  role text,
  email text,
  phone text,
  linkedin text,

  -- Property / business context
  prop_type text not null default 'Airbnb Host',
  portfolio text not null default '1 property',
  location text,

  -- Outreach
  source text,
  outreach_channel text default 'Email',
  stage integer not null default 0,
  relationship_warmth text default 'Cold',

  -- Notes
  notes text,

  -- Follow-up
  followup_date date,
  followup_reason text,
  followup_priority text default 'Medium',

  -- Future commercial
  future_fit text default 'Research Only',
  wtp_estimate text default 'Unknown',
  opp_score numeric not null default 0,
  re_engagement_angle text,

  -- Owner (BDoc or Kearns — display/attribution only, not access control)
  owner text not null default 'Kearns',

  -- Flags
  flag_beta boolean not null default false,
  flag_interested boolean not null default false,
  flag_followup boolean not null default false,
  flag_future_customer boolean not null default false,
  conversation_active boolean not null default false,

  created_at timestamptz default now(),
  updated_at timestamptz
);

-- ─── CONVERSATIONS (extended) ──────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text not null default 'note',
  channel text default 'Email',
  date date not null default current_date,
  message text,
  reply text,
  notes text,
  sentiment text default 'Neutral',
  next_step text,
  created_at timestamptz default now()
);

-- ─── PROBLEMS (extended) ───────────────────────────────────────────────────
create table if not exists public.problems (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'Operations',
  severity integer not null default 3 check (severity between 1 and 5),
  urgency integer default 3 check (urgency between 1 and 5),
  frequency text not null default 'Occasionally',
  wtp text not null default 'Unknown',
  workaround text,
  quote text,
  business_impact text,
  product_relevance text,
  created_at timestamptz default now()
);

-- ─── GENERATED MESSAGES (new) ──────────────────────────────────────────────
create table if not exists public.generated_messages (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  message_type text not null,
  draft_output text,
  edited_output text,
  context_snapshot jsonb,
  created_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────────────────
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.problems enable row level security;
alter table public.generated_messages enable row level security;

-- Drop old policies if they exist (safe to run)
drop policy if exists "Users see own contacts" on public.contacts;
drop policy if exists "Users see own conversations" on public.conversations;
drop policy if exists "Users see own problems" on public.problems;

-- Contacts
create policy "Users manage own contacts" on public.contacts
  for all using (auth.uid() = user_id);

-- Conversations (via contact ownership)
create policy "Users manage own conversations" on public.conversations
  for all using (
    exists (select 1 from public.contacts where contacts.id = conversations.contact_id and contacts.user_id = auth.uid())
  );

-- Problems
create policy "Users manage own problems" on public.problems
  for all using (
    contact_id is null or
    exists (select 1 from public.contacts where contacts.id = problems.contact_id and contacts.user_id = auth.uid())
  );

-- Generated messages
create policy "Users manage own messages" on public.generated_messages
  for all using (
    exists (select 1 from public.contacts where contacts.id = generated_messages.contact_id and contacts.user_id = auth.uid())
  );

-- ─── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists idx_contacts_user on public.contacts(user_id);
create index if not exists idx_contacts_conversation_active on public.contacts(conversation_active) where conversation_active = true;
create index if not exists idx_contacts_stage on public.contacts(stage);
create index if not exists idx_contacts_followup on public.contacts(followup_date);
create index if not exists idx_conversations_contact on public.conversations(contact_id);
create index if not exists idx_problems_contact on public.problems(contact_id);
create index if not exists idx_problems_severity on public.problems(severity desc);
create index if not exists idx_messages_contact on public.generated_messages(contact_id);
