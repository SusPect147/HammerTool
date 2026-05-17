-- ========================================================
-- 🐛 SQL MIGRATION: BUG STATUS, MEDIA ATTACHMENTS & ADMIN REPLIES
-- Execute this SQL in your Supabase SQL Editor
-- ========================================================

BEGIN;

-- 1. Extend forum_messages table with status, attachments, and admin comments
ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unresolved' CHECK (status IN ('resolved', 'unresolved'));

ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.forum_messages 
ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT NULL;


-- 2. Create UPDATE policy to allow Hammer147 to manage status and reply comments
DROP POLICY IF EXISTS "Only Hammer147 can update forum messages" ON public.forum_messages;
CREATE POLICY "Only Hammer147 can update forum messages" 
ON public.forum_messages FOR UPDATE 
USING (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
)
WITH CHECK (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
);

COMMIT;
