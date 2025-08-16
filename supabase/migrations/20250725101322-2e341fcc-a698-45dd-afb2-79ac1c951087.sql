-- Add placeholder user_id for existing comments with NULL user_id
UPDATE public.comments 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE user_id IS NULL;

-- Now make user_id NOT NULL
ALTER TABLE public.comments 
ALTER COLUMN user_id SET NOT NULL;