import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting and retry helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Instagram Data Fetch Started ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get credentials from request body or fall back to environment variables
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }

    // Authenticate user via JWT and optionally derive token from profile
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid auth token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    let instagramToken = requestBody.accessToken || Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
    const accountId = requestBody.accountId;
    const userId = requestBody.userId || user.id;

    if (!instagramToken) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('user_access_token')
        .eq('id', user.id)
        .single();
      if (!profileError && profile?.user_access_token) {
        instagramToken = profile.user_access_token;
      }
    }

    console.log('Credentials check:', {
      hasInstagramToken: !!instagramToken,
      hasAccountId: !!accountId,
      hasUserId: !!userId,
      supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });

    if (!instagramToken) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Instagram access token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Enhanced error handling for database operations
    async function safeDbOperation<T>(
      operation: () => Promise<T>, 
      operationName: string
    ): Promise<T | null> {
      try {
        return await operation();
      } catch (error) {
        console.error(`Database operation failed [${operationName}]:`, {
          message: error?.message,
          code: error?.code,
          details: error?.details
        });
        return null;
      }
    }

    // Helper function to download and store media with better error handling
    async function downloadAndStoreMedia(mediaUrl: string, postId: string): Promise<string> {
      try {
        console.log(`Downloading Instagram media for post ${postId}: ${mediaUrl}`);
        
        const response = await retryWithBackoff(async () => {
          const resp = await fetch(mediaUrl);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
          }
          return resp;
        });
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const extension = contentType.includes('image/') ? 
          (contentType.split('/')[1] || 'jpg') : 
          (contentType.includes('video/') ? 'mp4' : 'bin');
        
        const fileName = `instagram-${postId}-${Date.now()}.${extension}`;
        const arrayBuffer = await response.arrayBuffer();
        
        const result = await safeDbOperation(async () => {
          const { data, error } = await supabaseClient.storage
            .from('post-media')
            .upload(fileName, arrayBuffer, {
              contentType,
              upsert: false
            });

          if (error) throw error;
          return data;
        }, `media upload for ${fileName}`);

        if (!result) {
          console.error(`Failed to upload media: ${fileName}`);
          return 'text only';
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from('post-media')
          .getPublicUrl(fileName);

        console.log(`Instagram media stored successfully: ${publicUrl}`);
        return publicUrl;
      } catch (error) {
        console.error('Instagram media download error:', {
          postId,
          mediaUrl,
          error: error?.message
        });
        return 'text only';
      }
    }

    // Enhanced Instagram API call with proper error handling
    async function fetchInstagramData(url: string, description: string) {
      try {
        return await retryWithBackoff(async () => {
          const response = await fetch(url);
          
          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText };
            }
            
            console.error(`Instagram API error [${description}]:`, {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            
            throw new Error(`Instagram API request failed [${description}]: ${JSON.stringify(errorData)}`);
          }
          
          return await response.json();
        });
      } catch (error) {
        console.error(`Failed to fetch ${description}:`, error?.message);
        throw error;
      }
    }

    // Use provided accountId or try to discover it
    let instagramBusinessAccountId = accountId;
    
    if (!instagramBusinessAccountId) {
      // Fallback: try to discover Instagram account ID
      console.log('No account ID provided, trying to discover...');
      
      // Step 1: Get Facebook Pages
      const pagesUrl = `https://graph.facebook.com/v23.0/me/accounts?access_token=${instagramToken}`;
      const pagesData = await fetchInstagramData(pagesUrl, 'Facebook pages');
      
      if (!pagesData.data || pagesData.data.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No Facebook Pages found. Instagram Graph API requires a Facebook Page connected to an Instagram Business account.',
          postsProcessed: 0,
          commentsProcessed: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Found ${pagesData.data.length} Facebook pages`);
      
      // Step 2: Find Instagram Business Account
      for (const page of pagesData.data) {
        try {
          const igAccountUrl = `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${instagramToken}`;
          const igAccountData = await fetchInstagramData(igAccountUrl, `Instagram account for page ${page.name}`);
          
          if (igAccountData.instagram_business_account) {
            instagramBusinessAccountId = igAccountData.instagram_business_account.id;
            console.log(`Found Instagram Business Account: ${instagramBusinessAccountId} for page: ${page.name}`);
            break;
          }
        } catch (error) {
          console.warn(`No Instagram account found for page ${page.name}:`, error?.message);
        }
      }
    }
    
    if (!instagramBusinessAccountId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No Instagram Business Account found. Please ensure your Facebook Page is connected to an Instagram Business or Creator account.',
        postsProcessed: 0,
        commentsProcessed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Using Instagram Business Account ID: ${instagramBusinessAccountId}`);

    // Step 3: Get Instagram Media
    console.log('Fetching Instagram posts...');
    const postsUrl = `https://graph.facebook.com/v23.0/${instagramBusinessAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=50&access_token=${instagramToken}`;
    
    const postsData = await fetchInstagramData(postsUrl, 'Instagram posts');
    console.log(`Fetched ${postsData.data?.length || 0} Instagram posts`);

    if (!postsData.data || postsData.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No Instagram posts found',
        postsProcessed: 0,
        commentsProcessed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper function to create or get user profile with fixed field mapping
    async function getOrCreateUserProfile(igUserId: string, displayName: string): Promise<string | null> {
      try {
        // First check if profile exists
        const existingProfile = await safeDbOperation(async () => {
          const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('ig_uid', igUserId)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        }, `check existing profile for ${igUserId}`);

        if (existingProfile?.id) {
          return existingProfile.id;
        }

        // Create new profile
        const newProfile = await safeDbOperation(async () => {
          const { data, error } = await supabaseClient
            .from('profiles')
            .insert({
              ig_uid: igUserId,
              display_name: displayName
            })
            .select('id')
            .single();

          if (error) throw error;
          return data;
        }, `create profile for ${igUserId}`);

        if (newProfile?.id) {
          console.log(`Created new profile for ${displayName} (${igUserId})`);
          return newProfile.id;
        }

        return null;
      } catch (error) {
        console.error('Error in getOrCreateUserProfile:', {
          igUserId,
          displayName,
          error: error?.message
        });
        return null;
      }
    }

    let totalComments = 0;
    let totalPosts = 0;

    // Batch process comments and replies for better API efficiency
    const commentBatches: Array<{
      postId: string;
      comments: any[];
      replies: Map<string, any[]>;
    }> = [];

    // First pass: collect all posts and their comment data
    for (const post of postsData.data) {
      try {
        console.log(`Processing Instagram post ${post.id}`);
        
        // Check if post already exists
        const existingPost = await safeDbOperation(async () => {
          const { data, error } = await supabaseClient
            .from('posts')
            .select('id, media_url, media_analysis')
            .eq('id', post.id)
            .maybeSingle();
          
          if (error) throw error;
          return data;
        }, `check existing post ${post.id}`);

        if (!existingPost) {
          // Get media URL if available
          let mediaUrl = 'text only';
          if (post.media_url) {
            mediaUrl = await downloadAndStoreMedia(post.media_url, post.id);
          } else if (post.thumbnail_url) {
            // For videos, use thumbnail
            mediaUrl = await downloadAndStoreMedia(post.thumbnail_url, post.id);
          }

          // Analyze media (image/video) and cache it
          let mediaAnalysis: any = {};
          if (mediaUrl && mediaUrl !== 'text only') {
            try {
              const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(mediaUrl) || post.media_type === 'VIDEO' || post.media_type === 'REELS';
              const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(mediaUrl) || post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM';
              if (isVideo) {
                const { data } = await supabaseClient.functions.invoke('analyze-video', { body: { videoUrl: mediaUrl } });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'video', analyzed_at: new Date().toISOString(), media_url: mediaUrl };
              } else if (isImage) {
                const { data } = await supabaseClient.functions.invoke('analyze-image', { body: { imageUrl: mediaUrl } });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'image', analyzed_at: new Date().toISOString(), media_url: mediaUrl };
              }
            } catch (e) {
              console.warn('Media analysis failed (non-blocking):', e?.message || e);
            }
          }

          // Store Instagram post in database
          const postResult = await safeDbOperation(async () => {
            const { error } = await supabaseClient
              .from('posts')
              .insert({
                id: post.id,
                content: post.caption || '',
                created_at: post.timestamp,
                user_id: null, // No associated user for Instagram posts
                media_url: mediaUrl,
                platform: 'instagram',
                social_user_id: instagramBusinessAccountId,
                media_analysis: mediaAnalysis
              });

            if (error) throw error;
            return true;
          }, `store post ${post.id}`);

          if (postResult) {
            totalPosts++;
            console.log(`Stored new Instagram post ${post.id} with media: ${mediaUrl}`);
          }
        } else {
          console.log(`Instagram post ${post.id} already exists, checking analysis cache`);
          try {
            const needsAnalysis = !existingPost.media_analysis || JSON.stringify(existingPost.media_analysis) === '{}';
            const url = existingPost.media_url;
            if (needsAnalysis && url && url !== 'text only') {
              const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(url) || post.media_type === 'VIDEO' || post.media_type === 'REELS';
              const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url) || post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM';
              let mediaAnalysis: any = {};
              if (isVideo) {
                const { data } = await supabaseClient.functions.invoke('analyze-video', { body: { videoUrl: url } });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'video', analyzed_at: new Date().toISOString(), media_url: url };
              } else if (isImage) {
                const { data } = await supabaseClient.functions.invoke('analyze-image', { body: { imageUrl: url } });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'image', analyzed_at: new Date().toISOString(), media_url: url };
              }
              if (Object.keys(mediaAnalysis).length > 0) {
                await supabaseClient.from('posts').update({ media_analysis: mediaAnalysis }).eq('id', post.id);
                console.log(`Backfilled media_analysis for Instagram post ${post.id}`);
              }
            }
          } catch (e) {
            console.warn(`Failed to backfill media_analysis for Instagram post ${post.id}:`, e?.message || e);
          }
        }

        // Collect comments for batch processing using Graph API
        const commentsUrl = `https://graph.facebook.com/v23.0/${post.id}/comments?fields=id,text,timestamp,from&access_token=${instagramToken}`;
        
        try {
          const commentsData = await fetchInstagramData(commentsUrl, `comments for post ${post.id}`);
          console.log(`Found ${commentsData.data?.length || 0} comments for Instagram post ${post.id}`);
          
          if (commentsData.data && commentsData.data.length > 0) {
            const replies = new Map<string, any[]>();
            
            // Collect replies for each comment using Graph API
            for (const comment of commentsData.data) {
              const repliesUrl = `https://graph.facebook.com/v23.0/${comment.id}/replies?fields=id,text,timestamp,from&access_token=${instagramToken}`;
              
              try {
                const repliesData = await fetchInstagramData(repliesUrl, `replies for comment ${comment.id}`);
                if (repliesData.data && repliesData.data.length > 0) {
                  replies.set(comment.id, repliesData.data);
                  console.log(`Found ${repliesData.data.length} replies for comment ${comment.id}`);
                }
              } catch (error) {
                console.warn(`Failed to fetch replies for comment ${comment.id}:`, error?.message);
                replies.set(comment.id, []);
              }
              
              // Add delay to respect rate limits
              await sleep(100);
            }
            
            commentBatches.push({
              postId: post.id,
              comments: commentsData.data,
              replies
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch comments for post ${post.id}:`, error?.message);
        }

        // Add delay between posts to respect rate limits
        await sleep(200);

      } catch (error) {
        console.error(`Error processing Instagram post ${post.id}:`, {
          error: error?.message,
          stack: error?.stack
        });
      }
    }

    // Second pass: process all collected comments and replies
    for (const batch of commentBatches) {
      console.log(`Processing comment batch for post ${batch.postId}`);
      
      for (const comment of batch.comments) {
        try {
          // Check if comment already exists
          const existingComment = await safeDbOperation(async () => {
            const { data, error } = await supabaseClient
              .from('comments')
              .select('id')
              .eq('id', comment.id)
              .maybeSingle();
            
            if (error) throw error;
            return data;
          }, `check existing comment ${comment.id}`);

          if (!existingComment) {
            // Get or create user profile - FIXED: use 'name' instead of 'username'
            let userProfileId = null;
            if (comment.from?.id && comment.from?.name) {
              userProfileId = await getOrCreateUserProfile(comment.from.id, comment.from.name);
            }
            
            // Store Instagram comment in database
            const commentResult = await safeDbOperation(async () => {
              const { error } = await supabaseClient
                .from('comments')
                .insert({
                  id: comment.id,
                  post_id: batch.postId,
                  content: comment.text || '',
                  created_at: comment.timestamp,
                  role: 'user', // Instagram comments are typically from users
                  user_id: userProfileId,
                  platform: 'instagram',
                  parent_comment_id: null // Top-level comment
                });

              if (error) throw error;
              return true;
            }, `store comment ${comment.id}`);

            if (commentResult) {
              totalComments++;
              console.log(`Stored new Instagram comment ${comment.id}`);
            }
          } else {
            console.log(`Instagram comment ${comment.id} already exists, skipping`);
          }

          // Process replies for this comment with parent reference
          const commentReplies = batch.replies.get(comment.id) || [];
          for (const reply of commentReplies) {
            try {
              // Check if reply already exists
              const existingReply = await safeDbOperation(async () => {
                const { data, error } = await supabaseClient
                  .from('comments')
                  .select('id')
                  .eq('id', reply.id)
                  .maybeSingle();
                
                if (error) throw error;
                return data;
              }, `check existing reply ${reply.id}`);

              if (!existingReply) {
                // Get or create user profile for reply - FIXED: use 'name' instead of 'username'
                let replyUserProfileId = null;
                if (reply.from?.id && reply.from?.name) {
                  replyUserProfileId = await getOrCreateUserProfile(reply.from.id, reply.from.name);
                }
                
                // Store Instagram reply with parent comment reference
                const replyResult = await safeDbOperation(async () => {
                  const { error } = await supabaseClient
                    .from('comments')
                    .insert({
                      id: reply.id,
                      post_id: batch.postId,
                      content: reply.text || '',
                      created_at: reply.timestamp,
                      role: 'user',
                      user_id: replyUserProfileId,
                      platform: 'instagram',
                      parent_comment_id: comment.id // FIXED: Link reply to parent comment
                    });

                  if (error) throw error;
                  return true;
                }, `store reply ${reply.id}`);

                if (replyResult) {
                  totalComments++;
                  console.log(`Stored new Instagram reply ${reply.id} (parent: ${comment.id})`);
                }
              } else {
                console.log(`Instagram reply ${reply.id} already exists, skipping`);
              }
            } catch (error) {
              console.error(`Error processing Instagram reply ${reply.id}:`, {
                parentCommentId: comment.id,
                error: error?.message
              });
            }
          }

        } catch (error) {
          console.error(`Error processing Instagram comment ${comment.id}:`, {
            postId: batch.postId,
            error: error?.message
          });
        }
      }
    }

    console.log(`Instagram data fetch completed. Processed ${totalPosts} new posts and ${totalComments} new comments/replies.`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Instagram data fetch completed successfully',
      postsProcessed: totalPosts,
      commentsProcessed: totalComments,
      totalPostsChecked: postsData.data.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN INSTAGRAM DATA FETCH ===');
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false,
      details: {
        type: error?.constructor?.name,
        code: error?.code
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});