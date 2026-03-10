# FounderCRM v2 — with Supabase Auth + Database

Full Next.js CRM with cloud database, email login, and per-user data isolation.

---

## Setup (do this once)

### 1. Run the database schema in Supabase
- Go to your Supabase project → SQL Editor (left sidebar)
- Open `supabase-setup.sql` from this folder
- Paste the entire contents and click **Run**

### 2. Add environment variables to Vercel
In your Vercel project → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL` → your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase Anon Key

### 3. Push to GitHub → Vercel auto-deploys

---

## Local development

```bash
# Copy env file and fill in your values
cp .env.local.example .env.local

npm install
npm run dev
```

---

## How auth works
- Each user signs up with email + password
- Supabase sends a confirmation email
- After confirming, they can log in
- **Row Level Security** ensures each user only ever sees their own contacts, conversations, and problems

---

## Project structure

```
pages/
  _app.js          # Auth wrapper — redirects to login if not signed in
  login.js         # Sign in / Sign up page
  index.js         # Dashboard
  pipeline.js      # Kanban pipeline
  problems.js      # All problems list
  insights.js      # Aggregation + demand signals
  followups.js     # Follow-up scheduler
  contacts/
    index.js       # Contacts table
    [id].js        # Contact profile (conversations + problems)
components/
  Layout.js        # Sidebar + nav
  ContactModal.js  # Add/edit contact form
lib/
  supabase.js      # Supabase client
  helpers.js       # Shared constants + utility components
styles/
  globals.css      # Design system
supabase-setup.sql # Run this once in Supabase SQL Editor
```
