-- Fix RLS policies to use proper authentication
-- First, drop all existing broken policies that use current_setting

-- Drop existing broken policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Drop existing broken policies on pages table  
DROP POLICY IF EXISTS "Users can view their own pages" ON public.pages;
DROP POLICY IF EXISTS "Users can manage their own pages" ON public.pages;

-- Drop existing broken policies on posts table
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;

-- Drop existing broken policies on comments table
DROP POLICY IF EXISTS "Users can view their own comments" ON public.comments;

-- Create proper RLS policies using auth.uid()

-- Users table policies
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own data" 
ON public.users 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Pages table policies
CREATE POLICY "Users can view their own pages" 
ON public.pages 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own pages" 
ON public.pages 
FOR ALL 
USING (user_id = auth.uid());

-- Posts table policies
CREATE POLICY "Users can view their own posts" 
ON public.posts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own posts" 
ON public.posts 
FOR ALL 
USING (user_id = auth.uid());

-- Comments table policies
CREATE POLICY "Users can view their own comments" 
ON public.comments 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own comments" 
ON public.comments 
FOR ALL 
USING (user_id = auth.uid());

-- Update users table to link to auth.users properly
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL where it should be
ALTER TABLE public.posts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.pages ALTER COLUMN user_id SET NOT NULL;

-- Create profiles table for additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fb_user_id text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();