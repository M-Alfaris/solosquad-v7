-- Add placeholder user_id for existing comments with NULL user_id
UPDATE public.comments 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE user_id IS NULL;

-- Now make user_id NOT NULL
ALTER TABLE public.comments 
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to auth.users
ALTER TABLE public.comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;