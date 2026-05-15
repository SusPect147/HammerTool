-- ==========================================
-- 🚀 SQL MIGRATION FOR COMMENTS & FORUM
-- Execute this SQL in your Supabase Dashboard
-- ==========================================

-- 1. Create map_comments table
CREATE TABLE IF NOT EXISTS public.map_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    map_id UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'Anonymous',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.map_comments ENABLE ROW LEVEL SECURITY;

-- 2. Create forum_messages table
CREATE TABLE IF NOT EXISTS public.forum_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT 'Anonymous',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.forum_messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for map_comments
-- Anyone (public) can read comments
DROP POLICY IF EXISTS "Anyone can view map comments" ON public.map_comments;
CREATE POLICY "Anyone can view map comments" 
ON public.map_comments FOR SELECT 
USING (true);

-- Anyone can post comments (both authenticated and anonymous)
DROP POLICY IF EXISTS "Anyone can post map comments" ON public.map_comments;
CREATE POLICY "Anyone can post map comments" 
ON public.map_comments FOR INSERT 
WITH CHECK (true);

-- Only Hammer147 can delete comments
DROP POLICY IF EXISTS "Only Hammer147 can delete map comments" ON public.map_comments;
CREATE POLICY "Only Hammer147 can delete map comments" 
ON public.map_comments FOR DELETE 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'sub') = '704666891276517437' OR
    (auth.jwt() -> 'user_metadata' ->> 'provider_id') = '704666891276517437'
);

-- 4. RLS Policies for forum_messages
-- Anyone can read forum wall
DROP POLICY IF EXISTS "Anyone can view forum messages" ON public.forum_messages;
CREATE POLICY "Anyone can view forum messages" 
ON public.forum_messages FOR SELECT 
USING (true);

-- Anyone can post to forum wall
DROP POLICY IF EXISTS "Anyone can post forum messages" ON public.forum_messages;
CREATE POLICY "Anyone can post forum messages" 
ON public.forum_messages FOR INSERT 
WITH CHECK (true);

-- Only Hammer147 can delete forum messages
DROP POLICY IF EXISTS "Only Hammer147 can delete forum messages" ON public.forum_messages;
CREATE POLICY "Only Hammer147 can delete forum messages" 
ON public.forum_messages FOR DELETE 
USING (
    (auth.jwt() -> 'user_metadata' ->> 'sub') = '704666891276517437' OR
    (auth.jwt() -> 'user_metadata' ->> 'provider_id') = '704666891276517437'
);

-- 5. Update policy for maps to allow Hammer147 to edit all maps
DROP POLICY IF EXISTS "Hammer147 can update maps" ON public.maps;
CREATE POLICY "Hammer147 can update maps" 
ON public.maps FOR UPDATE 
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'sub') = '704666891276517437' OR
    (auth.jwt() -> 'user_metadata' ->> 'provider_id') = '704666891276517437'
)
WITH CHECK (true);
