-- Create a conversation_memory table for storing detailed conversation history
CREATE TABLE public.conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT,
  conversation_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  tools_used TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversation_memory ENABLE ROW LEVEL SECURITY;

-- Create policies for conversation memory
CREATE POLICY "Service role can manage conversation_memory" 
ON public.conversation_memory 
FOR ALL 
USING (true);

-- Create index for better performance
CREATE INDEX idx_conversation_memory_user_id ON public.conversation_memory(user_id);
CREATE INDEX idx_conversation_memory_post_id ON public.conversation_memory(post_id);
CREATE INDEX idx_conversation_memory_conversation_id ON public.conversation_memory(conversation_id);
CREATE INDEX idx_conversation_memory_created_at ON public.conversation_memory(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_conversation_memory_updated_at
BEFORE UPDATE ON public.conversation_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a user_memory_profile table for storing user preferences and context
CREATE TABLE public.user_memory_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  user_name TEXT,
  preferences JSONB DEFAULT '{}',
  interaction_count INTEGER DEFAULT 0,
  first_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_memory_profile ENABLE ROW LEVEL SECURITY;

-- Create policies for user memory profile
CREATE POLICY "Service role can manage user_memory_profile" 
ON public.user_memory_profile 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_memory_profile_updated_at
BEFORE UPDATE ON public.user_memory_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();