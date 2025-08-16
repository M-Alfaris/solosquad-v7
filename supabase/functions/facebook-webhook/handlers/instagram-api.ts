export async function replyToInstagramComment(commentId: string, replyText: string) {
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  
  if (!accessToken) {
    console.error('INSTAGRAM_ACCESS_TOKEN not found');
    return;
  }

  console.log('Attempting to reply to Instagram comment:', { commentId, replyText });

  // Instagram Graph API endpoint for replying to comments
  const url = `https://graph.facebook.com/v23.0/${commentId}/replies`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        message: replyText,
        access_token: accessToken
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Instagram comment reply sent successfully:', result);
      return result;
    } else {
      console.error('Instagram API error:', result);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // If the reply fails, try a different approach - replying to the media instead
      if (result.error?.code === 100 || result.error?.code === 10) {
        console.log('Trying alternative approach: replying to media');
        return await replyToInstagramMedia(commentId, replyText, accessToken);
      }
    }
  } catch (error) {
    console.error('Error replying to Instagram comment:', error);
  }
}

async function replyToInstagramMedia(commentId: string, replyText: string, accessToken: string) {
  try {
    // Get comment details first to extract media ID
    const commentResponse = await fetch(`https://graph.facebook.com/v23.0/${commentId}?fields=media&access_token=${accessToken}`);
    const commentData = await commentResponse.json();
    
    if (!commentData.media?.id) {
      console.error('Could not get media ID from comment');
      return;
    }
    
    const mediaId = commentData.media.id;
    console.log('Posting comment to media:', mediaId);
    
    // Post a new comment on the media
    const response = await fetch(`https://graph.facebook.com/v23.0/${mediaId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        message: replyText,
        access_token: accessToken
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Instagram media comment posted successfully:', result);
      return result;
    } else {
      console.error('Instagram media comment error:', result);
    }
  } catch (error) {
    console.error('Error posting comment to Instagram media:', error);
  }
}