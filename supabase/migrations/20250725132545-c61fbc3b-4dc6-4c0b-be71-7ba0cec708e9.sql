-- Add platform column to posts table to distinguish FB from IG
ALTER TABLE public.posts 
ADD COLUMN platform text NOT NULL DEFAULT 'facebook';

-- Add platform column to comments table to distinguish FB from IG  
ALTER TABLE public.comments
ADD COLUMN platform text NOT NULL DEFAULT 'facebook';

-- Create index for better performance when filtering by platform
CREATE INDEX idx_posts_platform ON public.posts(platform);
CREATE INDEX idx_comments_platform ON public.comments(platform);