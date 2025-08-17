import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const requestStartMs = Date.now();
  console.log('process-ai-message: request received', { requestId, method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    console.log('process-ai-message: CORS preflight', { requestId });
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load configuration from database instead of file
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('process-ai-message: env flags', { requestId, hasSupabaseUrl: !!supabaseUrl, hasSupabaseKey: !!supabaseKey });
    
    const configFetchStartMs = Date.now();
    const { data: configData } = await supabase
      .from('prompt_configurations')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    console.log('process-ai-message: config loaded', { 
      requestId, 
      hasConfig: !!configData, 
      webSearchEnabled: !!(configData as any)?.web_search_enabled,
      fileSearchEnabled: !!(configData as any)?.file_search_enabled,
      fileRefs: Array.isArray((configData as any)?.file_references) ? (configData as any).file_references.length : 0,
      durationMs: Date.now() - configFetchStartMs
    });
    
    const body = await req.json();
    const { message, senderId, sessionId, context, postContent, contextualInstructions } = body;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('process-ai-message: body parsed', { 
      requestId,
      context,
      sessionId,
      messageLength: typeof message === 'string' ? message.length : null,
      hasPostContent: !!postContent,
      hasContextualInstructions: !!contextualInstructions,
      hasOpenAIKey: !!openaiApiKey
    });

    // Input validation and sanitization
    if (!message || typeof message !== 'string') {
      throw new Error('Valid message is required');
    }
    
    // Allow flexible senderId for testing scenarios
    const validSenderId = senderId || `test-user-${Date.now()}`;
    console.log('Processing AI message for sender', validSenderId, `(session: ${sessionId}):`, message);
    console.log('process-ai-message: request context', { requestId, validSenderId, sessionId, context });
    
    // Sanitize message content
    const sanitizedMessage = message.trim().substring(0, 4000); // Limit message length
    
    // Validate sessionId if provided
    if (sessionId && typeof sessionId !== 'string') {
      throw new Error('Invalid sessionId format');
    }

    // Get user memory context
    let userMemoryContext = '';
    try {
      const memoryFetchStartMs = Date.now();
      console.log('process-ai-message: fetching user memory', { requestId, validSenderId });
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
      console.log('process-ai-message: user memory fetched', { 
        requestId,
        recentMemories: memoryData?.recent_memories?.length || 0,
        hasProfile: !!memoryData?.profile,
        durationMs: Date.now() - memoryFetchStartMs
      });
    } catch (memoryError) {
      console.error('Error retrieving user memory:', memoryError, { requestId });
    }

    // If postContent is not provided but we have context indicating this is a comment, try to get it from the database
    let actualPostContent = postContent || '';
    if (context === 'comment_reply' && !postContent) {
      console.log('Attempting to retrieve post content from database...');
      try {
        const sessionFetchStartMs = Date.now();
        // Get session data to find the post_id
        const { data: sessionData } = await supabase
          .from('chat_sessions')
          .select('messages')
          .eq('id', sessionId)
          .maybeSingle();
        console.log('process-ai-message: session data fetched for post content', { requestId, hasMessages: !!sessionData?.messages, durationMs: Date.now() - sessionFetchStartMs });

        if (sessionData?.messages) {
          const messages = JSON.parse(sessionData.messages);
          const userMessage = messages.find((msg: any) => msg.role === 'user');
          if (userMessage?.post_content) {
            actualPostContent = userMessage.post_content;
            console.log('Retrieved post content from session data', { requestId, length: String(actualPostContent).length });
          }
        }
      } catch (error) {
        console.error('Error retrieving post content from database:', error, { requestId });
      }
    }

    // Check if user is asking about post content and search Pinecone if needed
    let relevantPostContent = '';
    const postRelatedKeywords = ['post', 'article', 'content', 'owner', 'author', 'wrote', 'said', 'mentioned', 'means', 'summarize', 'summary'];
    const isPostRelated = postRelatedKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    console.log('process-ai-message: post-related detection', { requestId, isPostRelated });

    if (isPostRelated) {
      try {
        const pineconeStartMs = Date.now();
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
        console.log('process-ai-message: pinecone search completed', { requestId, hadResults: !!searchResults?.results?.length, topScore: searchResults?.results?.[0]?.score ?? null, durationMs: Date.now() - pineconeStartMs });
      } catch (searchError) {
        console.log('Post search failed (non-critical):', searchError, { requestId });
      }
    }

    if (!openaiApiKey) {
      console.error('process-ai-message: OPENAI_API_KEY missing', { requestId });
      throw new Error('OpenAI API key not configured');
    }

    // Create unique conversation identifier to prevent response mixing
    const conversationId = `${validSenderId}_${sessionId}_${Date.now()}`;
    console.log('Conversation ID:', conversationId, 'requestId:', requestId);

    // Analyze if the message needs web search or file search
    const analyzeWebStartMs = Date.now();
    const needsWebSearch = configData?.web_search_enabled && await analyzeIfNeedsSearch(sanitizedMessage, openaiApiKey, 'web');
    const analyzeWebMs = Date.now() - analyzeWebStartMs;
    const analyzeFileStartMs = Date.now();
    const needsFileSearch = configData?.file_search_enabled && configData?.file_references?.length > 0 && await analyzeIfNeedsSearch(sanitizedMessage, openaiApiKey, 'file');
    const analyzeFileMs = Date.now() - analyzeFileStartMs;
    
    console.log('Needs web search:', needsWebSearch, '(analysisMs:', analyzeWebMs, ')');
    console.log('Needs file search:', needsFileSearch, '(analysisMs:', analyzeFileMs, ')');
    
    let searchResults = '';
    let fileResults = '';
    
    if (needsWebSearch) {
      const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
      if (tavilyApiKey) {
        console.log('Performing web search...');
        const webSearchStartMs = Date.now();
        searchResults = await performWebSearch(sanitizedMessage, tavilyApiKey);
        console.log('Web search results obtained', { requestId, conversationId, durationMs: Date.now() - webSearchStartMs, resultsLength: searchResults ? searchResults.length : 0 });
      } else {
        console.log('TAVILY_API_KEY not configured; web search skipped', { requestId, conversationId });
      }
    }
    
    if (needsFileSearch) {
      console.log('Performing file search...');
      const fileSearchStartMs = Date.now();
      fileResults = await performFileSearch(sanitizedMessage, (configData as any).file_references, supabase);
      console.log('File search results obtained', { requestId, conversationId, durationMs: Date.now() - fileSearchStartMs, resultsLength: fileResults ? fileResults.length : 0, fileRefCount: Array.isArray((configData as any)?.file_references) ? (configData as any).file_references.length : 0 });
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

    console.log('process-ai-message: system prompt prepared', { 
      requestId,
      conversationId,
      promptLength: enhancedSystemPrompt.length,
      hasSearchResults: !!searchResults,
      hasFileResults: !!fileResults,
      hasUserMemoryContext: !!userMemoryContext,
      hasContextualInstructions: !!contextualInstructions
    });

    // Call OpenAI API using config values
    const openaiStartMs = Date.now();
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

    const openaiResponseMs = Date.now() - openaiStartMs;
    if (!response.ok) {
      console.error('OpenAI API error status:', response.status, { requestId, conversationId, durationMs: openaiResponseMs });
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    console.log('process-ai-message: OpenAI call completed', { requestId, conversationId, durationMs: openaiResponseMs, usage: (data as any)?.usage || null });

    console.log(`AI response generated for conversation ${conversationId}:`, aiResponse);

    // Store conversation in memory
    try {
      const conversationUuid = crypto.randomUUID();
      const toolsUsed = [];
      if (needsWebSearch && !!searchResults) toolsUsed.push('web_search');
      if (needsFileSearch && !!fileResults) toolsUsed.push('file_search');

      // Store user message
      const memoryStoreUserStart = Date.now();
      const { data: storeUserData, error: storeUserError } = await supabase.functions.invoke('ai-memory', {
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
      console.log('process-ai-message: stored user memory', { requestId, conversationId, durationMs: Date.now() - memoryStoreUserStart, error: storeUserError || null });

      // Store AI response
      const memoryStoreAIStart = Date.now();
      const { data: storeAIData, error: storeAIError } = await supabase.functions.invoke('ai-memory', {
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
      console.log('process-ai-message: stored AI memory', { requestId, conversationId, durationMs: Date.now() - memoryStoreAIStart, error: storeAIError || null, toolsUsed });
    } catch (memoryStoreError) {
      console.error('Error storing conversation memory:', memoryStoreError, { requestId, conversationId });
    }

    console.log('process-ai-message: responding with success', { requestId, conversationId, usedWebSearch: needsWebSearch && !!searchResults, usedFileSearch: needsFileSearch && !!fileResults, totalRequestMs: Date.now() - requestStartMs });
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
    console.error('Error in process-ai-message function:', error, { requestId, stack: (error as any)?.stack });
    
    let errorMessage = "I apologize, but I'm experiencing technical difficulties. Please try again later or contact our support team.";
    console.log('process-ai-message: responding with error', { requestId, totalRequestMs: Date.now() - requestStartMs });
    
    return new Response(JSON.stringify({ 
      error: (error as any)?.message,
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
    console.log('performWebSearch: parsed response', { numResults: Array.isArray((data as any)?.results) ? (data as any).results.length : 0, hasAnswer: !!(data as any)?.answer });
    
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
    console.log('performFileSearch: start', { numFiles: Array.isArray(fileReferences) ? fileReferences.length : 0, queryLength: typeof query === 'string' ? query.length : null });
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
        console.log('performFileSearch: processed file', { name: fileRef.name, type: fileRef.type, contentLength: content ? content.length : 0, relevanceScore });
        
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
    console.log('performFileSearch: end', { numResults: searchResults.length });

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