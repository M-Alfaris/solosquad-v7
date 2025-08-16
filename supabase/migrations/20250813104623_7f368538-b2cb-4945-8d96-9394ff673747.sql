-- Fix critical data isolation issues: step-by-step approach to handle defaults

-- 1. Fix chat_sessions table - first remove default, then change type
ALTER TABLE public.chat_sessions 
  ALTER COLUMN user_id DROP DEFAULT;

ALTER TABLE public.chat_sessions 
  ALTER COLUMN user_id SET DATA TYPE uuid USING user_id::text::uuid;

ALTER TABLE public.chat_sessions 
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