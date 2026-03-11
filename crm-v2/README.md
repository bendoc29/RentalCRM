# FounderCRM v2

Pre-sales outreach CRM with AI message generation. Built for founders doing customer discovery before their product is ready to sell.

## Setup

### 1. Supabase — run the schema
Go to Supabase → SQL Editor → paste and run `supabase-schema.sql`

### 2. Vercel — add environment variables
Add these in Vercel → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `ANTHROPIC_API_KEY` ← new in v2, needed for message generation

### 3. Push to GitHub → Vercel auto-deploys

## Getting your Anthropic API key
1. Go to console.anthropic.com
2. Sign up / log in
3. API Keys → Create Key
4. Add as `ANTHROPIC_API_KEY` in Vercel env vars

## Local dev
```bash
cp .env.local.example .env.local
# Fill in your keys
npm install
npm run dev
```

## What's new in v2
- 10-stage pipeline (vs 6 in v1)
- AI message generation with 6 message types
- Richer contact profiles with re-engagement angle
- Problem database with urgency + business impact
- Follow-up queue with overdue alerts and last-interaction preview
- Generated message history saved per contact
- Better insights with demand scoring
- Contact filters (warm leads, beta, overdue, etc.)
