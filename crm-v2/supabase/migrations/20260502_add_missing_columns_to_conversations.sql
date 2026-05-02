-- Add columns required by the conversation import flow
-- These were referenced in the insert but missing from the live schema

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'Neutral';
