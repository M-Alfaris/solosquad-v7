-- Fix RLS issues for remaining tables (excluding views)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for existing tables (service role access)
CREATE POLICY "Service role can manage chat_sessions" ON public.chat_sessions FOR ALL USING (true);
CREATE POLICY "Service role can manage daily_summaries" ON public.daily_summaries FOR ALL USING (true);
CREATE POLICY "Service role can manage employees" ON public.employees FOR ALL USING (true);
CREATE POLICY "Service role can manage error_logs" ON public.error_logs FOR ALL USING (true);
CREATE POLICY "Service role can manage reports" ON public.reports FOR ALL USING (true);