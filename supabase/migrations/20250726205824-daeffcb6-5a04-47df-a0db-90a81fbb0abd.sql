-- Create cron jobs for automatic post syncing
-- These will run every 15 minutes to sync Facebook and Instagram posts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Facebook posts sync every 15 minutes
SELECT cron.schedule(
  'sync-facebook-posts',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url:='https://byetrxydzttvxnsquuac.supabase.co/functions/v1/fetch-facebook-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZXRyeHlkenR0dnhuc3F1dWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTEzMjIsImV4cCI6MjA2MzY4NzMyMn0.sdppDVah1kGSn80cBYtAscqMTPf9ngfxiWNKElPjg5w"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule Instagram posts sync every 15 minutes (offset by 5 minutes to avoid conflicts)
SELECT cron.schedule(
  'sync-instagram-posts',
  '5,20,35,50 * * * *', -- Every 15 minutes, offset by 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://byetrxydzttvxnsquuac.supabase.co/functions/v1/fetch-instagram-data',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZXRyeHlkenR0dnhuc3F1dWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTEzMjIsImV4cCI6MjA2MzY4NzMyMn0.sdppDVah1kGSn80cBYtAscqMTPf9ngfxiWNKElPjg5w"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a table to track cron job runs
CREATE TABLE IF NOT EXISTS public.cron_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on cron_logs
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage cron logs
CREATE POLICY "Service role can manage cron_logs" 
ON public.cron_logs 
FOR ALL 
USING (true);

-- View scheduled cron jobs (for reference)
-- SELECT * FROM cron.job;