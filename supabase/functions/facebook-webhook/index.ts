import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Import handlers
import { processMessage } from './handlers/facebook-messages.ts';
import { processComment } from './handlers/facebook-comments.ts';
import { processInstagramComment } from './handlers/instagram-comments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== WEBHOOK REQUEST ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.log('Timestamp:', new Date().toISOString());
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    
    // Facebook webhook verification
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      console.log('Webhook verification:', { mode, token, challenge });
      
      // Support both Facebook and Instagram verify tokens
      const facebookToken = Deno.env.get('FACEBOOK_VERIFY_TOKEN') || 'facebook_verify_token_123';
      const instagramToken = Deno.env.get('INSTAGRAM_VERIFY_TOKEN') || facebookToken;
      
      if (mode === 'subscribe' && (token === facebookToken || token === instagramToken)) {
        console.log('Webhook verification successful');
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { 
          status: 403,
          headers: corsHeaders 
        });
      }
    }

    // Handle incoming messages
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('=== WEBHOOK BODY ===');
      console.log('Object type:', body.object);
      console.log('Full body:', JSON.stringify(body, null, 2));

      if (body.object === 'page') {
        for (const entry of body.entry) {
          // Handle direct messages
          if (entry.messaging) {
            for (const event of entry.messaging) {
              await processMessage(event, supabase);
            }
          }
          
          // Handle post comments
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'feed' && change.value?.item === 'comment') {
                await processComment(change.value, supabase);
              }
            }
          }
        }
      }

      // Handle Instagram comments
      if (body.object === 'instagram') {
        for (const entry of body.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'comments' && change.value) {
                await processInstagramComment(change.value, supabase);
              }
            }
          }
        }
      }

      return new Response('OK', { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in facebook-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});