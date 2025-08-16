-- Fix data isolation issues: handle non-UUID values and add remaining constraints

-- 1. First, let's add the missing foreign key constraints that don't require data conversion
ALTER TABLE public.pages 
  ADD CONSTRAINT fk_pages_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.persona_profiles 
  ADD CONSTRAINT fk_persona_profiles_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.prompt_configurations 
  ADD CONSTRAINT fk_prompt_configurations_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update the posts table to have proper user_id constraint
ALTER TABLE public.posts 
  ADD CONSTRAINT fk_posts_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update comments table
ALTER TABLE public.comments 
  ADD CONSTRAINT fk_comments_user_id 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add indexes for better performance on user_id columns
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages(user_id);
CREATE INDEX IF NOT EXISTS idx_persona_profiles_user_id ON public.persona_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_configurations_user_id ON public.prompt_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- 3. For the problematic tables, let's handle them differently by creating new clean tables
-- and migrating only valid data

-- Handle conversation_memory with a clean approach
CREATE TABLE public.conversation_memory_new (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL,
  post_id text,
  tools_used text[],
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.conversation_memory_new ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policy
CREATE POLICY "Users can manage their own conversation memory" 
ON public.conversation_memory_new 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Handle user_memory_profile with a clean approach
CREATE TABLE public.user_memory_profile_new (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  user_name text,
  preferences jsonb DEFAULT '{}'::jsonb,
  interaction_count integer DEFAULT 0,
  first_interaction timestamp with time zone DEFAULT now(),
  last_interaction timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE public.user_memory_profile_new ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policy
CREATE POLICY "Users can manage their own memory profile" 
ON public.user_memory_profile_new 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Create a function to ensure data ownership validation
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