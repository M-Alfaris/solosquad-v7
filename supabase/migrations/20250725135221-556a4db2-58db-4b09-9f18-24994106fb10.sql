-- Add parent_comment_id field to comments table for reply threading
ALTER TABLE public.comments 
ADD COLUMN parent_comment_id text REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for better performance when querying comment replies
CREATE INDEX idx_comments_parent_comment_id ON public.comments(parent_comment_id);