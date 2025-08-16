export async function processMessage(event: any, supabase: any) {
  const senderId = event.sender.id;
  const message = event.message;
  
  if (!message) return;

  console.log(`Processing message from ${senderId}:`, message.text);

  try {
    // Store the chat session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .upsert({
        user_id: parseInt(senderId),
        chat_id: senderId,
        messages: message.text,
        status: 'processing',
        channel_type: 'dm',
        user_role: 'follower'  // DMs are typically from followers, not admins
      }, {
        onConflict: 'chat_id'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error storing chat session:', sessionError);
      return;
    }

    // Intent analysis and routing
    const { data: intentData, error: intentError } = await supabase.functions.invoke('intent-analysis', {
      body: { text: message.text, channel: 'facebook_dm' }
    });
    if (intentError) {
      console.error('Intent analysis error (non-blocking):', intentError);
    }
    const intents = intentData?.intents || [];
    const confidence = intentData?.confidence || {};

    // Store detected intents
    try {
      await supabase.from('detected_intents').insert({
        input_id: session.id,
        intents,
        confidence
      });
    } catch (e) {
      console.error('Error storing detected intents:', e);
    }

    // Route to appropriate agent
    let aiResponse: any, aiError: any;
    if (intents.length > 1) {
      const { data: merged, error: mergeErr } = await supabase.functions.invoke('merge-agent', {
        body: { text: message.text, intents, channel: 'facebook_dm' }
      });
      aiResponse = merged;
      aiError = mergeErr;
    } else {
      const { data, error } = await supabase.functions.invoke('process-ai-message', {
        body: {
          message: message.text,
          senderId: senderId,
          sessionId: session.id
        }
      });
      aiResponse = data;
      aiError = error;
    }

    if (aiError) {
      console.error('Error calling AI function:', aiError);
      return;
    }

    // Send response back to Facebook
    const { sendFacebookMessage } = await import('./facebook-api.ts');
    const response = await sendFacebookMessage(senderId, aiResponse.response);
    console.log('Facebook API response:', response);

    // Update session status
    await supabase
      .from('chat_sessions')
      .update({ 
        status: 'completed',
        messages: `${message.text}\n\nAI: ${aiResponse.response}`
      })
      .eq('id', session.id);

  } catch (error) {
    console.error('Error processing message:', error);
    
    // Send error message to user
    const { sendFacebookMessage } = await import('./facebook-api.ts');
    await sendFacebookMessage(senderId, 'Sorry, there was an error processing your message.');
  }
}