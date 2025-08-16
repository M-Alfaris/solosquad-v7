import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, triggerConfig } = await req.json();

    if (!text || !triggerConfig) {
      return new Response(JSON.stringify({ 
        error: 'Text and trigger configuration required',
        shouldTrigger: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Analyzing trigger for: "${text}" with mode: ${triggerConfig.mode}`);

    let shouldTrigger = false;
    let reason = '';

    if (triggerConfig.mode === 'keyword') {
      // Keyword-based detection
      const lowerText = text.toLowerCase();
      
      for (const keyword of triggerConfig.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        
        // More flexible matching to catch edge cases
        if (
          // Exact match
          lowerText === lowerKeyword ||
          // Starts with keyword (with or without space)
          lowerText.startsWith(lowerKeyword + ' ') || 
          lowerText.startsWith(lowerKeyword) ||
          // Ends with keyword (with or without space)
          lowerText.endsWith(' ' + lowerKeyword) || 
          lowerText.endsWith(lowerKeyword) ||
          // Contains keyword as standalone word
          lowerText.includes(' ' + lowerKeyword + ' ') ||
          // Handle @mentions followed by keyword
          lowerText.includes('@') && lowerText.includes(lowerKeyword)
        ) {
          shouldTrigger = true;
          reason = `Matched keyword: "${keyword}"`;
          break;
        }
      }
    } else if (triggerConfig.mode === 'nlp') {
      // NLP intent detection using OpenAI
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        console.error('OpenAI API key not configured for NLP intent detection');
        return new Response(JSON.stringify({ 
          error: 'OpenAI API key not configured',
          shouldTrigger: false 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create intent detection prompt
      const intentPrompt = `
Analyze the following user message and determine if it matches any of these intents:
${triggerConfig.nlpIntents.map((intent: string) => `- ${intent}`).join('\n')}

User message: "${text}"

Respond with only:
- "YES: [intent_name]" if it matches an intent
- "NO" if it doesn't match any intent

Examples:
- "Can you help me with your product?" → YES: product_inquiry
- "I need support with my order" → YES: support_needed  
- "What services do you offer?" → YES: service_request
- "Hello how are you?" → NO
`;

      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
              {
                role: 'system',
                content: 'You are an intent classifier. Respond only with the format specified.'
              },
              {
                role: 'user',
                content: intentPrompt
              }
            ],
            max_tokens: 50,
            temperature: 0
          }),
        });

        const openaiData = await openaiResponse.json();
        const result = openaiData.choices[0].message.content.trim();
        
        if (result.startsWith('YES:')) {
          shouldTrigger = true;
          reason = `Detected intent: ${result.substring(4).trim()}`;
        } else {
          reason = 'No matching intent detected';
        }

      } catch (error) {
        console.error('Error in NLP intent detection:', error);
        reason = 'NLP analysis failed, fallback to no trigger';
      }
    }

    console.log(`Trigger analysis result: ${shouldTrigger}, reason: ${reason}`);

    return new Response(JSON.stringify({
      shouldTrigger,
      reason,
      mode: triggerConfig.mode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-trigger function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldTrigger: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});