-- Migration: Change owner default to Kearns and reassign existing BDoc leads
-- Apply via Supabase SQL Editor

ALTER TABLE public.contacts ALTER COLUMN owner SET DEFAULT 'Kearns';
UPDATE public.contacts SET owner = 'Kearns' WHERE owner = 'BDoc';
