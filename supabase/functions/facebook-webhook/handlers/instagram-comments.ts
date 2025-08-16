// Helper function to check if a user is an admin
async function checkIfAdminComment(userId: string, supabase: any): Promise<boolean> {
  try {
    // Check if the user has admin role in our system
    const { data: profile } = await supabase
      .from('profiles')
      .select('ig_uid')
      .eq('ig_uid', userId)
      .maybeSingle();
    
    if (profile) {
      // If user exists in our system, they could be an admin
      return true; // For now, treat authenticated users as potential admins
    }
    
    return false;
  } catch (error) {
    console.error('Error checking Instagram admin status:', error);
    return false;
  }
}

export async function processInstagramComment(commentData: any, supabase: any) {
  const commentId = commentData.id;
  const commentText = commentData.text;
  const postId = commentData.media?.id || 'unknown';
  const fromId = commentData.from?.id;
  
  // Check if this is a comment from an admin
  const isAdminComment = await checkIfAdminComment(fromId, supabase);
  
  console.log(`Processing Instagram comment from ${fromId} (admin: ${isAdminComment}): ${commentText}`);
  
  if (!commentText || !fromId) {
    console.log('Missing comment text or user ID, skipping');
    return;
  }

  try {
    // First, ensure the Instagram media/post exists in the posts table
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (!existingPost) {
      console.log('Instagram post not found in database, creating post entry');
      // Create a minimal post entry for the Instagram media
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          id: postId,
          content: `Instagram media (ID: ${postId})`,
          created_at: new Date().toISOString(),
          user_id: null // Instagram posts don't have user_id in our system
        });

      if (postError) {
        console.error('Error creating post entry:', postError);
        return;
      }
      console.log('Instagram post entry created successfully');
    }

    // Check if comment already exists to avoid duplicates
    const { data: existingComment } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .maybeSingle();

    if (existingComment) {
      console.log('Comment already processed, skipping');
      return;
    }

    // Store the comment with appropriate role
    const commentRole = isAdminComment ? 'admin' : 'follower';
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        id: commentId,
        post_id: postId,
        content: commentText,
        role: commentRole,
        created_at: new Date().toISOString(),
        source_channel: 'instagram_comment'
      })
      .select()
      .maybeSingle();

    if (commentError) {
      console.error('Error storing comment:', commentError);
      return;
    }

    console.log('Comment stored:', comment);

    // Get active prompt configuration for trigger analysis
    const { data: configResponse, error: configError } = await supabase.functions.invoke('manage-prompt-config', {
      body: { action: 'get_active' }
    });
    
    let shouldTrigger = false;
    
    if (configError || !configResponse?.data) {
      console.log('No active configuration found, using default trigger logic');
      // Default: Check if AI should respond (contains "ai" keyword or admin commands)
      const cleanedText = commentText.trim().toLowerCase();
      const isAiTriggered = /\bai\b/i.test(cleanedText);
      const isAdminCommand = isAdminComment && /\b(ai\s+summarise|ai\s+summarize|ai\s+analyze|ai\s+explain)\b/i.test(cleanedText);
      
      shouldTrigger = isAiTriggered || isAdminCommand;
    } else {
      // Use new trigger analysis system
      const promptConfig = configResponse.data;
      const triggerConfig = {
        mode: promptConfig.trigger_mode,
        keywords: promptConfig.keywords,
        nlpIntents: promptConfig.nlp_intents
      };
      
      const { data: triggerResponse, error: triggerError } = await supabase.functions.invoke('analyze-trigger', {
        body: { text: commentText, triggerConfig }
      });
      
      // Special handling for admin commands
      if (isAdminComment) {
        const adminCommands = /\b(ai\s+summarise|ai\s+summarize|ai\s+analyze|ai\s+explain)\b/i;
        if (adminCommands.test(commentText)) {
          console.log('Admin command detected, proceeding with AI response');
          shouldTrigger = true;
        } else if (triggerError || !triggerResponse.shouldTrigger) {
          console.log(`Admin comment but no AI trigger: ${triggerResponse?.reason || 'No trigger detected'}`);
          return;
        } else {
          shouldTrigger = true;
        }
      } else if (triggerError || !triggerResponse.shouldTrigger) {
        console.log(`Trigger analysis: ${triggerResponse?.reason || 'No trigger detected'}`);
        return;
      } else {
        shouldTrigger = true;
      }
      
      console.log(`Trigger detected: ${triggerResponse?.reason || 'Admin command'}`);
    }
    
    if (!shouldTrigger) {
      console.log('AI not triggered for Instagram comment');
      return;
    }

    console.log('AI triggered for Instagram comment, processing...');
    
    // Get the post content for context
    const { data: post } = await supabase
      .from('posts')
      .select('content, media_url, media_analysis')
      .eq('id', postId)
      .maybeSingle();

    // Get comment thread context (parent comment and sibling replies)
    let parentCommentContext = '';
    let threadContext = '';
    
    try {
      const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
      
      // First, get the comment details to check if it has a parent
      const commentDetailsResponse = await fetch(`https://graph.facebook.com/v23.0/${commentId}?fields=parent&access_token=${accessToken}`);
      
      if (commentDetailsResponse.ok) {
        const commentDetails = await commentDetailsResponse.json();
        const parentCommentId = commentDetails.parent?.id;
        
        if (parentCommentId) {
          console.log('This is a reply to Instagram comment:', parentCommentId);
          
          // Fetch parent comment content
          const parentResponse = await fetch(`https://graph.facebook.com/v23.0/${parentCommentId}?fields=text,from&access_token=${accessToken}`);
          if (parentResponse.ok) {
            const parentData = await parentResponse.json();
            parentCommentContext = parentData.text || '';
            const parentAuthor = parentData.from?.username || 'Unknown';
            console.log('Parent comment context:', parentCommentContext);
            
            // Fetch other replies to the same parent comment for thread context
            const repliesResponse = await fetch(`https://graph.facebook.com/v23.0/${parentCommentId}/replies?fields=text,from&access_token=${accessToken}`);
            if (repliesResponse.ok) {
              const repliesData = await repliesResponse.json();
              const otherReplies = repliesData.data?.filter((reply: any) => reply.id !== commentId) || [];
              
              if (otherReplies.length > 0) {
                threadContext = otherReplies.map((reply: any) => 
                  `${reply.from?.username || 'Unknown'}: ${reply.text || ''}`
                ).join('\n');
                console.log('Thread context with other replies:', threadContext);
              }
            }
          }
        } else {
          // This is a top-level comment, check for direct replies to this comment
          const repliesResponse = await fetch(`https://graph.facebook.com/v23.0/${commentId}/replies?fields=text,from&access_token=${accessToken}`);
          if (repliesResponse.ok) {
            const repliesData = await repliesResponse.json();
            const replies = repliesData.data || [];
            
            if (replies.length > 0) {
              threadContext = replies.map((reply: any) => 
                `${reply.from?.username || 'Unknown'}: ${reply.text || ''}`
              ).join('\n');
              console.log('Existing replies to this comment:', threadContext);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Instagram comment thread context:', error);
    }

    // Analyze media content if present, but prefer cached analysis
    let mediaAnalysis = '';
    if (post?.media_analysis && JSON.stringify(post.media_analysis) !== '{}') {
      mediaAnalysis = post.media_analysis.summary || JSON.stringify(post.media_analysis);
    } else if (post?.media_url && post.media_url !== 'text only') {
      try {
        console.log('Instagram post contains media, analyzing content...');
        
        // Check if it's a video or image
        const isVideo = /(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(post.media_url) || post.media_url.includes('REELS');
        const isImage = /(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(post.media_url);
        
        if (isVideo) {
          const { data: videoAnalysisResult } = await supabase.functions.invoke('analyze-video', {
            body: { videoUrl: post.media_url }
          });
          
          if (videoAnalysisResult?.success) {
            mediaAnalysis = videoAnalysisResult.analysis;
          }
        } else if (isImage) {
          const { data: imageAnalysisResult } = await supabase.functions.invoke('analyze-image', {
            body: { imageUrl: post.media_url }
          });
          
          if (imageAnalysisResult?.success) {
            mediaAnalysis = imageAnalysisResult.analysis;
          }
        }
      } catch (error) {
        console.error('Error analyzing media:', error);
      }
    }

    // Create chat session for tracking
    const sessionUserRole = isAdminComment ? 'admin' : 'follower';
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: parseInt(fromId),
        chat_id: `instagram_comment_${commentId}`,
        messages: JSON.stringify([{
          role: 'user',
          content: commentText,
          platform: 'instagram',
          post_id: postId,
          timestamp: new Date().toISOString()
        }]),
        status: 'processing',
        channel_type: 'comment',
        user_role: sessionUserRole
      })
      .select()
      .maybeSingle();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
    }

    // Intent analysis and routing before AI processing
    const { data: intentData, error: intentError } = await supabase.functions.invoke('intent-analysis', {
      body: { text: commentText, channel: 'instagram_comment' }
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
        body: { 
          text: commentText, 
          intents, 
          channel: 'instagram_comment', 
          postContent: post?.content || '', 
          contextualInstructions: `This is an Instagram comment. ${post?.content ? `The user commented on a post with content: \"${post.content}\". ` : ''}${mediaAnalysis ? `The post contains media with this analysis: \"${mediaAnalysis}\". ` : ''}${parentCommentContext ? `This comment is a reply to: \"${parentCommentContext}\". ` : ''}${threadContext ? `Other messages in this conversation thread include: ${threadContext}. ` : ''}Please respond helpfully and professionally as a comment reply considering the full conversation context.`
        }
      });
      aiResponse = merged;
      aiError = mergeErr;
    } else {
      const { data, error } = await supabase.functions.invoke('process-ai-message', {
        body: {
          message: commentText,
          senderId: fromId,
          sessionId: session?.id,
          context: 'instagram_comment',
          postContent: post?.content || '',
          contextualInstructions: `This is an Instagram comment. ${post?.content ? `The user commented on a post with content: \"${post.content}\". ` : ''}${mediaAnalysis ? `The post contains media with this analysis: \"${mediaAnalysis}\". ` : ''}${parentCommentContext ? `This comment is a reply to: \"${parentCommentContext}\". The user is responding to this parent comment. ` : ''}${threadContext ? `Other messages in this conversation thread include: ${threadContext}. Use this context to understand the ongoing conversation. ` : ''}Please respond helpfully and professionally as a comment reply considering the full conversation context.`
        }
      });
      aiResponse = data;
      aiError = error;
    }

    if (aiError) {
      console.error('Error calling AI function:', aiError);
      return;
    }

    console.log('AI Response for Instagram comment:', aiResponse);
    
    // Store AI response as a comment reply
    if (aiResponse?.response) {
      const { error: replyError } = await supabase
        .from('comments')
        .insert({
          id: `${commentId}_reply_${Date.now()}`,
          post_id: postId,
          content: aiResponse.response,
          role: 'ai_agent',
          created_at: new Date().toISOString(),
          source_channel: 'instagram_comment'
        });

      if (replyError) {
        console.error('Error storing AI reply:', replyError);
      } else {
        console.log('AI reply stored successfully');
        
        // Reply to the Instagram comment
        const { replyToInstagramComment } = await import('./instagram-api.ts');
        await replyToInstagramComment(commentId, aiResponse.response);
        
        // Update session if it was created
        if (session) {
          await supabase
            .from('chat_sessions')
            .update({ 
              status: 'completed',
              messages: JSON.stringify([
                {
                  role: 'user',
                  content: commentText,
                  platform: 'instagram',
                  post_id: postId,
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
        }
      }
    }

  } catch (error) {
    console.error('Error processing Instagram comment:', error);
  }
}