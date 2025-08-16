-- Fix multi-tenancy issues and standardize database architecture

-- 1. Fix chat_sessions table to use proper UUID user_id
ALTER TABLE public.chat_sessions 
DROP COLUMN user_id;

ALTER TABLE public.chat_sessions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to tables that lack proper multi-tenancy
ALTER TABLE public.detected_intents 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cron_logs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.error_logs 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update RLS policies for chat_sessions to be consistent
DROP POLICY IF EXISTS "Service role can manage chat_sessions" ON public.chat_sessions;

CREATE POLICY "Users can manage their own chat sessions" 
ON public.chat_sessions 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all chat sessions" 
ON public.chat_sessions 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Add RLS policies for detected_intents  
CREATE POLICY "Users can view their own detected intents" 
ON public.detected_intents 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all detected intents" 
ON public.detected_intents 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Keep error_logs and cron_logs as service-only for now
-- (These are typically system-level logs that users shouldn't access directly)

-- 6. Add performance indexes for the new user_id columns
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_detected_intents_user_id ON public.detected_intents(user_id);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_cron_logs_user_id ON public.cron_logs(user_id);