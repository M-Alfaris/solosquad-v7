// Helper function to check if a user is an admin
async function checkIfAdminComment(userId: string, supabase: any): Promise<boolean> {
  try {
    // Check if the user has admin role in our system
    const { data: profile } = await supabase
      .from('profiles')
      .select('fb_uid')
      .eq('fb_uid', userId)
      .maybeSingle();
    
    if (profile) {
      // If user exists in our system, they could be an admin
      // You can add additional admin role checks here
      return true; // For now, treat authenticated users as potential admins
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export async function processComment(commentData: any, supabase: any) {
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  const comment = commentData.message || '';
  const commentId = commentData.comment_id;
  const postId = commentData.post_id;
  const fromId = commentData.from?.id;
  
  console.log(`Processing comment ${commentId} on post ${postId}:`, comment);
  
  // Check if this is a comment from an admin or the page itself
  const isPageComment = fromId === pageId;
  const isAdminComment = await checkIfAdminComment(fromId, supabase);
  
  // Don't respond to AI agent comments to prevent infinite loops
  if (isPageComment && !isAdminComment) {
    console.log('Ignoring comment from page itself (likely AI response)');
    return;
  }
  
  try {
    // Get active prompt configuration for trigger analysis
    const { data: configResponse, error: configError } = await supabase.functions.invoke('manage-prompt-config', {
      body: { action: 'get_active' }
    });
    
    if (configError || !configResponse?.data) {
      console.log('No active configuration found, using default trigger logic');
    
      const rawMessage = comment;
      const cleanedMessage = rawMessage.trim().toLowerCase();
    
      // AI is triggered if message starts with "ai" OR ends with "ai" OR is just "ai"
      // and 'ai' is treated as a word, not part of another word
      // Also check for admin commands
      const isAiTriggered = /^ai\b/.test(cleanedMessage) || /\bai$/.test(cleanedMessage) || cleanedMessage === 'ai';
      const isAdminCommand = isAdminComment && /\b(ai\s+summarise|ai\s+summarize|ai\s+analyze|ai\s+explain)\b/i.test(cleanedMessage);
    
      if (!isAiTriggered && !isAdminCommand) {
        console.log('AI not triggered (no valid "ai" prefix/suffix or admin command)');
        return;
      }
    }
    else {
      // Use new trigger analysis system
      const promptConfig = configResponse.data;
      const triggerConfig = {
        mode: promptConfig.trigger_mode,
        keywords: promptConfig.keywords,
        nlpIntents: promptConfig.nlp_intents
      };
      
      const { data: triggerResponse, error: triggerError } = await supabase.functions.invoke('analyze-trigger', {
        body: { text: comment, triggerConfig }
      });
      
      // Special handling for admin commands
      if (isAdminComment) {
        const adminCommands = /\b(ai\s+summarise|ai\s+summarize|ai\s+analyze|ai\s+explain)\b/i;
        if (adminCommands.test(comment)) {
          console.log('Admin command detected, proceeding with AI response');
        } else {
          // For admin comments, also check trigger analysis but be more permissive
          if (triggerError) {
            console.log('Trigger analysis failed for admin comment, but proceeding due to admin status');
          } else if (!triggerResponse.shouldTrigger) {
            // As an admin, if the comment contains any of the keywords, we should respond
            const containsKeyword = promptConfig.keywords.some((keyword: string) => 
              comment.toLowerCase().includes(keyword.toLowerCase())
            );
            if (containsKeyword) {
              console.log('Admin comment contains configured keyword, proceeding with AI response');
            } else {
              console.log(`Admin comment but no AI trigger: ${triggerResponse?.reason || 'No trigger detected'}`);
              return;
            }
          } else {
            console.log(`Admin trigger detected: ${triggerResponse?.reason}`);
          }
        }
      } else if (triggerError || !triggerResponse.shouldTrigger) {
        console.log(`Trigger analysis: ${triggerResponse?.reason || 'No trigger detected'}`);
        return;
      } else {
        console.log(`Trigger detected: ${triggerResponse?.reason}`);
      }
    }
    
    // Get the original post content for context
    let postContent = '';
    let videoAnalysis = '';
    if (postId) {
      // First try to get post content from our database
      try {
        const { data: storedPost } = await supabase
          .from('posts')
          .select('content, media_url, media_analysis')
          .eq('id', postId)
          .maybeSingle();
        
        if (storedPost?.content) {
          postContent = storedPost.content;
          console.log('Retrieved post content from database:', postContent);
          
          // Prefer cached media analysis if available
          if (storedPost.media_analysis && JSON.stringify(storedPost.media_analysis) !== '{}') {
            videoAnalysis = storedPost.media_analysis.summary || JSON.stringify(storedPost.media_analysis);
          }
          
          // Analyze media content if present and not already cached
          if (!videoAnalysis && storedPost.media_url && storedPost.media_url !== 'text only') {
            try {
              // Check if it's a video or image
              const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(storedPost.media_url);
              const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(storedPost.media_url);
              
              if (isVideo) {
                console.log('Post contains video, analyzing content...');
                const { data: videoAnalysisResult } = await supabase.functions.invoke('analyze-video', {
                  body: { videoUrl: storedPost.media_url }
                });
                
                if (videoAnalysisResult?.success) {
                  videoAnalysis = videoAnalysisResult.analysis;
                }
              } else if (isImage) {
                console.log('Post contains image, analyzing content...');
                const { data: imageAnalysisResult } = await supabase.functions.invoke('analyze-image', {
                  body: { imageUrl: storedPost.media_url }
                });
                
                if (imageAnalysisResult?.success) {
                  videoAnalysis = imageAnalysisResult.analysis; // Use same variable for consistency
                }
              }
            } catch (error) {
              console.error('Error analyzing media:', error);
            }
          }
        } else {
          console.log('Post not found in database, fetching from Facebook API...');
          // Fallback to Facebook API
          const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
          const postResponse = await fetch(`https://graph.facebook.com/v23.0/${postId}?fields=message&access_token=${pageAccessToken}`);
          
          if (postResponse.ok) {
            const postData = await postResponse.json();
            postContent = postData.message || '';
            console.log('Successfully retrieved post content from Facebook API:', postContent);
          } else {
            const errorData = await postResponse.json();
            console.error('Facebook API error when fetching post:', errorData);
          }
        }
      } catch (error) {
        console.error('Error fetching post content:', error);
      }
    }

    // Get comment thread context (parent comment and sibling replies)
    let parentCommentContext = '';
    let threadContext = '';
    
    try {
      const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
      
      // First, get the comment details to check if it has a parent
      const commentDetailsResponse = await fetch(`https://graph.facebook.com/v23.0/${commentId}?fields=parent&access_token=${pageAccessToken}`);
      
      if (commentDetailsResponse.ok) {
        const commentDetails = await commentDetailsResponse.json();
        const parentCommentId = commentDetails.parent?.id;
        
        if (parentCommentId) {
          console.log('This is a reply to comment:', parentCommentId);
          
          // Fetch parent comment content
          const parentResponse = await fetch(`https://graph.facebook.com/v23.0/${parentCommentId}?fields=message,from&access_token=${pageAccessToken}`);
          if (parentResponse.ok) {
            const parentData = await parentResponse.json();
            parentCommentContext = parentData.message || '';
            const parentAuthor = parentData.from?.name || 'Unknown';
            console.log('Parent comment context:', parentCommentContext);
            
            // Fetch other replies to the same parent comment for thread context
            const repliesResponse = await fetch(`https://graph.facebook.com/v23.0/${parentCommentId}/comments?fields=message,from&access_token=${pageAccessToken}`);
            if (repliesResponse.ok) {
              const repliesData = await repliesResponse.json();
              const otherReplies = repliesData.data?.filter((reply: any) => reply.id !== commentId) || [];
              
              if (otherReplies.length > 0) {
                threadContext = otherReplies.map((reply: any) => 
                  `${reply.from?.name || 'Unknown'}: ${reply.message || ''}`
                ).join('\n');
                console.log('Thread context with other replies:', threadContext);
              }
            }
          }
        } else {
          // This is a top-level comment, check for direct replies to this comment
          const repliesResponse = await fetch(`https://graph.facebook.com/v23.0/${commentId}/comments?fields=message,from&access_token=${pageAccessToken}`);
          if (repliesResponse.ok) {
            const repliesData = await repliesResponse.json();
            const replies = repliesData.data || [];
            
            if (replies.length > 0) {
              threadContext = replies.map((reply: any) => 
                `${reply.from?.name || 'Unknown'}: ${reply.message || ''}`
              ).join('\n');
              console.log('Existing replies to this comment:', threadContext);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching comment thread context:', error);
    }
    
    // Index post content to Pinecone for semantic search (non-blocking)
    if (postContent) {
      try {
        await supabase.functions.invoke('pinecone-search', {
          body: {
            action: 'index_post',
            postId: postId,
            postContent: postContent,
            postAuthor: 'Page Owner',
            postTimestamp: new Date().toISOString()
          }
        });
        console.log('Post content indexed to Pinecone');
      } catch (pineconeError) {
        console.log('Pinecone indexing failed (non-critical):', pineconeError);
      }
    }

    // Create Facebook context for better AI understanding
    let facebookContext = `This is a Facebook comment interaction.`;
    if (postContent || videoAnalysis) {
      facebookContext += ` The user commented on a post`;
      if (postContent) {
        facebookContext += ` with the following content: "${postContent}"`;
      }
      if (videoAnalysis) {
        facebookContext += ` that contains a video with this analysis: "${videoAnalysis}"`;
      }
      facebookContext += `. When the user refers to "the post", "this post", "the video", or similar terms, they are referring to this content.`;
    }
    
    // Add thread context if available
    if (parentCommentContext) {
      facebookContext += ` This comment is a reply to: "${parentCommentContext}". The user is responding to this parent comment.`;
    }
    
    if (threadContext) {
      facebookContext += ` Other messages in this conversation thread include: ${threadContext}. Use this context to understand the ongoing conversation.`;
    }
    
    facebookContext += ` Please respond to their comment helpfully and professionally, considering the full conversation context.`;
    
    // Helper function to create or get user profile
    async function getOrCreateUserProfile(fbUserId: string, displayName: string = 'Unknown User') {
      try {
        // First check if profile exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('fb_user_id', fbUserId)
          .maybeSingle();

        if (existingProfile) {
          return existingProfile.id;
        }

        // Create new profile
        const { data: newProfile, error: profileError } = await supabase
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

    // Get or create user profile for the commenter
    let userProfileId = null;
    if (fromId) {
      // Try to get the user's name from Facebook API
      try {
        const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
        const userResponse = await fetch(`https://graph.facebook.com/v23.0/${fromId}?fields=name&access_token=${pageAccessToken}`);
        
        let userName = 'Unknown User';
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userName = userData.name || 'Unknown User';
        }
        
        userProfileId = await getOrCreateUserProfile(fromId, userName);
      } catch (error) {
        console.error('Error fetching user info:', error);
        userProfileId = await getOrCreateUserProfile(fromId, 'Unknown User');
      }
    }
    
    // Store the comment interaction
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userProfileId,
        chat_id: `comment_${commentId}`,
        messages: JSON.stringify([{
          role: 'user',
          content: comment,
          original_comment: comment,
          post_content: postContent,
          timestamp: new Date().toISOString()
        }]),
        status: 'processing',
        channel_type: 'comment'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error storing comment session:', sessionError);
      return;
    }

    // Intent analysis and routing before AI processing
    const { data: intentData, error: intentError } = await supabase.functions.invoke('intent-analysis', {
      body: { text: comment, channel: 'facebook_comment' }
    });

    if (intentError) {
      console.error('Intent analysis error (non-blocking):', intentError);
    }

    const intents = intentData?.intents || [];
    const confidence = intentData?.confidence || {};

    // Store detected intents linked to this comment
    try {
      await supabase.from('detected_intents').insert({
        input_id: commentId,
        intents,
        confidence
      });
    } catch (e) {
      console.error('Error storing detected intents:', e);
    }

    // Route to merge agent if multiple intents, otherwise default AI
    let aiResponse: any, aiError: any;
    if (intents.length > 1) {
      const { data: merged, error: mergeErr } = await supabase.functions.invoke('merge-agent', {
        body: { text: comment, intents, channel: 'facebook_comment', postContent, contextualInstructions: facebookContext }
      });
      aiResponse = merged;
      aiError = mergeErr;
    } else {
      console.log('Invoking process-ai-message for Facebook comment', { commentId, postId, fromId });
      const { data, error } = await supabase.functions.invoke('process-ai-message', {
        body: {
          message: comment,
          senderId: fromId,
          sessionId: session.id,
          context: 'comment_reply',
          postContent: postContent,
          contextualInstructions: facebookContext
        }
      });
      console.log('process-ai-message response for Facebook comment', { commentId, hasData: !!data, hasError: !!error });
      aiResponse = data;
      aiError = error;
    }

    if (aiError) {
      console.error('Error calling AI function for comment:', aiError);
      return;
    }

    // Reply to the comment with user mention
    let aiReplyCommentId = null;
    try {
      const replyText = (aiResponse?.response || '').trim();
      if (!replyText) {
        console.warn('No AI response content to reply with; skipping Facebook reply');
        aiReplyCommentId = null;
      } else {
        const mentionedResponse = `@[${fromId}] ${replyText}`;
        const { replyToComment } = await import('./facebook-api.ts');
        const response = await replyToComment(commentId, mentionedResponse);
        console.log('Comment reply response:', response);
        
        // Extract the comment ID from the response if available
        if (response && response.id) {
          aiReplyCommentId = response.id;
        }
      }
    } catch (commentError) {
      console.error('Failed to reply to comment, trying alternative approach:', commentError);
      
      // Alternative: Try replying to the post itself instead of the comment
      try {
        const replyText = (aiResponse?.response || '').trim();
        if (replyText) {
          const { replyToPost } = await import('./facebook-api.ts');
          const postResponse = await replyToPost(postId, `@[${fromId}] ${replyText}`);
          console.log('Post reply response:', postResponse);
          
          // Extract the comment ID from the response if available
          if (postResponse && postResponse.id) {
            aiReplyCommentId = postResponse.id;
          }
        }
      } catch (postError) {
        console.error('Failed to reply to post as well:', postError);
      }
    }

    // Store the comment in the comments table with appropriate role
    try {
      const commentRole = isAdminComment ? 'admin' : 'follower';
      const { error: commentStoreError } = await supabase
        .from('comments')
        .insert({
          id: commentId,
          post_id: postId,
          content: comment,
          created_at: new Date().toISOString(),
          role: commentRole,
          user_id: userProfileId,
          source_channel: 'facebook_comment'
        });

      if (commentStoreError) {
        console.error('Error storing comment in comments table:', commentStoreError);
      } else {
        console.log('Successfully stored comment in comments table');
      }
    } catch (error) {
      console.error('Error storing comment:', error);
    }

    // Store the AI reply as a comment if we got a comment ID
    if (aiReplyCommentId) {
      try {
        const { error: aiCommentStoreError } = await supabase
        .from('comments')
        .insert({
          id: aiReplyCommentId,
          post_id: postId,
          content: aiResponse.response,
          created_at: new Date().toISOString(),
          role: 'ai_agent',
          user_id: null, // AI agent doesn't have a profile
          source_channel: 'facebook_comment'
        });

        if (aiCommentStoreError) {
          console.error('Error storing AI reply in comments table:', aiCommentStoreError);
        } else {
          console.log('Successfully stored AI reply in comments table');
        }
      } catch (error) {
        console.error('Error storing AI reply:', error);
      }
    }

    // Update session status with full conversation
    await supabase
      .from('chat_sessions')
      .update({ 
        status: 'completed',
        messages: JSON.stringify([
          {
            role: 'user',
            content: comment,
            original_comment: comment,
            post_content: postContent,
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant',
            content: aiResponse.response,
            timestamp: new Date().toISOString()
          }
        ])
      })
      .eq('id', session.id);

  } catch (error) {
    console.error('Error processing comment:', error);
    
    // Reply with error message
    const { replyToComment } = await import('./facebook-api.ts');
    await replyToComment(commentId, 'Sorry, there was an error processing your comment.');
  }
}