-- Add fb_uid and ig_uid columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fb_uid text,
ADD COLUMN IF NOT EXISTS ig_uid text;

-- Update RLS policies with proper type casting
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
CREATE POLICY "Users can view their own posts" ON public.posts
FOR SELECT USING (
  user_id = auth.uid() OR 
  id IN (
    SELECT p.id FROM public.posts p
    JOIN public.profiles pr ON (
      (p.platform = 'facebook' AND pr.fb_uid = p.user_id::text) OR 
      (p.platform = 'instagram' AND pr.ig_uid = p.user_id::text)
    )
    WHERE pr.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view their own comments" ON public.comments;
CREATE POLICY "Users can view their own comments" ON public.comments
FOR SELECT USING (
  user_id = auth.uid() OR
  post_id IN (
    SELECT p.id FROM public.posts p
    JOIN public.profiles pr ON (
      (p.platform = 'facebook' AND pr.fb_uid = p.user_id::text) OR 
      (p.platform = 'instagram' AND pr.ig_uid = p.user_id::text)
    )
    WHERE pr.id = auth.uid()
  )
);