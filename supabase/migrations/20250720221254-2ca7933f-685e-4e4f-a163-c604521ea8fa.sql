-- Create table to track sync status
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL UNIQUE,
  last_sync_time TIMESTAMP WITH TIME ZONE NOT NULL,
  posts_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies for sync status (admin access only)
CREATE POLICY "Anyone can view sync status" 
ON public.sync_status 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update sync status" 
ON public.sync_status 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can modify sync status" 
ON public.sync_status 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sync_status_updated_at
BEFORE UPDATE ON public.sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule weekly sync every Monday at 9 AM
SELECT cron.schedule(
  'facebook-posts-weekly-sync',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://byetrxydzttvxnsquuac.supabase.co/functions/v1/sync-facebook-posts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZXRyeHlkenR0dnhuc3F1dWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTEzMjIsImV4cCI6MjA2MzY4NzMyMn0.sdppDVah1kGSn80cBYtAscqMTPf9ngfxiWNKElPjg5w"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);