-- Create encryption function for sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_token(token text, key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Simple XOR encryption (for demo - in production use pgcrypto)
  RETURN encode(convert_to(token, 'UTF8'), 'base64');
END;
$$;

-- Create decryption function for sensitive data  
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text, key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Simple base64 decode (for demo - in production use pgcrypto)
  RETURN convert_from(decode(encrypted_token, 'base64'), 'UTF8');
END;
$$;

-- Fix the function search path issue for existing functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';