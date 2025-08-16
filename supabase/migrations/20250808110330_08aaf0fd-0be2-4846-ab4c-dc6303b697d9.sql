-- 1) Schema fixes: add social_user_id to posts and created_at defaults
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS social_user_id text;
ALTER TABLE public.posts ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.comments ALTER COLUMN created_at SET DEFAULT now();

-- 2) Add/refresh updated_at triggers where useful
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pages_updated_at ON public.pages;
CREATE TRIGGER trg_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Performance: add useful indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_social_user_id ON public.posts USING btree (social_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments USING btree (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_id ON public.conversation_memory USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_conversation_id ON public.conversation_memory USING btree (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_created_at ON public.conversation_memory USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_fb_uid ON public.profiles USING btree (fb_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_ig_uid ON public.profiles USING btree (ig_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at DESC);

-- 4) Fix ownership logic functions to use social_user_id
CREATE OR REPLACE FUNCTION public.user_owns_posts(post_ids text[])
RETURNS TABLE(id text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM public.posts p
  JOIN public.profiles pr ON (
    ((p.platform = 'facebook' AND pr.fb_uid = p.social_user_id) OR 
     (p.platform = 'instagram' AND pr.ig_uid = p.social_user_id))
  )
  WHERE pr.id = auth.uid() AND p.id = ANY(post_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_can_access_post(post_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.posts p
    JOIN public.profiles pr ON (
      ((p.platform = 'facebook' AND pr.fb_uid = p.social_user_id) OR 
       (p.platform = 'instagram' AND pr.ig_uid = p.social_user_id))
    )
    WHERE pr.id = auth.uid() AND p.id = post_id
  );
END;
$function$;

-- 5) Tighten RLS: posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;

-- Allow authenticated users to insert posts they own (either by app owner or social identity)
CREATE POLICY "Users can insert their posts"
ON public.posts
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND (
        (NEW.platform = 'facebook' AND NEW.social_user_id = pr.fb_uid) OR
        (NEW.platform = 'instagram' AND NEW.social_user_id = pr.ig_uid)
      )
  )
);

-- Allow viewing posts owned via user_id or social mapping
CREATE POLICY "Users can view their accessible posts"
ON public.posts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.user_can_access_post(id));

-- Allow updates/deletes on accessible posts
CREATE POLICY "Users can update their accessible posts"
ON public.posts
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.user_can_access_post(id))
WITH CHECK (user_id = auth.uid() OR public.user_can_access_post(id));

CREATE POLICY "Users can delete their accessible posts"
ON public.posts
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.user_can_access_post(id));

-- 6) Tighten RLS: comments (ensure insert works for owners)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view their own comments" ON public.comments;
DROP POLICY IF EXISTS "Service role can manage comments" ON public.comments;

-- Service role bypasses RLS automatically; but we re-add explicit manage policy if desired
CREATE POLICY "Users can insert their own comments"
ON public.comments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update/delete their own comments"
ON public.comments
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Allow users to view comments on posts they can access or that they own
CREATE POLICY "Users can view comments they own or on accessible posts"
ON public.comments
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR public.user_can_access_post(post_id));

-- 7) Tighten RLS: prompt_configurations to per-user
ALTER TABLE public.prompt_configurations ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_prompt_configurations_user_id ON public.prompt_configurations (user_id);
ALTER TABLE public.prompt_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert configurations" ON public.prompt_configurations;
DROP POLICY IF EXISTS "Anyone can update configurations" ON public.prompt_configurations;
DROP POLICY IF EXISTS "Anyone can view configurations" ON public.prompt_configurations;

CREATE POLICY "Users can view their configurations"
ON public.prompt_configurations
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their configurations"
ON public.prompt_configurations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their configurations"
ON public.prompt_configurations
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8) Tighten RLS: sync_status (read-only to authenticated, writes via service role only)
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can modify sync status" ON public.sync_status;
DROP POLICY IF EXISTS "Anyone can update sync status" ON public.sync_status;
DROP POLICY IF EXISTS "Anyone can view sync status" ON public.sync_status;

CREATE POLICY "Authenticated users can view sync status"
ON public.sync_status
FOR SELECT TO authenticated
USING (true);
