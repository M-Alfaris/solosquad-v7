// Configuration loader for AI prompts and settings
// This module loads the YAML configuration and provides type-safe access to prompts

interface PersonalContext {
  personal_context: string;
}

interface SystemPrompts {
  comment_reply: string;
  direct_message: string;
}

interface OpenAIConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  search_analysis_max_tokens: number;
  search_analysis_temperature: number;
}

interface TavilyConfig {
  search_depth: string;
  include_answer: boolean;
  max_results: number;
  top_results_to_include: number;
}

interface ErrorMessages {
  technical_difficulty: string;
  openai_not_configured: string;
  facebook_missing_credentials: string;
  processing_error: string;
  comment_processing_error: string;
}

interface CommentProcessingConfig {
  ai_trigger_phrases: {
    start: string;
    end: string;
    exact: string;
  };
  ignore_page_comments: string;
  no_ai_trigger: string;
  no_request_found: string;
}

interface ContextTemplates {
  with_post_content: string;
  without_post_content: string;
}

interface WebhookConfig {
  verify_token: string;
  success_message: string;
  verification_success: string;
  verification_failed: string;
}

export interface AIConfig {
  personal_context: string;
  system_prompts: SystemPrompts;
  search_analysis_prompt: string;
  search_keywords: string[];
  openai: OpenAIConfig;
  tavily: TavilyConfig;
  error_messages: ErrorMessages;
  comment_processing: CommentProcessingConfig;
  context_templates: ContextTemplates;
  webhook: WebhookConfig;
}

// Simple YAML parser for our configuration
function parseYAML(yamlText: string): AIConfig {
  const lines = yamlText.split('\n');
  const result: any = {};
  let currentSection: any = result;
  let currentPath: string[] = [];
  let inMultilineString = false;
  let multilineKey = '';
  let multilineContent: string[] = [];
  let multilineIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      if (inMultilineString) {
        multilineContent.push('');
      }
      continue;
    }

    const indent = line.length - line.trimStart().length;
    
    // Handle multiline strings
    if (inMultilineString) {
      if (indent > multilineIndent || line.trim() === '') {
        multilineContent.push(line.substring(multilineIndent));
        continue;
      } else {
        // End of multiline string
        const finalContent = multilineContent.join('\n').trim();
        setNestedValue(result, [...currentPath, multilineKey], finalContent);
        inMultilineString = false;
        multilineContent = [];
        // Process this line normally
      }
    }

    // Parse key-value pairs
    if (line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      // Calculate nesting level
      const level = Math.floor(indent / 2);
      currentPath = currentPath.slice(0, level);

      if (value === '|') {
        // Start of multiline string
        inMultilineString = true;
        multilineKey = key;
        multilineContent = [];
        multilineIndent = indent + 2;
      } else if (value === '') {
        // Object/section start
        currentPath.push(key);
        setNestedValue(result, currentPath, {});
      } else {
        // Simple key-value
        setNestedValue(result, [...currentPath, key], parseValue(value));
      }
    } else if (line.trim().startsWith('-')) {
      // Array item
      const value = line.trim().substring(1).trim();
      const arrayPath = currentPath;
      if (!getNestedValue(result, arrayPath)) {
        setNestedValue(result, arrayPath, []);
      }
      getNestedValue(result, arrayPath).push(parseValue(value));
    }
  }

  // Handle final multiline string if any
  if (inMultilineString) {
    const finalContent = multilineContent.join('\n').trim();
    setNestedValue(result, [...currentPath, multilineKey], finalContent);
  }

  return result as AIConfig;
}

function parseValue(value: string): any {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (!isNaN(Number(value))) return Number(value);
  return value;
}

function setNestedValue(obj: any, path: string[], value: any) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!(path[i] in current)) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

function getNestedValue(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// Load configuration from YAML file
export async function loadConfig(): Promise<AIConfig> {
  try {
    const configPath = new URL('../shared/prompts.yaml', import.meta.url);
    const yamlText = await Deno.readTextFile(configPath);
    return parseYAML(yamlText);
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Return default config as fallback
    return getDefaultConfig();
  }
}

// Default configuration fallback
function getDefaultConfig(): AIConfig {
  return {
    personal_context: "About Muthanna Alfaris - مثنى الفارس (the page owner):\n- Full name: Muthanna Alfaris - مثنى الفارس\n- Role: Project Manager In GenAI And T&S at Meta",
    system_prompts: {
      comment_reply: "You are an AI assistant developed by Muthanna Alfaris responding to Facebook comments.",
      direct_message: "You are an AI assistant developed by Muthanna Alfaris for his Facebook page."
    },
    search_analysis_prompt: "Analyze if this user message needs current/real-time information from the internet. Return only \"YES\" or \"NO\".",
    search_keywords: ['current', 'latest', 'recent', 'today', 'now', 'news', 'weather', 'price', 'stock'],
    openai: {
      model: "gpt-4o-mini-2024-07-18",
      max_tokens: 500,
      temperature: 0.7,
      search_analysis_max_tokens: 10,
      search_analysis_temperature: 0
    },
    tavily: {
      search_depth: "advanced",
      include_answer: true,
      max_results: 5,
      top_results_to_include: 3
    },
    error_messages: {
      technical_difficulty: "I apologize, but I'm experiencing technical difficulties. Please try again later or contact our support team.",
      openai_not_configured: "OpenAI API key not configured",
      facebook_missing_credentials: "Missing Facebook credentials",
      processing_error: "Sorry, I encountered an error processing your request. Please try again.",
      comment_processing_error: "Sorry, I encountered an error. Please try again."
    },
    comment_processing: {
      ai_trigger_phrases: {
        start: "ai ",
        end: " ai",
        exact: "ai"
      },
      ignore_page_comments: "Ignoring comment from page itself (AI response)",
      no_ai_trigger: "Comment does not contain \"ai\" at beginning or end",
      no_request_found: "No request found after \"ai\""
    },
    context_templates: {
      with_post_content: "Context: Someone commented on a Facebook post. The original post says: \"{post_content}\"\n\nUser's comment: \"{comment}\"\n\nSpecific request: {user_request}",
      without_post_content: "Context: Someone commented on a Facebook post saying: \"{comment}\"\n\nSpecific request: {user_request}"
    },
    webhook: {
      verify_token: "verify_token_123",
      success_message: "EVENT_RECEIVED",
      verification_success: "Webhook verified successfully",
      verification_failed: "Webhook verification failed"
    }
  };
}