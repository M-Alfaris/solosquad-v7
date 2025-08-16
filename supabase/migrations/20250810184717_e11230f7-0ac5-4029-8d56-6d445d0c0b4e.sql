-- 1) Add channel awareness columns
-- chat_sessions.channel_type: dm | comment | story_reply | ...
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS channel_type text NOT NULL DEFAULT 'dm';

-- comments.source_channel: facebook_comment | instagram_comment | linkedin_comment | ...
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS source_channel text NOT NULL DEFAULT 'facebook_comment';

-- 2) Create detected_intents table
CREATE TABLE IF NOT EXISTS public.detected_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id text NOT NULL, -- Link to comment id or chat_session id (DM)
  intents jsonb NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["product_question", "support_request"]
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"product_question": 0.9}
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and add service role policy similar to other system tables
ALTER TABLE public.detected_intents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'detected_intents' AND policyname = 'Service role can manage detected_intents'
  ) THEN
    CREATE POLICY "Service role can manage detected_intents"
    ON public.detected_intents
    FOR ALL
    USING (true);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_detected_intents_input_id ON public.detected_intents (input_id);
CREATE INDEX IF NOT EXISTS idx_detected_intents_created_at ON public.detected_intents (created_at);
