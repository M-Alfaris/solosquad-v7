-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_profile_created_at ON public.user_memory_profile USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memory_profile_last_interaction ON public.user_memory_profile USING btree (last_interaction DESC);

-- Add user access token field to profiles table for Facebook API calls
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_access_token TEXT;

-- Create index for better lookups
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at DESC);

-- Ensure created_at fields have proper defaults where missing
-- conversation_memory already has default now()
-- user_memory_profile already has default now() 
-- posts has created_at but let's ensure it's properly set

-- Add comment for clarity on user_access_token usage
COMMENT ON COLUMN public.profiles.user_access_token IS 'Facebook user access token for API calls to retrieve user pages and data';