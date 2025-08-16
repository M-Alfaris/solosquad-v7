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

-- Create policies for sync status
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