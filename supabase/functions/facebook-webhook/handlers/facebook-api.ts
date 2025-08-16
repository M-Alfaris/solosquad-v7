export async function sendFacebookMessage(recipientId: string, messageText: string) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');
  
  if (!pageAccessToken || !pageId) {
    console.error('Missing Facebook credentials');
    return;
  }

  const response = await fetch(`https://graph.facebook.com/v23.0/${pageId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pageAccessToken}`
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText }
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('Facebook API error:', result);
    throw new Error(`Facebook API error: ${result.error?.message || 'Unknown error'}`);
  }
  
  return result;
}

export async function replyToComment(commentId: string, messageText: string) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  
  if (!pageAccessToken) {
    console.error('Missing Facebook Page Access Token');
    return;
  }

  console.log(`Attempting to reply to comment ${commentId} with message: ${messageText}`);

  const response = await fetch(`https://graph.facebook.com/v23.0/${commentId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: messageText,
      access_token: pageAccessToken
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('Facebook Comment API error:', result);
    console.error('Comment ID used:', commentId);
    console.error('Message:', messageText);
    throw new Error(`Facebook Comment API error: ${result.error?.message || 'Unknown error'}`);
  }
  
  console.log('Successfully replied to comment:', result);
  return result;
}

export async function replyToPost(postId: string, messageText: string) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  
  if (!pageAccessToken) {
    console.error('Missing Facebook Page Access Token');
    return;
  }

  console.log(`Attempting to reply to post ${postId} with message: ${messageText}`);

  const response = await fetch(`https://graph.facebook.com/v23.0/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: messageText,
      access_token: pageAccessToken
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error('Facebook Post Comment API error:', result);
    console.error('Post ID used:', postId);
    console.error('Message:', messageText);
    throw new Error(`Facebook Post Comment API error: ${result.error?.message || 'Unknown error'}`);
  }
  
  console.log('Successfully replied to post:', result);
  return result;
}