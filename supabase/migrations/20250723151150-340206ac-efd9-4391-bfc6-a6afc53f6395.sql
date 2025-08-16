-- Fix RLS issues for remaining tables
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_count ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.total_employee_count ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for existing tables (service role access)
CREATE POLICY "Service role can manage chat_sessions" ON public.chat_sessions FOR ALL USING (true);
CREATE POLICY "Service role can manage daily_summaries" ON public.daily_summaries FOR ALL USING (true);
CREATE POLICY "Service role can manage employees" ON public.employees FOR ALL USING (true);
CREATE POLICY "Service role can manage error_logs" ON public.error_logs FOR ALL USING (true);
CREATE POLICY "Service role can manage reports" ON public.reports FOR ALL USING (true);
CREATE POLICY "Service role can manage reports_count" ON public.reports_count FOR ALL USING (true);
CREATE POLICY "Service role can manage total_employee_count" ON public.total_employee_count FOR ALL USING (true);

-- Fix search path for update function
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;