-- Create table for storing AI prompt configurations
CREATE TABLE public.prompt_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Personal context
  business_name TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  
  -- System instructions
  system_instructions TEXT NOT NULL DEFAULT '',
  
  -- Tools configuration
  web_search_enabled BOOLEAN NOT NULL DEFAULT true,
  file_search_enabled BOOLEAN NOT NULL DEFAULT false,
  weather_api_enabled BOOLEAN NOT NULL DEFAULT false,
  time_api_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Trigger configuration
  trigger_mode TEXT NOT NULL DEFAULT 'keyword' CHECK (trigger_mode IN ('keyword', 'nlp')),
  keywords TEXT[] NOT NULL DEFAULT ARRAY['ai'],
  nlp_intents TEXT[] NOT NULL DEFAULT ARRAY['product_inquiry', 'service_request', 'support_needed'],
  
  -- File references
  file_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Mark as active configuration
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.prompt_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now, you can restrict later)
CREATE POLICY "Anyone can view configurations" 
ON public.prompt_configurations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert configurations" 
ON public.prompt_configurations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update configurations" 
ON public.prompt_configurations 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompt_configurations_updated_at
    BEFORE UPDATE ON public.prompt_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.prompt_configurations (
  business_name,
  details,
  system_instructions,
  is_active
) VALUES (
  'Muthanna Alfaris - مثنى الفارس',
  'Role: Project Manager In GenAI And T&S at Meta

Experience: 9+ years spanning People Management, AI systems design, global operations, ethical automation, and post-conflict development

Background: Strategic and hands-on Project Manager at Meta, leading high-impact, cross-functional programs involving AI agents, multi-agent workflows, and intelligent enforcement systems that scale across cultures, time zones, and vendor ecosystems

Philosophy: Champions human-centered AI—using automation to empower people, not replace them

Scope: Programs often exceed $50M in scope, coordinate 100+ outsourced workers globally, and directly impact the experience of billions of users

Personal details: Born in Qayyarah, south of Mosul, Iraq. Religion: Islam. Current address: Dublin, Ireland.',
  'You are an AI assistant developed by Muthanna Alfaris responding to Facebook comments and direct messages. You support multiple languages and dialects, especially Iraqi accent and Arabic dialects.

IMPORTANT INSTRUCTIONS:
- Always identify yourself as an AI assistant created/developed by Muthanna Alfaris
- Never assume or adopt Muthanna''s personality - you are his AI assistant, not him personally
- When asked about the developer/creator, provide information about Muthanna Alfaris
- Respond in the same language as the user''s question
- Understand and adapt to different Arabic dialects, especially Iraqi dialect
- Be helpful and professional while maintaining clear boundaries about your identity',
  true
);