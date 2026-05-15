-- ==========================================
-- 🛡️ SQL MIGRATION: VOTING SYSTEM & SECURITY HARDENING
-- Execute this SQL in your Supabase Dashboard
-- ==========================================

-- 1. HARDEN EXISTING ADMIN POLICIES
-- We replace user_metadata metadata checks with explicit checking of the verified user UUID ('cc1e4139-e600-45e8-88f0-922e0fb69998')

-- A. Harden map_comments delete policy
DROP POLICY IF EXISTS "Only Hammer147 can delete map comments" ON public.map_comments;
CREATE POLICY "Only Hammer147 can delete map comments" 
ON public.map_comments FOR DELETE 
USING (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
);

-- B. Harden forum_messages delete policy
DROP POLICY IF EXISTS "Only Hammer147 can delete forum messages" ON public.forum_messages;
CREATE POLICY "Only Hammer147 can delete forum messages" 
ON public.forum_messages FOR DELETE 
USING (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
);

-- C. Harden maps update policy
DROP POLICY IF EXISTS "Hammer147 can update maps" ON public.maps;
CREATE POLICY "Hammer147 can update maps" 
ON public.maps FOR UPDATE 
TO authenticated
USING (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
)
WITH CHECK (
    auth.uid() = 'cc1e4139-e600-45e8-88f0-922e0fb69998'
);


-- 2. CREATE VOTING TABLES FOR FORUM AND COMMENTS

-- A. Create forum_message_votes table
CREATE TABLE IF NOT EXISTS public.forum_message_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.forum_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(message_id, user_id) -- Enforces one vote per user per message
);

-- B. Create map_comment_votes table
CREATE TABLE IF NOT EXISTS public.map_comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.map_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(comment_id, user_id) -- Enforces one vote per user per comment
);


-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.forum_message_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_comment_votes ENABLE ROW LEVEL SECURITY;


-- 4. RLS POLICIES FOR forum_message_votes

-- Read votes: Anyone can read vote counts
DROP POLICY IF EXISTS "Anyone can view forum message votes" ON public.forum_message_votes;
CREATE POLICY "Anyone can view forum message votes" 
ON public.forum_message_votes FOR SELECT 
USING (true);

-- Write/Change votes: Users can only insert/modify their own votes
DROP POLICY IF EXISTS "Users can manage their own forum message votes" ON public.forum_message_votes;
CREATE POLICY "Users can manage their own forum message votes" 
ON public.forum_message_votes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- 5. RLS POLICIES FOR map_comment_votes

-- Read votes: Anyone can read vote counts
DROP POLICY IF EXISTS "Anyone can view map comment votes" ON public.map_comment_votes;
CREATE POLICY "Anyone can view map comment votes" 
ON public.map_comment_votes FOR SELECT 
USING (true);

-- Write/Change votes: Users can only insert/modify their own votes
DROP POLICY IF EXISTS "Users can manage their own map comment votes" ON public.map_comment_votes;
CREATE POLICY "Users can manage their own map comment votes" 
ON public.map_comment_votes FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
