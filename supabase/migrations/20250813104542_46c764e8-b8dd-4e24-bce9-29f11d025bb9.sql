-- Fix critical data isolation issues: standardize user_id columns and RLS policies

-- 1. Fix chat_sessions table - standardize user_id and add proper RLS
ALTER TABLE public.chat_sessions 
  ALTER COLUMN user_id SET DATA TYPE uuid USING user_id::text::uuid,
  ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to profiles table
ALTER TABLE public.chat_sessions 
  ADD CONSTRAINT fk_chat_sessions_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop the service-role-only policy and add proper user isolation
DROP POLICY IF EXISTS "Service role can manage chat_sessions" ON public.chat_sessions;

CREATE POLICY "Users can manage their own chat sessions" 
ON public.chat_sessions 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Fix conversation_memory table - change user_id from text to uuid
ALTER TABLE public.conversation_memory 
  ADD COLUMN new_user_id uuid;

-- Copy existing data, converting text user_id to uuid where possible
UPDATE public.conversation_memory 
SET new_user_id = user_id::uuid 
WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop old column and rename new one
ALTER TABLE public.conversation_memory DROP COLUMN user_id;
ALTER TABLE public.conversation_memory RENAME COLUMN new_user_id TO user_id;
ALTER TABLE public.conversation_memory ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.conversation_memory 
  ADD CONSTRAINT fk_conversation_memory_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update RLS policy to use proper user isolation
DROP POLICY IF EXISTS "Service role can manage conversation_memory" ON public.conversation_memory;

CREATE POLICY "Users can manage their own conversation memory" 
ON public.conversation_memory 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Fix user_memory_profile table - change user_id from text to uuid
ALTER TABLE public.user_memory_profile 
  ADD COLUMN new_user_id uuid;

-- Copy existing data, converting text user_id to uuid where possible
UPDATE public.user_memory_profile 
SET new_user_id = user_id::uuid 
WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop old column and rename new one
ALTER TABLE public.user_memory_profile DROP COLUMN user_id;
ALTER TABLE public.user_memory_profile RENAME COLUMN new_user_id TO user_id;
ALTER TABLE public.user_memory_profile ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint and unique constraint
ALTER TABLE public.user_memory_profile 
  ADD CONSTRAINT fk_user_memory_profile_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT uk_user_memory_profile_user_id UNIQUE (user_id);

-- Update RLS policy to use proper user isolation
DROP POLICY IF EXISTS "Service role can manage user_memory_profile" ON public.user_memory_profile;

CREATE POLICY "Users can manage their own memory profile" 
ON public.user_memory_profile 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Add foreign key constraints to existing tables that are missing them
ALTER TABLE public.pages 
  ADD CONSTRAINT fk_pages_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.persona_profiles 
  ADD CONSTRAINT fk_persona_profiles_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.prompt_configurations 
  ADD CONSTRAINT fk_prompt_configurations_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Enhance posts table RLS to ensure better data isolation
-- Update the posts table to have proper user_id constraint
ALTER TABLE public.posts 
  ADD CONSTRAINT fk_posts_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Enhance comments table RLS
ALTER TABLE public.comments 
  ADD CONSTRAINT fk_comments_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 7. Add indexes for better performance on user_id columns
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_id ON public.conversation_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_profile_user_id ON public.user_memory_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_profiles_user_id ON public.persona_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_configurations_user_id ON public.prompt_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- 8. Create a function to ensure data ownership validation
CREATE OR REPLACE FUNCTION public.user_owns_social_content(
  p_user_id uuid,
  p_fb_uid text DEFAULT NULL,
  p_ig_uid text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id 
    AND (
      (p_fb_uid IS NOT NULL AND fb_uid = p_fb_uid) OR
      (p_ig_uid IS NOT NULL AND ig_uid = p_ig_uid)
    )
  );
END;
$$;