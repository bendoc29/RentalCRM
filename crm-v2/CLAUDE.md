# CLAUDE.md — FounderCRM (RentalCRM)

This file gives Claude Code persistent context for this repository. Read it at the start of every session before making changes.

---

## What this is

**FounderCRM** — a lightweight internal CRM built by Ben ("BDoc") and used by both co-founders of **OvrSee** (a B2B SaaS platform for short-term rental property managers) to track sales leads, conversations, and pipeline.

- **Users:** Ben Doherty (BDoc) and Jack Kearns. Two users only. No external customers use this tool.
- **Purpose:** Track STR property management leads through the sales funnel. Owners (BDoc/Kearns) log leads, notes, follow-ups, and outreach messages.
- **Relationship to OvrSee:** This is an internal tool, not part of the OvrSee product. The OvrSee codebase is a separate repo (`bendoc29/rentr`, Turborepo monorepo).

---

## Stack

- **Framework:** Next.js 14 (Pages Router — note: `pages/` directory, not `app/`)
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (Postgres + Auth + RLS)
- **AI:** Claude API (`claude-opus-4-6`) for the message generator feature
- **Deployment:** Vercel (auto-deploys on push to `main`)
- **Repo:** `bendoc29/RentalCRM` on GitHub. App lives in the `crm-v2/` subdirectory.

---

## Project structure

```
crm-v2/
├── components/          # React components
├── lib/                 # Supabase client, helpers, API utilities
├── pages/               # Next.js pages and API routes
├── styles/              # Global CSS / Tailwind
├── supabase-schema.sql  # Canonical schema (source of truth for DB structure)
├── next.config.js
├── tailwind.config.js
└── package.json
```

**Always read `supabase-schema.sql` before making schema-related changes** — it's the canonical reference for tables, columns, RLS policies, and indexes.

---

## Data model (core concepts)

- **Leads** — the central entity. Each lead represents a prospective OvrSee customer (a property manager).
- **Owner field** — each lead is owned by either `BDoc` or `Kearns`. Rendered in the UI with distinct badges: **BDoc = blue**, **Kearns = pink**.
- **Status** — leads progress through pipeline stages (New, Qualified, Candidate Follow-up, Future Customer, etc. — check current schema for the exact enum).
- **Notes / conversations** — timestamped notes attached to leads, capturing outreach history and context.
- **RLS policies** — both Ben and Jack see **all leads** regardless of owner. The owner field is a display/attribution distinction, not an access control boundary.

---

## Supabase specifics

- Supabase project is separate from the OvrSee project (which is `vqchhohxlddgxwsafpyd`). The CRM has its own project — check `.env.local` or the Supabase dashboard for the project ref.
- RLS is enabled on all tables. Policies grant both authenticated users full access to the leads, notes, and related tables.
- **When adding migrations:** create a new `.sql` file following the naming convention already in use in `/supabase/migrations/` (if the folder exists) or append to `supabase-schema.sql` and note the change. Apply via the Supabase SQL Editor — Ben pastes SQL directly into the SQL Editor, same tab, cleared each time (no new tabs).
- **Never disable or weaken RLS** to fix a bug. If a query fails due to RLS, the fix is to correct the policy, not remove it.

---

## Conventions and working patterns

- **Owner badges:** BDoc blue, Kearns pink. Keep this consistent anywhere owner is displayed.
- **Status badges:** each status has its own colour — check existing components (`components/LeadRow.tsx` or similar) before introducing new colours.
- **Forms:** no HTML `<form>` tags in React components where it can be avoided — use `onClick` handlers on buttons.
- **Supabase queries:** always use `.maybeSingle()` rather than `.single()` when fetching a single row that may not exist, to avoid throwing on empty results.
- **Client-side state after mutations:** after inserting a row (e.g. a note), either refetch the list or optimistically update local state. Mutations that succeed but don't reflect in the UI are a recurring bug pattern in this codebase.

---

## Features currently built

- Lead list with owner filtering (BDoc / Kearns / All)
- Lead detail view with notes / conversation history
- Add note / update status / reassign owner
- AI-powered message generator (uses Claude API — currently has a bug, Jack has confirmed he doesn't use it, deprioritised)
- Auth via Supabase (Ben and Jack only — no self-serve signup)

---

## Known issues / priorities

- **Notes don't appear after being added** — insert succeeds but the UI doesn't update. Likely a missing refetch or state update post-mutation. Fix by either refetching the notes list or appending to local state after a successful insert.
- **Generate Message feature broken** — deprioritised by Jack. Do not fix unless explicitly asked.
- **"Conversation Active" flag** — pending feature. Boolean flag layered on top of status, rendered as a green "Active" badge on leads currently being messaged. Must be filterable.

---

## Deployment

- Push to `main` → Vercel auto-deploys.
- Supabase migrations are applied manually via the SQL Editor (not via CLI).
- Environment variables live in Vercel project settings. `.env.local` mirrors these for local dev.

---

## Communication style with Ben

- Concise. Show options rather than asking many clarifying questions before generating.
- Mega-prompts covering multiple phases are the norm — follow-up verification prompts catch any misses.
- Ben works late and moves fast. Prefer momentum over pausing on non-functional details.
- When done with a task, provide a verification checklist so Ben can confirm each item before moving on.

---

## Do NOT

- Touch the OvrSee product codebase from this repo. They are separate projects.
- Weaken or disable RLS to fix a bug.
- Introduce new status values or owner types without confirming with Ben first.
- Fix the Generate Message feature unless explicitly asked.
- Add external customer-facing auth flows — this is an internal tool for two users.
