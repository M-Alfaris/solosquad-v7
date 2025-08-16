-- Update the comments table to use more specific roles
-- First, let's see what roles we currently have and update them

-- Add a new enum for user roles if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('follower', 'ai_agent', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the role column to use the new enum
ALTER TABLE public.comments 
ALTER COLUMN role TYPE user_role_type USING role::user_role_type;

-- Update existing 'user' roles to 'follower' for clarity
UPDATE public.comments 
SET role = 'follower' 
WHERE role = 'user';

-- Add an index for better performance on role queries
CREATE INDEX IF NOT EXISTS idx_comments_role ON public.comments(role);
CREATE INDEX IF NOT EXISTS idx_comments_source_channel ON public.comments(source_channel);

-- Add a similar role system to chat_sessions for consistency
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS user_role user_role_type DEFAULT 'follower';

-- Add index for chat_sessions role
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_role ON public.chat_sessions(user_role);