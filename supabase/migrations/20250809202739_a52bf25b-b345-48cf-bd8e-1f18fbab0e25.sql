-- 1) Cache media analysis on posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS media_analysis jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) Federated Persona Layer: persona_profiles table
CREATE TABLE IF NOT EXISTS public.persona_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_instructions text,
  business_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  personal_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT persona_profiles_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can manage their own persona profile
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'persona_profiles' 
      AND policyname = 'Users can view their persona profiles'
  ) THEN
    CREATE POLICY "Users can view their persona profiles"
      ON public.persona_profiles
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'persona_profiles' 
      AND policyname = 'Users can insert their persona profiles'
  ) THEN
    CREATE POLICY "Users can insert their persona profiles"
      ON public.persona_profiles
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'persona_profiles' 
      AND policyname = 'Users can update their persona profiles'
  ) THEN
    CREATE POLICY "Users can update their persona profiles"
      ON public.persona_profiles
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Optional: DELETE policy (allow users to delete their persona profile)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'persona_profiles' 
      AND policyname = 'Users can delete their persona profiles'
  ) THEN
    CREATE POLICY "Users can delete their persona profiles"
      ON public.persona_profiles
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Trigger to maintain updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_persona_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_persona_profiles_updated_at
      BEFORE UPDATE ON public.persona_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;