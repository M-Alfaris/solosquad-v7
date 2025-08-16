-- Remove the foreign key constraint from posts table since Facebook posts 
-- don't necessarily belong to authenticated users in our system
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

-- Make user_id nullable since Facebook posts might not have associated app users
ALTER TABLE public.posts ALTER COLUMN user_id DROP NOT NULL;

-- Do the same for comments table
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.comments ALTER COLUMN user_id DROP NOT NULL;