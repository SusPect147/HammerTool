-- ==========================================
-- 🛡️ SQL MIGRATION: REPLIES, MAX LENGTHS & REALTIME REPLICATION
-- Execute this SQL in your Supabase Dashboard
-- ==========================================

BEGIN;

-- 1. SUPPORT FOR THREADED REPLIES IN MAP COMMENTS
-- Adds self-referential FK parent_id to enable visual threading
ALTER TABLE public.map_comments 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.map_comments(id) ON DELETE CASCADE;


-- 2. MAX CONTENT SIZE CONSTRAINTS (DDOS/DATA INJECTION PROTECTION)
-- Ensures a malicious hacker cannot post megabytes of random text payload to bloat your DB.
ALTER TABLE public.forum_messages 
DROP CONSTRAINT IF EXISTS forum_messages_content_length_check;

ALTER TABLE public.forum_messages 
ADD CONSTRAINT forum_messages_content_length_check 
CHECK (char_length(content) <= 2500);


ALTER TABLE public.map_comments 
DROP CONSTRAINT IF EXISTS map_comments_content_length_check;

ALTER TABLE public.map_comments 
ADD CONSTRAINT map_comments_content_length_check 
CHECK (char_length(content) <= 2500);

COMMIT;


-- 3. PROGRAMMATIC REALTIME BROADCAST ACTIVATION
-- Enrolls our application tables into Supabase Realtime CDC automatically.
-- This makes comments, replies and votes stream to everyone's browser INSTANTLY!
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'map_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.map_comments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'forum_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'map_comment_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.map_comment_votes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'forum_message_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_message_votes;
  END IF;
END $$;
