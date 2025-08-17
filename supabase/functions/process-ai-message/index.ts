import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Early entry log so we always see something even if JSON parsing fails
  try {
    console.log('[process-ai-message] Invocation:', {
      method: req.method,
      url: req.url,
      time: new Date().toISOString(),
    });
  } catch (_) {
    // no-op
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load configuration from database instead of file
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('[process-ai-message] Missing Supabase env vars', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      return new Response(JSON.stringify({ error: 'Server misconfigured: missing Supabase credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: configData } = await supabase
      .from('prompt_configurations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error('[process-ai-message] Failed to parse JSON body:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { message, senderId, sessionId, context, postContent, contextualInstructions } = body;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Input validation and sanitization
    if (!message || typeof message !== 'string') {
      throw new Error('Valid message is required');
    }
    
    // Allow flexible senderId for testing scenarios
    const validSenderId = senderId || `test-user-${Date.now()}`;
    console.log('Processing AI message for sender', validSenderId, `(session: ${sessionId}):`, message);
    
    // Sanitize message content
    const sanitizedMessage = message.trim().substring(0, 4000); // Limit message length
    
    // Normalize sessionId (accept string or number)
    const normalizedSessionId = sessionId == null ? null : String(sessionId);

    // Get user memory context
    let userMemoryContext = '';
    try {
      const { data: memoryData } = await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'get_user_context',
          user_id: validSenderId,
          limit: 5
        }
      });

      if (memoryData?.recent_memories?.length > 0) {
        userMemoryContext = '\n\nUser Conversation History:\n';
        memoryData.recent_memories.forEach((memory: any, index: number) => {
          userMemoryContext += `${index + 1}. ${memory.message_type === 'user' ? 'User' : 'AI'}: ${memory.content}\n`;
        });
      }

      if (memoryData?.profile) {
        userMemoryContext += `\nUser Profile: Interactions: ${memoryData.profile.interaction_count || 0}, Member since: ${memoryData.profile.first_interaction || 'Unknown'}`;
      }
    } catch (memoryError) {
      console.error('Error retrieving user memory:', memoryError);
    }

    // If postContent is not provided but we have context indicating this is a comment, try to get it from the database
    let actualPostContent = postContent || '';
    if (context === 'comment_reply' && !postContent) {
      console.log('Attempting to retrieve post content from database...');
      try {
        // Get session data to find the post_id
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('messages')
          .eq('id', normalizedSessionId)
          .maybeSingle();

        if (sessionData?.messages) {
          const messages = JSON.parse(sessionData.messages);
          const userMessage = messages.find((msg: any) => msg.role === 'user');
          if (userMessage?.post_content) {
            actualPostContent = userMessage.post_content;
            console.log('Retrieved post content from session data');
          }
        }
      } catch (error) {
        console.error('Error retrieving post content from database:', error);
      }
    }

    // Check if user is asking about post content and search Pinecone if needed
    let relevantPostContent = '';
    const postRelatedKeywords = ['post', 'article', 'content', 'owner', 'author', 'wrote', 'said', 'mentioned', 'means', 'summarize', 'summary'];
    const isPostRelated = postRelatedKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isPostRelated) {
      try {
        const { data: searchResults } = await supabase.functions.invoke('pinecone-search', {
          body: {
            action: 'search_posts',
            query: sanitizedMessage
          }
        });

        if (searchResults?.results?.length > 0) {
          const topResult = searchResults.results[0];
          if (topResult.score > 0.7) { // Only use high-confidence matches
            relevantPostContent = `\n\nRelevant Post Content Found:\nAuthor: ${topResult.postAuthor}\nContent: ${topResult.fullContent}`;
          }
        }
      } catch (searchError) {
        console.log('Post search failed (non-critical):', searchError);
      }
    }

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create unique conversation identifier to prevent response mixing
    const conversationId = `${validSenderId}_${normalizedSessionId ?? 'no-session'}_${Date.now()}`;
    console.log('Conversation ID:', conversationId);

    // Analyze if the message needs web search or file search
    const needsWebSearch = configData?.web_search_enabled && await analyzeIfNeedsSearch(sanitizedMessage, openaiApiKey, 'web');
    const needsFileSearch = configData?.file_search_enabled && configData?.file_references?.length > 0 && await analyzeIfNeedsSearch(sanitizedMessage, openaiApiKey, 'file');
    
    console.log('Needs web search:', needsWebSearch);
    console.log('Needs file search:', needsFileSearch);
    
    let searchResults = '';
    let fileResults = '';
    
    if (needsWebSearch) {
      const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
      if (tavilyApiKey) {
        console.log('Performing web search...');
        searchResults = await performWebSearch(sanitizedMessage, tavilyApiKey);
        console.log('Web search results obtained');
      }
    }
    
    if (needsFileSearch) {
      console.log('Performing file search...');
      fileResults = await performFileSearch(sanitizedMessage, configData.file_references, supabase);
      console.log('File search results obtained');
    }

    // Get the system prompt from config
    let systemInstructions = configData?.system_instructions || 
      'You are an AI assistant. Respond helpfully and professionally.';
    
    const personalContext = configData ? 
      `Business/Person: ${configData.business_name}\nDetails: ${configData.details}` : 
      '';

    // Perform variable substitution in system instructions
    systemInstructions = systemInstructions
      .replace(/\$\{postContent\}/g, actualPostContent || 'No post content available')
      .replace(/\$\{personalContext\}/g, personalContext)
      .replace(/\$\{searchResults\}/g, searchResults || 'No search results available')
      .replace(/\$\{fileResults\}/g, fileResults || 'No file results available');

    let enhancedSystemPrompt = systemInstructions;

    // Add contextual instructions if provided (e.g., from Facebook comments)
    if (contextualInstructions) {
      enhancedSystemPrompt += `

${contextualInstructions}`;
    }

    // Add Pinecone search results as fallback if no direct post content was provided
    if (!actualPostContent && relevantPostContent) {
      enhancedSystemPrompt += relevantPostContent;
    }

    if (searchResults) {
      enhancedSystemPrompt += `

Use the following current web search results to answer the user's question accurately. Always cite your sources when using information from search results.

Web Search Results:
${searchResults}`;
    }

    if (fileResults) {
      enhancedSystemPrompt += `

Use the following information from uploaded files and documents to answer the user's question:

File Search Results:
${fileResults}`;
    }

    // Add user memory context
    if (userMemoryContext) {
      enhancedSystemPrompt += userMemoryContext;
    }

    enhancedSystemPrompt += `

If you don't know something, politely say so and offer to connect them with a human representative.

IMPORTANT: This is a unique conversation (ID: ${conversationId}). Use the conversation history to provide contextual responses, but respond specifically to THIS user's current question.`;

    // Call OpenAI API using config values
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: enhancedSystemPrompt
          },
          {
            role: 'user',
            content: `[Conversation ID: ${conversationId}] ${sanitizedMessage}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log(`AI response generated for conversation ${conversationId}:`, aiResponse);

    // Store conversation in memory
    try {
      const conversationUuid = crypto.randomUUID();
      const toolsUsed = [];
      if (needsWebSearch && !!searchResults) toolsUsed.push('web_search');
      if (needsFileSearch && !!fileResults) toolsUsed.push('file_search');

      // Store user message
      await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'store_memory',
          user_id: validSenderId,
          post_id: context === 'comment_reply' ? sessionId : null,
          conversation_id: conversationUuid,
          message_type: 'user',
          content: sanitizedMessage,
          context: { 
            session_id: sessionId,
            context: context,
            post_content: actualPostContent || null
          },
          tools_used: []
        }
      });

      // Store AI response
      await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'store_memory',
          user_id: validSenderId,
          post_id: context === 'comment_reply' ? sessionId : null,
          conversation_id: conversationUuid,
          message_type: 'ai',
          content: aiResponse,
          context: {
            session_id: sessionId,
            context: context,
            used_web_search: needsWebSearch && !!searchResults,
            used_file_search: needsFileSearch && !!fileResults
          },
          tools_used: toolsUsed
        }
      });
    } catch (memoryStoreError) {
      console.error('Error storing conversation memory:', memoryStoreError);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      sessionId: sessionId,
      senderId: validSenderId,
      conversationId: conversationId,
      usedWebSearch: needsWebSearch && !!searchResults,
      usedFileSearch: needsFileSearch && !!fileResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-ai-message function:', error);
    
    let errorMessage = "I apologize, but I'm experiencing technical difficulties. Please try again later or contact our support team.";
    
    return new Response(JSON.stringify({ 
      error: error.message,
      response: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Function to analyze if a message needs search (web or file)
async function analyzeIfNeedsSearch(message: string, openAIApiKey: string, searchType: 'web' | 'file'): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: searchType === 'web' ? 
              'Analyze if this message needs current/real-time information that would require a web search. Respond with only "true" or "false".' :
              'Analyze if this message is asking about specific documents, files, or information that might be stored in uploaded files. Respond with only "true" or "false".'
          },
          { role: 'user', content: message }
        ],
        max_tokens: 50,
        temperature: 0.1
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const decision = data.choices[0].message.content.trim().toLowerCase();
      return decision.includes('true');
    }
  } catch (error) {
    console.error('Error analyzing search need:', error);
  }
  
  // Fallback: search for certain keywords
  const searchKeywords = ['latest', 'current', 'recent', 'news', 'today', 'now', 'weather', 'price'];
  return searchKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// Function to perform web search using Tavily
async function performWebSearch(query: string, tavilyApiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_answer: true,
        include_domains: [],
        exclude_domains: [],
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.error('Tavily API error:', response.status, response.statusText);
      return '';
    }

    const data = await response.json();
    
    if (data.answer) {
      // Use Tavily's direct answer if available
      let searchContext = `Direct Answer: ${data.answer}\n\n`;
      
      // Add top search results for additional context (without URLs)
      if (data.results && data.results.length > 0) {
        searchContext += 'Additional Sources:\n';
        data.results.slice(0, 3).forEach((result: any, index: number) => {
          searchContext += `${index + 1}. ${result.title}\n`;
          searchContext += `   ${result.content}\n\n`;
        });
      }
      
      return searchContext;
    } else if (data.results && data.results.length > 0) {
      // Fallback to search results if no direct answer (without URLs)
      let searchContext = 'Search Results:\n';
      data.results.slice(0, 3).forEach((result: any, index: number) => {
        searchContext += `${index + 1}. ${result.title}\n`;
        searchContext += `   ${result.content}\n\n`;
      });
      return searchContext;
    }

    return '';
  } catch (error) {
    console.error('Error performing web search:', error);
    return '';
  }
}

async function performFileSearch(query: string, fileReferences: any[], supabase: any): Promise<string> {
  try {
    const searchResults: Array<{
      fileName: string;
      content: string;
      relevanceScore: number;
      type: string;
    }> = [];

    // Process each file reference
    for (const fileRef of fileReferences) {
      try {
        let content = '';
        
        if (fileRef.type === 'upload') {
          // Read from Supabase storage
          const { data, error } = await supabase.storage
            .from('prompt-files')
            .download(fileRef.url);
            
          if (error) {
            console.error('Error downloading file:', error);
            continue;
          }
          
          content = await data.text();
        } else if (fileRef.type === 'google_docs') {
          // Extract Google Docs content
          content = await extractGoogleDocsContent(fileRef.url);
        } else if (fileRef.type === 'google_sheets') {
          // Extract Google Sheets content
          content = await extractGoogleSheetsContent(fileRef.url);
        }

        // Simple text search - check if query terms appear in content
        const relevanceScore = calculateRelevance(query, content);
        
        if (relevanceScore > 0) {
          searchResults.push({
            fileName: fileRef.name,
            content: content.substring(0, 1000), // Limit content length
            relevanceScore,
            type: fileRef.type
          });
        }
      } catch (error) {
        console.error(`Error processing file ${fileRef.name}:`, error);
      }
    }

    // Sort by relevance score
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Format results for AI context
    if (searchResults.length === 0) {
      return 'No relevant information found in uploaded files.';
    }

    return searchResults
      .slice(0, 3) // Top 3 results
      .map(result => `
File: ${result.fileName} (${result.type})
Content: ${result.content}
---`).join('\n');

  } catch (error) {
    console.error('Error in file search:', error);
    return 'Error occurred while searching files.';
  }
}

async function extractGoogleDocsContent(url: string): Promise<string> {
  const docId = extractGoogleDocId(url);
  if (!docId) throw new Error('Invalid Google Docs URL');
  
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl);
  
  if (!response.ok) throw new Error(`Failed to fetch Google Doc: ${response.status}`);
  return await response.text();
}

async function extractGoogleSheetsContent(url: string): Promise<string> {
  const sheetId = extractGoogleSheetId(url);
  if (!sheetId) throw new Error('Invalid Google Sheets URL');
  
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await fetch(exportUrl);
  
  if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
  return await response.text();
}

function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function calculateRelevance(query: string, content: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  let score = 0;
  
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  
  return score;
}