-- =============================================
-- STEP 1: Run this entire script in the
-- Supabase SQL Editor (left sidebar → SQL Editor)
-- =============================================

-- CONTACTS TABLE
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  prop_type text not null default 'Airbnb Host',
  portfolio text not null default '1 property',
  location text,
  stage integer not null default 0,
  source text,
  notes text,
  followup_date date,
  followup_reason text,
  flag_beta boolean not null default false,
  flag_interested boolean not null default false,
  flag_followup boolean not null default false,
  flag_future_customer boolean not null default false,
  opp_score numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- CONVERSATIONS TABLE
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  type text not null default 'note',
  date date not null default current_date,
  message text,
  reply text,
  notes text,
  created_at timestamptz default now()
);

-- PROBLEMS TABLE
create table public.problems (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'Operations',
  severity integer not null default 3 check (severity between 1 and 5),
  frequency text not null default 'Occasionally',
  wtp text not null default 'Unknown',
  workaround text,
  quote text,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (keeps each user's data private)
-- =============================================

alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.problems enable row level security;

-- Contacts: users only see their own
create policy "Users see own contacts" on public.contacts
  for all using (auth.uid() = user_id);

-- Conversations: users see convos for their own contacts
create policy "Users see own conversations" on public.conversations
  for all using (
    exists (
      select 1 from public.contacts
      where contacts.id = conversations.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- Problems: users see problems for their own contacts
create policy "Users see own problems" on public.problems
  for all using (
    contact_id is null or
    exists (
      select 1 from public.contacts
      where contacts.id = problems.contact_id
      and contacts.user_id = auth.uid()
    )
  );

-- =============================================
-- INDEXES for performance
-- =============================================
create index on public.contacts(user_id);
create index on public.contacts(stage);
create index on public.contacts(followup_date);
create index on public.conversations(contact_id);
create index on public.problems(contact_id);
create index on public.problems(severity desc);
