-- Consolidate user tables: fix foreign key dependencies first

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

-- Drop the foreign key constraint from pages table
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_user_id_fkey;

-- Add new foreign key constraint pointing to profiles table
ALTER TABLE public.pages 
ADD CONSTRAINT pages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Drop the redundant users table
DROP TABLE public.users;