-- Migration: Add conversation_active flag to contacts
-- Apply via Supabase SQL Editor

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS conversation_active BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_contacts_conversation_active ON public.contacts(conversation_active) WHERE conversation_active = TRUE;
