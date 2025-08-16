import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    if (!bodyText || bodyText.trim() === '') {
      throw new Error('Request body is empty');
    }
    
    const { action, query, fileReferences } = JSON.parse(bodyText);
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!pineconeApiKey || !openaiApiKey) {
      throw new Error('Pinecone or OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'index_files':
        return await indexFiles(fileReferences, pineconeApiKey, openaiApiKey, supabase);
      case 'index_post':
        const postData = JSON.parse(bodyText);
        return await indexPost(postData, pineconeApiKey, openaiApiKey);
      case 'search':
        return await searchFiles(query, pineconeApiKey, openaiApiKey);
      case 'search_posts':
        return await searchPosts(query, pineconeApiKey, openaiApiKey);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in pinecone-search function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function indexFiles(fileReferences: any[], pineconeApiKey: string, openaiApiKey: string, supabase: any) {
  const indexName = 'file-search';
  const dimension = 1536; // OpenAI embedding dimension
  
  try {
    // Create or ensure index exists
    await createPineconeIndex(indexName, dimension, pineconeApiKey);
    
    const vectors = [];
    
    for (const fileRef of fileReferences) {
      try {
        let content = '';
        
        if (fileRef.type === 'upload') {
          const { data, error } = await supabase.storage.from('prompt-files').download(fileRef.url);
          if (!error) content = await data.text();
        } else if (fileRef.type === 'google_docs') {
          content = await extractGoogleDocsContent(fileRef.url);
        } else if (fileRef.type === 'google_sheets') {
          content = await extractGoogleSheetsContent(fileRef.url);
        }

        if (content) {
          // Split content into chunks
          const chunks = splitIntoChunks(content, 1000);
          
          for (let i = 0; i < chunks.length; i++) {
            const embedding = await createEmbedding(chunks[i], openaiApiKey);
            vectors.push({
              id: `${fileRef.id}_chunk_${i}`,
              values: embedding,
              metadata: {
                fileName: fileRef.name,
                fileType: fileRef.type,
                fileId: fileRef.id,
                chunkIndex: i,
                content: chunks[i].substring(0, 500) // Store preview
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${fileRef.name}:`, error);
      }
    }

    // Upsert vectors to Pinecone
    if (vectors.length > 0) {
      await upsertToPinecone(indexName, vectors, pineconeApiKey);
    }

    return new Response(JSON.stringify({
      success: true,
      indexed: vectors.length,
      message: `Successfully indexed ${vectors.length} chunks from ${fileReferences.length} files`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    throw new Error(`Failed to index files: ${error.message}`);
  }
}

async function searchFiles(query: string, pineconeApiKey: string, openaiApiKey: string) {
  const indexName = 'file-search';
  
  try {
    console.log('Starting file search for query:', query);
    
    // Validate inputs
    if (!query || !pineconeApiKey || !openaiApiKey) {
      throw new Error('Missing required parameters for file search');
    }
    
    // Create embedding for query with timeout
    const queryEmbedding = await Promise.race([
      createEmbedding(query, openaiApiKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI API timeout')), 30000))
    ]);
    
    console.log('Generated embedding for query, dimension:', queryEmbedding.length);
    
    // Search in Pinecone with timeout
    const results = await Promise.race([
      queryPinecone(indexName, queryEmbedding, pineconeApiKey, 5),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Pinecone API timeout')), 30000))
    ]);
    
    console.log('Search completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      query,
      results: results.matches?.map((match: any) => ({
        fileName: match.metadata?.fileName || 'Unknown',
        content: match.metadata?.content || '',
        score: match.score || 0,
        type: match.metadata?.fileType || 'unknown'
      })) || [],
      summary: results.matches?.length > 0 
        ? `Found ${results.matches.length} relevant chunks` 
        : 'No relevant content found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in searchFiles:', error);
    
    // Return graceful fallback instead of throwing
    return new Response(JSON.stringify({
      success: false,
      query,
      results: [],
      summary: `File search failed: ${error.message}. Please check API configuration.`,
      error: error.message
    }), {
      status: 200, // Return 200 to avoid crashing the caller
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function createPineconeIndex(name: string, dimension: number, apiKey: string) {
  try {
    // First check if index exists
    const checkResponse = await fetch(`https://api.pinecone.io/indexes/${name}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      console.log(`Index ${name} already exists`);
      return;
    }

    // Create the index if it doesn't exist
    const response = await fetch('https://api.pinecone.io/indexes', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error creating index:', errorText);
      throw new Error(`Failed to create Pinecone index: ${response.status} ${errorText}`);
    }

    console.log(`Index ${name} created successfully`);
    
    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (error) {
    console.error('Error in createPineconeIndex:', error);
    throw error;
  }
}

async function createEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  try {
    console.log('Creating embedding for text length:', text.length);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000), // Limit text length
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    if (!responseText) {
      throw new Error('Empty response from OpenAI API');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid JSON response from OpenAI API');
    }

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response structure from OpenAI');
    }

    console.log('Successfully created embedding, dimension:', data.data[0].embedding.length);
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

async function upsertToPinecone(indexName: string, vectors: any[], apiKey: string) {
  const pineconeIndexUrl = Deno.env.get('PINECONE_INDEX_URL');
  if (!pineconeIndexUrl) {
    throw new Error('PINECONE_INDEX_URL environment variable is not set');
  }

  // Use the correct endpoint format for serverless Pinecone
  const upsertUrl = pineconeIndexUrl.includes('/vectors/upsert') ? pineconeIndexUrl : `${pineconeIndexUrl}/vectors/upsert`;

  const response = await fetch(upsertUrl, {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vectors,
      namespace: "" // Add empty namespace for serverless
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pinecone upsert error:', errorText);
    throw new Error(`Failed to upsert to Pinecone: ${response.status} ${errorText}`);
  }

  console.log(`Successfully upserted ${vectors.length} vectors to ${indexName}`);
}

async function queryPinecone(indexName: string, vector: number[], apiKey: string, topK: number) {
  try {
    const pineconeIndexUrl = Deno.env.get('PINECONE_INDEX_URL');
    if (!pineconeIndexUrl) {
      throw new Error('PINECONE_INDEX_URL environment variable is not set');
    }

    console.log('Querying Pinecone index:', indexName, 'with vector dimension:', vector.length);
    
    // Use the correct endpoint format for serverless Pinecone
    const queryUrl = pineconeIndexUrl.includes('/query') ? pineconeIndexUrl : `${pineconeIndexUrl}/query`;
    
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector,
        topK,
        includeMetadata: true,
        namespace: "" // Add empty namespace for serverless
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone query error:', errorText);
      throw new Error(`Pinecone API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    if (!responseText) {
      throw new Error('Empty response from Pinecone API');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Pinecone response:', responseText);
      throw new Error('Invalid JSON response from Pinecone API');
    }

    console.log('Pinecone query completed, matches found:', data.matches?.length || 0);
    return data;
  } catch (error) {
    console.error('Error querying Pinecone:', error);
    throw error;
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

async function extractGoogleDocsContent(url: string): Promise<string> {
  const docId = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!docId) throw new Error('Invalid Google Docs URL');
  
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl);
  
  if (!response.ok) throw new Error(`Failed to fetch Google Doc: ${response.status}`);
  return await response.text();
}

async function indexPost(data: any, pineconeApiKey: string, openaiApiKey: string) {
  const { postId, postContent, postAuthor, postTimestamp } = data;
  const indexName = 'post-content';
  const dimension = 1536;
  
  try {
    // Create or ensure index exists
    await createPineconeIndex(indexName, dimension, pineconeApiKey);
    
    if (!postContent) {
      throw new Error('No post content provided');
    }
    
    // Create embedding for post content
    const embedding = await createEmbedding(postContent, openaiApiKey);
    
    const vector = {
      id: `post_${postId}`,
      values: embedding,
      metadata: {
        postId,
        postAuthor: postAuthor || 'Unknown',
        postTimestamp: postTimestamp || new Date().toISOString(),
        content: postContent.substring(0, 1000), // Store preview
        fullContent: postContent,
        type: 'facebook_post'
      }
    };
    
    // Upsert to Pinecone
    await upsertToPinecone(indexName, [vector], pineconeApiKey);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully indexed post ${postId}`,
      indexed: 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    throw new Error(`Failed to index post: ${error.message}`);
  }
}

async function searchPosts(query: string, pineconeApiKey: string, openaiApiKey: string) {
  const indexName = 'post-content';
  
  try {
    // Create embedding for query
    const queryEmbedding = await createEmbedding(query, openaiApiKey);
    
    // Search in Pinecone
    const results = await queryPinecone(indexName, queryEmbedding, pineconeApiKey, 3);
    
    return new Response(JSON.stringify({
      success: true,
      query,
      results: results.matches?.map((match: any) => ({
        postId: match.metadata.postId,
        postAuthor: match.metadata.postAuthor,
        postTimestamp: match.metadata.postTimestamp,
        content: match.metadata.content,
        fullContent: match.metadata.fullContent,
        score: match.score,
        type: match.metadata.type
      })) || [],
      summary: results.matches?.length > 0 
        ? `Found ${results.matches.length} relevant posts` 
        : 'No relevant posts found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    throw new Error(`Failed to search posts: ${error.message}`);
  }
}

async function extractGoogleSheetsContent(url: string): Promise<string> {
  const sheetId = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!sheetId) throw new Error('Invalid Google Sheets URL');
  
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const response = await fetch(exportUrl);
  
  if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
  return await response.text();
}