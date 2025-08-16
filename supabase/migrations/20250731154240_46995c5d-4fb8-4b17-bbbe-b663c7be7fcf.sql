-- Fix infinite recursion in RLS policies by using security definer functions

-- Create security definer function to check if user owns posts
CREATE OR REPLACE FUNCTION public.user_owns_posts(post_ids text[])
RETURNS TABLE(id text) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM posts p
  JOIN profiles pr ON (
    ((p.platform = 'facebook' AND pr.fb_uid = p.user_id::text) OR 
     (p.platform = 'instagram' AND pr.ig_uid = p.user_id::text))
  )
  WHERE pr.id = auth.uid() AND p.id = ANY(post_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create security definer function to check if user can access specific post
CREATE OR REPLACE FUNCTION public.user_can_access_post(post_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM posts p
    JOIN profiles pr ON (
      ((p.platform = 'facebook' AND pr.fb_uid = p.user_id::text) OR 
       (p.platform = 'instagram' AND pr.ig_uid = p.user_id::text))
    )
    WHERE pr.id = auth.uid() AND p.id = post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own comments" ON public.comments;

-- Create new posts policies using security definer functions
CREATE POLICY "Users can view their own posts" ON public.posts
FOR SELECT USING (
  (user_id = auth.uid()) OR 
  (id IN (SELECT public.user_owns_posts(ARRAY[posts.id])))
);

-- Create new comments policies using security definer functions  
CREATE POLICY "Users can view their own comments" ON public.comments
FOR SELECT USING (
  (user_id = auth.uid()) OR 
  public.user_can_access_post(post_id)
);