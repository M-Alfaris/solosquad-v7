-- Add full_name and category fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT,
ADD COLUMN category TEXT;

-- Create enum for category options
CREATE TYPE user_category AS ENUM ('business', 'content_creator', 'other');

-- Update category column to use the enum
ALTER TABLE public.profiles 
ALTER COLUMN category TYPE user_category USING category::user_category;

-- Update the handle_new_user function to include full_name and category
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, category)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'category')::user_category
  );
  RETURN new;
END;
$$;