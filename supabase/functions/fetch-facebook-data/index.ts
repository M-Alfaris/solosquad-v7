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
    console.log('=== Facebook Data Fetch Started ===');
    
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

    const facebookToken = requestBody.accessToken || Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const pageId = requestBody.pageId || Deno.env.get('FACEBOOK_PAGE_ID');
    const userId = requestBody.userId;

    console.log('Credentials check:', {
      hasFacebookToken: !!facebookToken,
      hasPageId: !!pageId,
      hasUserId: !!userId,
      pageId: pageId
    });

    if (!facebookToken || !pageId) {
      throw new Error('Missing Facebook credentials');
    }

    // Helper function to download and store media
    async function downloadAndStoreMedia(mediaUrl: string, postId: string): Promise<string> {
      try {
        console.log(`Downloading media for post ${postId}: ${mediaUrl}`);
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          console.log(`Failed to download media: ${response.status}`);
          return 'text only';
        }
        
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const extension = contentType.includes('image/') ? 
          (contentType.split('/')[1] || 'jpg') : 
          (contentType.includes('video/') ? 'mp4' : 'bin');
        
        const fileName = `${postId}-${Date.now()}.${extension}`;
        const arrayBuffer = await response.arrayBuffer();
        
        const { data, error } = await supabaseClient.storage
          .from('post-media')
          .upload(fileName, arrayBuffer, {
            contentType,
            upsert: false
          });

        if (error) {
          console.error(`Storage error for ${fileName}:`, error);
          return 'text only';
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from('post-media')
          .getPublicUrl(fileName);

        console.log(`Media stored successfully: ${publicUrl}`);
        return publicUrl;
      } catch (error) {
        console.error('Media download error:', error);
        return 'text only';
      }
    }

    // Fetch posts from Facebook API v23.0 with media attachments
    console.log('Fetching posts from Facebook API v23.0...');
    const postsUrl = `https://graph.facebook.com/v23.0/${pageId}/posts?fields=id,message,created_time,permalink_url,attachments{media,url}&limit=50&access_token=${facebookToken}`;
    
    const postsResponse = await fetch(postsUrl);
    console.log('Facebook API Response status:', postsResponse.status);
    
    if (!postsResponse.ok) {
      const errorText = await postsResponse.text();
      console.error('Facebook API error:', errorText);
      throw new Error(`Facebook API request failed: ${errorText}`);
    }

    const postsData = await postsResponse.json();
    console.log(`Fetched ${postsData.data?.length || 0} posts`);

    if (!postsData.data || postsData.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No posts found',
        postsProcessed: 0,
        commentsProcessed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper function to create or get user profile
    async function getOrCreateUserProfile(fbUserId: string, displayName: string): Promise<string> {
      try {
        // First check if profile exists
        const { data: existingProfile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('fb_user_id', fbUserId)
          .maybeSingle();

        if (existingProfile) {
          return existingProfile.id;
        }

        // Create new profile
        const { data: newProfile, error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            fb_user_id: fbUserId,
            display_name: displayName
          })
          .select('id')
          .single();

        if (profileError) {
          console.error(`Error creating profile for ${fbUserId}:`, profileError);
          return null;
        }

        console.log(`Created new profile for ${displayName} (${fbUserId})`);
        return newProfile.id;
      } catch (error) {
        console.error('Error in getOrCreateUserProfile:', error);
        return null;
      }
    }

    let totalComments = 0;

    // Process each post
    for (const post of postsData.data) {
      try {
        console.log(`Processing post ${post.id}`);
        
        // Check if post already exists
          const { data: existingPost } = await supabaseClient
          .from('posts')
          .select('id, media_url, media_analysis')
          .eq('id', post.id)
          .maybeSingle();

        if (!existingPost) {
          // Get media URL if available
          let mediaUrl = 'text only';
          if (post.attachments?.data?.[0]?.media?.image?.src) {
            const mediaDownloadUrl = post.attachments.data[0].media.image.src;
            mediaUrl = await downloadAndStoreMedia(mediaDownloadUrl, post.id);
          } else if (post.attachments?.data?.[0]?.url) {
            // For shared links/videos, try to get the media
            const attachmentUrl = post.attachments.data[0].url;
            if (attachmentUrl.includes('video') || attachmentUrl.includes('photo') || attachmentUrl.includes('image')) {
              mediaUrl = await downloadAndStoreMedia(attachmentUrl, post.id);
            }
          }

          // Analyze media (image/video) once and cache it
          let mediaAnalysis: any = {};
          if (mediaUrl && mediaUrl !== 'text only') {
            try {
              const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(mediaUrl);
              const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(mediaUrl);
              if (isVideo) {
                const { data } = await supabaseClient.functions.invoke('analyze-video', {
                  body: { videoUrl: mediaUrl }
                });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'video', analyzed_at: new Date().toISOString(), media_url: mediaUrl };
              } else if (isImage) {
                const { data } = await supabaseClient.functions.invoke('analyze-image', {
                  body: { imageUrl: mediaUrl }
                });
                if (data?.success) mediaAnalysis = { summary: data.analysis, type: 'image', analyzed_at: new Date().toISOString(), media_url: mediaUrl };
              }
            } catch (e) {
              console.warn('Media analysis failed (non-blocking):', e?.message || e);
            }
          }

          // Store post in database only if it doesn't exist
          const { error: postError } = await supabaseClient
            .from('posts')
            .insert({
              id: post.id,
              content: post.message || '',
              created_at: post.created_time,
              user_id: null, // No associated user for Facebook posts
              media_url: mediaUrl,
              media_analysis: mediaAnalysis
            });

          if (postError) {
            console.error(`Error storing post ${post.id}:`, postError);
            continue;
          }
          console.log(`Stored new post ${post.id} with media: ${mediaUrl}`);
        } else {
          // If existing post has no cached analysis, try to add it now
          try {
            const needsAnalysis = !existingPost.media_analysis || JSON.stringify(existingPost.media_analysis) === '{}' ;
            const url = existingPost.media_url;
            if (needsAnalysis && url && url !== 'text only') {
              const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(url);
              const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url);
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
                console.log(`Backfilled media_analysis for post ${post.id}`);
              }
            }
          } catch (e) {
            console.warn(`Failed to backfill media_analysis for post ${post.id}:`, e?.message || e);
          }
          console.log(`Post ${post.id} already exists, skipping`);
        }

        // Fetch comments for this post
        const commentsUrl = `https://graph.facebook.com/v23.0/${post.id}/comments?fields=id,message,created_time,from&access_token=${facebookToken}`;
        
        const commentsResponse = await fetch(commentsUrl);
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          console.log(`Found ${commentsData.data?.length || 0} comments for post ${post.id}`);
          
          if (commentsData.data) {
            for (const comment of commentsData.data) {
              try {
                // Check if comment already exists
                const { data: existingComment } = await supabaseClient
                  .from('comments')
                  .select('id')
                  .eq('id', comment.id)
                  .single();

                if (!existingComment) {
                  // Determine if comment is from AI agent (page owner) or user
                  const isPageOwner = comment.from?.id === pageId;
                  const role = isPageOwner ? 'ai_agent' : 'user';
                  
                  // Get or create user profile
                  let userProfileId = null;
                  if (comment.from?.id && comment.from?.name) {
                    userProfileId = await getOrCreateUserProfile(comment.from.id, comment.from.name);
                  }
                  
                  // Store comment in database only if it doesn't exist
                  const { error: commentError } = await supabaseClient
                    .from('comments')
                    .insert({
                      id: comment.id,
                      post_id: post.id,
                      content: comment.message || '',
                      created_at: comment.created_time,
                      role: role,
                      user_id: userProfileId
                    });

                  if (commentError) {
                    console.error(`Error storing comment ${comment.id}:`, commentError);
                  } else {
                    totalComments++;
                    console.log(`Stored new comment ${comment.id}`);
                  }
                } else {
                  console.log(`Comment ${comment.id} already exists, skipping`);
                }

                // Fetch replies to this comment
                const repliesUrl = `https://graph.facebook.com/v23.0/${comment.id}/comments?fields=id,message,created_time,from&access_token=${facebookToken}`;
                
                const repliesResponse = await fetch(repliesUrl);
                if (repliesResponse.ok) {
                  const repliesData = await repliesResponse.json();
                  console.log(`Found ${repliesData.data?.length || 0} replies for comment ${comment.id}`);
                  
                  if (repliesData.data) {
                    for (const reply of repliesData.data) {
                      try {
                        // Check if reply already exists
                        const { data: existingReply } = await supabaseClient
                          .from('comments')
                          .select('id')
                          .eq('id', reply.id)
                          .single();

                        if (!existingReply) {
                          // Determine if reply is from AI agent (page owner) or user
                          const isReplyPageOwner = reply.from?.id === pageId;
                          const replyRole = isReplyPageOwner ? 'ai_agent' : 'user';
                          
                          // Get or create user profile for reply
                          let replyUserProfileId = null;
                          if (reply.from?.id && reply.from?.name) {
                            replyUserProfileId = await getOrCreateUserProfile(reply.from.id, reply.from.name);
                          }
                          
                          // Store reply in database only if it doesn't exist
                          const { error: replyError } = await supabaseClient
                            .from('comments')
                            .insert({
                              id: reply.id,
                              post_id: post.id,
                              content: reply.message || '',
                              created_at: reply.created_time,
                              role: replyRole,
                              user_id: replyUserProfileId
                            });

                          if (replyError) {
                            console.error(`Error storing reply ${reply.id}:`, replyError);
                          } else {
                            totalComments++;
                            console.log(`Stored new reply ${reply.id}`);
                          }
                        } else {
                          console.log(`Reply ${reply.id} already exists, skipping`);
                        }
                      } catch (error) {
                        console.error(`Error processing reply ${reply.id}:`, error);
                      }
                    }
                  }
                } else {
                  console.warn(`Failed to fetch replies for comment ${comment.id}`);
                }

              } catch (error) {
                console.error(`Error processing comment ${comment.id}:`, error);
              }
            }
          }
        } else {
          console.warn(`Failed to fetch comments for post ${post.id}`);
        }

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    console.log(`Data fetch completed. Processed ${postsData.data.length} posts and ${totalComments} comments.`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Facebook data fetch completed',
      postsProcessed: postsData.data.length,
      commentsProcessed: totalComments
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== ERROR IN FACEBOOK DATA FETCH ===');
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});