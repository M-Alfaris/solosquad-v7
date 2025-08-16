-- Update pages table to support both Facebook pages and Instagram accounts
ALTER TABLE public.pages 
ADD COLUMN platform text NOT NULL DEFAULT 'facebook',
ADD COLUMN ig_account_id text,
ADD COLUMN ig_access_token text,
ADD COLUMN connection_status text DEFAULT 'active';

-- Update existing records to have platform set
UPDATE public.pages SET platform = 'facebook' WHERE platform IS NULL;

-- Add index for better performance
CREATE INDEX idx_pages_user_platform ON public.pages(user_id, platform);
CREATE INDEX idx_pages_fb_page_id ON public.pages(fb_page_id);
CREATE INDEX idx_pages_ig_account_id ON public.pages(ig_account_id);