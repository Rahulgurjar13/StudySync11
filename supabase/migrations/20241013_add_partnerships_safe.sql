-- Safe migration to add partnership features to existing database
-- This adds partnerships and shared resources without breaking existing data

-- Step 1: Add email column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster email lookups
DROP INDEX IF EXISTS idx_profiles_email;
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Step 2: Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    now(),
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN new;
END;
$$;

-- Step 3: Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND (p.email IS NULL OR p.email = '');

-- Step 4: Create partnerships table
CREATE TABLE IF NOT EXISTS public.partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user1_id, user2_id)
);

-- Step 5: Create shared resources table
CREATE TABLE IF NOT EXISTS public.shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  resource_type TEXT DEFAULT 'link' CHECK (resource_type IN ('link', 'file', 'note', 'image')),
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Add partnership columns to tasks table if they don't exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS partnership_id UUID REFERENCES public.partnerships(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS shared_with UUID REFERENCES auth.users(id);

-- Step 7: Enable RLS for new tables
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies for partnerships
DROP POLICY IF EXISTS "Users can view their partnerships" ON public.partnerships;
CREATE POLICY "Users can view their partnerships"
ON public.partnerships FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create partnerships" ON public.partnerships;
CREATE POLICY "Users can create partnerships"
ON public.partnerships FOR INSERT
WITH CHECK (auth.uid() = user1_id);

DROP POLICY IF EXISTS "Users can update their partnerships" ON public.partnerships;
CREATE POLICY "Users can update their partnerships"
ON public.partnerships FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Step 9: Create policies for shared resources
DROP POLICY IF EXISTS "Partners can view shared resources" ON public.shared_resources;
CREATE POLICY "Partners can view shared resources"
ON public.shared_resources FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partnerships p 
    WHERE p.id = partnership_id 
    AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Partners can create shared resources" ON public.shared_resources;
CREATE POLICY "Partners can create shared resources"
ON public.shared_resources FOR INSERT
WITH CHECK (
  auth.uid() = shared_by AND
  EXISTS (
    SELECT 1 FROM partnerships p 
    WHERE p.id = partnership_id 
    AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Partners can update shared resources" ON public.shared_resources;
CREATE POLICY "Partners can update shared resources"
ON public.shared_resources FOR UPDATE
USING (
  auth.uid() = shared_by OR
  EXISTS (
    SELECT 1 FROM partnerships p 
    WHERE p.id = partnership_id 
    AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Partners can delete shared resources" ON public.shared_resources;
CREATE POLICY "Partners can delete shared resources"
ON public.shared_resources FOR DELETE
USING (
  auth.uid() = shared_by OR
  EXISTS (
    SELECT 1 FROM partnerships p 
    WHERE p.id = partnership_id 
    AND (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  )
);

-- Step 10: Update tasks policies to include shared tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view their own and shared tasks" ON public.tasks;
CREATE POLICY "Users can view their own and shared tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() = user_id OR
  (is_shared = true AND partnership_id IN (
    SELECT p.id FROM partnerships p
    WHERE (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  ))
);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update shared tasks" ON public.tasks;
CREATE POLICY "Users can update shared tasks"
ON public.tasks FOR UPDATE
USING (
  auth.uid() = user_id OR
  (is_shared = true AND partnership_id IN (
    SELECT p.id FROM partnerships p
    WHERE (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
    AND p.status = 'accepted'
  ))
);

-- Step 11: Create indexes for better performance
DROP INDEX IF EXISTS idx_partnerships_users;
CREATE INDEX idx_partnerships_users ON public.partnerships(user1_id, user2_id);

DROP INDEX IF EXISTS idx_shared_resources_partnership;
CREATE INDEX idx_shared_resources_partnership ON public.shared_resources(partnership_id);

DROP INDEX IF EXISTS idx_tasks_partnership;
CREATE INDEX idx_tasks_partnership ON public.tasks(partnership_id, is_shared) WHERE partnership_id IS NOT NULL;

-- Step 12: Enable realtime for new tables (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'partnerships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partnerships;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'shared_resources'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_resources;
  END IF;
END $$;
