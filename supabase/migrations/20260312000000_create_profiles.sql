-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    relation TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    birth_time TEXT NOT NULL,
    bazi TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profiles"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
    ON public.user_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Update memories and chat_logs to also store user_id
-- We add user_id to these tables to ensure strict isolation
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS for other tables
DROP POLICY IF EXISTS "Allow public read access" ON public.memories;
DROP POLICY IF EXISTS "Allow public insert access" ON public.memories;
CREATE POLICY "Users can view their own memories" ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own memories" ON public.memories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read access" ON public.chat_logs;
DROP POLICY IF EXISTS "Allow public insert access" ON public.chat_logs;
CREATE POLICY "Users can view their own chat logs" ON public.chat_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat logs" ON public.chat_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow public read access" ON public.reports;
DROP POLICY IF EXISTS "Allow public insert access" ON public.reports;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wait, for backward compatibility or simple local migration, since we're using a single Supabase project
-- Let's just create a script to apply this using the admin key.
