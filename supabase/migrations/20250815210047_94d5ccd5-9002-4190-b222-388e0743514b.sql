-- First, let's migrate data from old tables to new ones
-- For conversation_memory: migrate records where user_id is a valid UUID
INSERT INTO conversation_memory_new (
  id, conversation_id, user_id, message_type, content, context, 
  tools_used, post_id, created_at, updated_at
)
SELECT 
  id, conversation_id, user_id::uuid, message_type, content, context,
  tools_used, post_id, created_at, updated_at
FROM conversation_memory 
WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- For user_memory_profile: migrate records where user_id is a valid UUID
INSERT INTO user_memory_profile_new (
  id, user_id, user_name, first_interaction, last_interaction,
  interaction_count, preferences, created_at, updated_at
)
SELECT 
  id, user_id::uuid, user_name, first_interaction, last_interaction,
  interaction_count, preferences, created_at, updated_at
FROM user_memory_profile 
WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Now drop the old tables
DROP TABLE conversation_memory;
DROP TABLE user_memory_profile;

-- Create a unified table that combines both conversation memory and user profiles
CREATE TABLE user_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  
  -- User profile fields
  user_name text,
  first_interaction timestamp with time zone DEFAULT now(),
  last_interaction timestamp with time zone DEFAULT now(),
  interaction_count integer DEFAULT 0,
  preferences jsonb DEFAULT '{}',
  
  -- Conversation memory fields
  message_type text NOT NULL,
  content text NOT NULL,
  context jsonb DEFAULT '{}',
  tools_used text[],
  post_id text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own conversations"
ON user_conversations
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_user_conversations_user_id ON user_conversations(user_id);
CREATE INDEX idx_user_conversations_conversation_id ON user_conversations(conversation_id);
CREATE INDEX idx_user_conversations_post_id ON user_conversations(post_id) WHERE post_id IS NOT NULL;

-- Migrate data from the two new tables to the unified table
INSERT INTO user_conversations (
  user_id, conversation_id, message_type, content, context,
  tools_used, post_id, created_at, updated_at
)
SELECT 
  user_id, conversation_id, message_type, content, context,
  tools_used, post_id, created_at, updated_at
FROM conversation_memory_new;

-- Update with user profile data where conversations exist
UPDATE user_conversations 
SET 
  user_name = ump.user_name,
  first_interaction = ump.first_interaction,
  last_interaction = ump.last_interaction,
  interaction_count = ump.interaction_count,
  preferences = ump.preferences
FROM user_memory_profile_new ump
WHERE user_conversations.user_id = ump.user_id;

-- Insert user profiles that don't have conversations yet
INSERT INTO user_conversations (
  user_id, conversation_id, user_name, first_interaction,
  last_interaction, interaction_count, preferences,
  message_type, content
)
SELECT 
  user_id, gen_random_uuid(), user_name, first_interaction,
  last_interaction, interaction_count, preferences,
  'profile_init', 'User profile initialized'
FROM user_memory_profile_new ump
WHERE NOT EXISTS (
  SELECT 1 FROM user_conversations uc WHERE uc.user_id = ump.user_id
);

-- Drop the separate new tables since we've unified them
DROP TABLE conversation_memory_new;
DROP TABLE user_memory_profile_new;