import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function applyChannelFormatting(text: string, channel?: string) {
  let out = text.trim();
  if (channel?.includes('facebook')) {
    // Keep replies concise on FB
    out = out.slice(0, 900);
  }
  if (channel?.includes('instagram')) {
    out = out.slice(0, 900);
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, intents, channel, postContent, contextualInstructions } = await req.json();

    if (!text || !Array.isArray(intents) || intents.length === 0) {
      return new Response(JSON.stringify({ error: 'text and intents[] are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query relevant agents in parallel using the existing process-ai-message function
    const calls = intents.map((intent: string) => {
      const instructions = `You are an expert agent for intent: ${intent}. Respond ONLY to that intent concisely. If irrelevant, return an empty string.`;
      return supabase.functions.invoke('process-ai-message', {
        body: {
          message: text,
          senderId: 'merge-agent',
          sessionId: null,
          postContent,
          contextualInstructions: `${contextualInstructions || ''}\n\n${instructions}`
        }
      });
    });

    const results = await Promise.allSettled(calls);

    const parts: string[] = [];
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value?.data?.response) {
        const clean = (r.value.data.response as string).trim();
        if (clean) parts.push(`- ${clean}`);
      } else if (r.status === 'rejected') {
        console.error('Agent call failed for intent', intents[idx], r.reason);
      }
    });

    let combined = parts.join('\n');


    // If nothing meaningful, provide a generic helpful response
    if (!combined) {
      combined = 'Thanks for your message! Could you clarify what you need help with (product info, pricing, order status, or support)?';
    }

    const response = applyChannelFormatting(combined, channel);

    return new Response(JSON.stringify({ response, intents, channel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('merge-agent error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
