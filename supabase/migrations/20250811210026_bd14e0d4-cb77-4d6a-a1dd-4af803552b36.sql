-- Create enum for user roles
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('follower', 'ai_agent', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add a temporary column with the new enum type
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS role_new user_role_type;

-- Update the new column based on existing role values
UPDATE public.comments 
SET role_new = CASE 
    WHEN role = 'user' THEN 'follower'::user_role_type
    WHEN role = 'ai_agent' THEN 'ai_agent'::user_role_type
    ELSE 'follower'::user_role_type
END;

-- Set default for new column
ALTER TABLE public.comments ALTER COLUMN role_new SET DEFAULT 'follower'::user_role_type;
ALTER TABLE public.comments ALTER COLUMN role_new SET NOT NULL;

-- Drop the old column and rename the new one
ALTER TABLE public.comments DROP COLUMN role;
ALTER TABLE public.comments RENAME COLUMN role_new TO role;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_role ON public.comments(role);
CREATE INDEX IF NOT EXISTS idx_comments_source_channel ON public.comments(source_channel);

-- Add similar role system to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS user_role user_role_type DEFAULT 'follower'::user_role_type;

-- Add index for chat_sessions role
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_role ON public.chat_sessions(user_role);