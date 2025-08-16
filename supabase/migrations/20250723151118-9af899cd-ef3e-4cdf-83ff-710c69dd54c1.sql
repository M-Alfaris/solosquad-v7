-- Create users table for Facebook authenticated users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  fb_access_token TEXT NOT NULL,
  trial_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  stripe_customer_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pages table for connected Facebook pages
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fb_page_id TEXT NOT NULL,
  fb_page_token TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fb_page_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (fb_user_id = current_setting('app.current_user_fb_id', true));

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (fb_user_id = current_setting('app.current_user_fb_id', true));

CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (true);

-- RLS Policies for pages table
CREATE POLICY "Users can view their own pages" ON public.pages
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.users WHERE fb_user_id = current_setting('app.current_user_fb_id', true)
  ));

CREATE POLICY "Users can manage their own pages" ON public.pages
  FOR ALL USING (user_id IN (
    SELECT id FROM public.users WHERE fb_user_id = current_setting('app.current_user_fb_id', true)
  ));

CREATE POLICY "Service role can manage pages" ON public.pages
  FOR ALL USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing posts and comments tables to link to users
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- Update RLS policies for posts and comments
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Service role can manage posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Service role can manage comments" ON public.comments;

CREATE POLICY "Users can view their own posts" ON public.posts
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.users WHERE fb_user_id = current_setting('app.current_user_fb_id', true)
  ));

CREATE POLICY "Service role can manage posts" ON public.posts
  FOR ALL USING (true);

CREATE POLICY "Users can view their own comments" ON public.comments
  FOR SELECT USING (user_id IN (
    SELECT id FROM public.users WHERE fb_user_id = current_setting('app.current_user_fb_id', true)
  ));

CREATE POLICY "Service role can manage comments" ON public.comments
  FOR ALL USING (true);