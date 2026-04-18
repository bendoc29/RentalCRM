-- Migration: Remove "Conversation Active" from stage enum (it was stage index 4)
-- stage is a plain integer column — no Postgres ENUM manipulation needed.
-- Apply via Supabase SQL Editor.

-- Step 1: Contacts currently at stage 4 ("Conversation Active") → stage 3 ("Replied")
--         and flag them as conversation_active = TRUE so they're not lost.
--         Fallback to "Replied" is the best fit: they're in active dialogue,
--         just haven't yielded full Insight Captured yet. Spot-check these afterwards.
UPDATE public.contacts
SET conversation_active = TRUE,
    stage = 3
WHERE stage = 4;

-- Step 2: Close the gap — shift all stages >= 5 down by 1.
--         Before: 5=Insight Captured, 6=Follow-Up Later, 7=Beta Candidate, etc.
--         After:  4=Insight Captured, 5=Follow-Up Later, 6=Beta Candidate, etc.
UPDATE public.contacts
SET stage = stage - 1
WHERE stage >= 5;
