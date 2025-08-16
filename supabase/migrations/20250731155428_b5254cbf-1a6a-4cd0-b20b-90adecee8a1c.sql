-- Fix security warnings for functions by setting search_path
ALTER FUNCTION public.user_owns_posts(text[]) SET search_path = '';
ALTER FUNCTION public.user_can_access_post(text) SET search_path = '';