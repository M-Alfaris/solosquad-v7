-- Add media_url column to posts table
ALTER TABLE public.posts 
ADD COLUMN media_url TEXT DEFAULT 'text only';

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-media', 'post-media', true);

-- Create storage policies for post media
CREATE POLICY "Public can view post media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-media');

CREATE POLICY "Service role can upload post media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "Service role can update post media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'post-media');

CREATE POLICY "Service role can delete post media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'post-media');