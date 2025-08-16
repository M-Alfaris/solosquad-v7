-- Consolidate user tables: merge public.users into public.profiles

-- First, add Facebook-specific columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fb_user_id text,
ADD COLUMN IF NOT EXISTS fb_access_token text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_start timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end timestamp with time zone DEFAULT (now() + interval '14 days'),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Migrate any existing data from users to profiles
INSERT INTO public.profiles (
    id, fb_user_id, fb_access_token, subscription_status, 
    trial_start, trial_end, stripe_customer_id, is_active,
    full_name, display_name, created_at, updated_at
)
SELECT 
    u.id, u.fb_user_id, u.fb_access_token, u.subscription_status,
    u.trial_start, u.trial_end, u.stripe_customer_id, u.is_active,
    u.name, u.name, u.created_at, u.updated_at
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Update existing profiles with data from users table where profiles exist
UPDATE public.profiles 
SET 
    fb_user_id = u.fb_user_id,
    fb_access_token = u.fb_access_token,
    subscription_status = u.subscription_status,
    trial_start = u.trial_start,
    trial_end = u.trial_end,
    stripe_customer_id = u.stripe_customer_id,
    is_active = u.is_active
FROM public.users u
WHERE public.profiles.id = u.id;

-- Add unique constraint on fb_user_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_fb_user_id_unique UNIQUE (fb_user_id);

-- Update RLS policies for profiles to include the new columns
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate RLS policies
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

-- Add service role policy for profiles
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
USING (true);

-- Drop the redundant users table
DROP TABLE IF EXISTS public.users;