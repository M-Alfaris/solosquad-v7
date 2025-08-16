import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Facebook Posts Sync Started ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log('Supabase client created successfully');

    const facebookToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
    const pineconeApiKey = Deno.env.get('PINECONE_API_KEY');
    const pineconeIndexUrl = Deno.env.get('PINECONE_INDEX_URL');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('Environment check:', {
      hasFacebookToken: !!facebookToken,
      hasPageId: !!pageId,
      hasPineconeKey: !!pineconeApiKey,
      hasPineconeIndexUrl: !!pineconeIndexUrl,
      hasOpenAIKey: !!openaiApiKey,
      pageId: pageId // Log actual page ID to verify it's correct
    });

    if (!facebookToken || !pageId || !pineconeApiKey || !pineconeIndexUrl || !openaiApiKey) {
      throw new Error('Missing required environment variables');
    }

    console.log('Starting Facebook posts sync...');

    // Get the last sync timestamp from database
    const { data: lastSync } = await supabaseClient
      .from('sync_status')
      .select('last_sync_time')
      .eq('sync_type', 'facebook_posts')
      .maybeSingle();

    // If no last sync, start from November 2022
    const sinceDate = lastSync?.last_sync_time || '2022-11-01';
    const sinceTimestamp = Math.floor(new Date(sinceDate).getTime() / 1000);

    console.log(`Fetching posts since: ${sinceDate}`);

    // Fetch posts from Facebook API with current API v23.0
    let allPosts = [];
    let nextUrl = `https://graph.facebook.com/v23.0/${pageId}/posts?fields=id,message,created_time,permalink_url&since=${sinceTimestamp}&limit=100&access_token=${facebookToken}`;

    while (nextUrl) {
      console.log('Fetching posts batch from URL:', nextUrl);
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(nextUrl, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('Facebook API Response status:', response.status);
        console.log('Facebook API Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Facebook API Response body:', errorText);
          throw new Error(`Facebook API request failed with status ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();

        if (data.error) {
          console.error('Facebook API error:', data.error);
          throw new Error(`Facebook API error: ${data.error.message}`);
        }

        if (data.data && data.data.length > 0) {
          allPosts.push(...data.data);
          console.log(`Fetched ${data.data.length} posts. Total: ${allPosts.length}`);
          
          // Log first post to see structure
          if (allPosts.length === data.data.length) {
            console.log('Sample post structure:', JSON.stringify(data.data[0], null, 2));
          }
        }

        nextUrl = data.paging?.next;
        
        // Break after first batch for testing to avoid hanging
        if (allPosts.length > 0) {
          console.log('Breaking after first batch for testing');
          break;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Facebook API request timed out after 30 seconds');
        }
        throw error;
      }
    }

    console.log(`Total posts fetched: ${allPosts.length}`);

    if (allPosts.length === 0) {
      console.log('No new posts to sync');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No new posts to sync',
        postsProcessed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process posts and create embeddings
    const indexedPosts = [];
    
    for (const post of allPosts) {
      try {
        // Create content for embedding
        const content = [
          post.message
        ].filter(Boolean).join(' ');

        if (!content.trim()) {
          console.log(`Skipping post ${post.id} - no content (message: ${post.message || 'empty'})`);
          continue;
        }

        console.log(`Processing post ${post.id} with content: "${content.substring(0, 100)}..."`);

        // Generate embedding
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: content,
            dimensions: 1024
          }),
        });

        const embeddingData = await embeddingResponse.json();
        
        if (embeddingData.error) {
          console.error(`OpenAI embedding error for post ${post.id}:`, embeddingData.error);
          continue;
        }

        const embedding = embeddingData.data[0].embedding;

        // Prepare data for Pinecone
        const vector = {
          id: `facebook_post_${post.id}`,
          values: embedding,
          metadata: {
            type: 'facebook_post',
            post_id: post.id,
            content: content,
            created_time: post.created_time,
            permalink_url: post.permalink_url,
            source: 'facebook_page'
          }
        };

        indexedPosts.push(vector);

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        continue;
      }
    }

    // Upload to Pinecone in batches
    if (indexedPosts.length > 0) {
      console.log(`Uploading ${indexedPosts.length} posts to Pinecone...`);
      
      const batchSize = 10; // Reduced from 100 to stay under 2MB limit
      for (let i = 0; i < indexedPosts.length; i += batchSize) {
        const batch = indexedPosts.slice(i, i + batchSize);
        
        try {
          const pineconeResponse = await fetch(`${pineconeIndexUrl}/vectors/upsert`, {
            method: 'POST',
            headers: {
              'Api-Key': pineconeApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vectors: batch
            }),
          });

          if (!pineconeResponse.ok) {
            const errorText = await pineconeResponse.text();
            console.error(`Pinecone upsert error for batch ${i/batchSize + 1}:`, errorText);
            continue;
          }

          console.log(`Successfully uploaded batch ${i/batchSize + 1}`);
        } catch (error) {
          console.error(`Error uploading batch ${i/batchSize + 1}:`, error);
        }
      }
    }

    // Update sync status
    const now = new Date().toISOString();
    await supabaseClient
      .from('sync_status')
      .upsert({
        sync_type: 'facebook_posts',
        last_sync_time: now,
        posts_processed: indexedPosts.length,
        updated_at: now
      });

    console.log(`Sync completed. Processed ${indexedPosts.length} posts.`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Facebook posts sync completed',
      totalPosts: allPosts.length,
      postsProcessed: indexedPosts.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== DETAILED ERROR INFO ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
      errorDetails: {
        type: typeof error,
        name: error?.name,
        stack: error?.stack
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});