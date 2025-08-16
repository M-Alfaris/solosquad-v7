import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type IntentMap = Record<string, string[]>;

const intentKeywords: IntentMap = {
  product_question: ['price', 'cost', 'feature', 'spec', 'model', 'available', 'availability', 'shipping', 'return', 'refund'],
  support_request: ['help', 'support', 'issue', 'problem', 'not working', 'broken', 'error', 'bug'],
  order_status: ['order', 'tracking', 'where is', 'status', 'delivery', 'shipped'],
  pricing_question: ['price', 'cost', 'discount', 'offer', 'deal', 'coupon'],
  technical_issue: ['crash', 'lag', 'slow', 'cant login', "can't login", 'password', 'reset', 'network'],
  greeting: ['hello', 'hi', 'hey', 'good morning', 'good evening'],
  testimonial: ['love', 'like', 'great', 'amazing', 'best', 'recommend'],
};

function localDetect(text: string) {
  const t = text.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [intent, keys] of Object.entries(intentKeywords)) {
    let score = 0;
    for (const k of keys) {
      if (t.includes(k)) score += 1;
    }
    if (score > 0) scores[intent] = Math.min(1, score / Math.max(3, keys.length));
  }
  // Ensure at least one intent
  if (Object.keys(scores).length === 0) {
    scores.greeting = 0.2;
  }
  const intents = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v >= 0.2)
    .map(([k]) => k);
  return { intents, confidence: scores };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    // Try OpenAI-based detection first if available
    if (openAIApiKey) {
      try {
        const system = 'You are an intent detector. Given a user message, return a strict JSON with keys "intents" (array of strings) and "confidence" (object mapping intent->0..1). Use concise intent names like product_question, support_request, order_status, pricing_question, technical_issue, greeting. Do not include any extra text.';
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: `Message: ${text}\nRespond with JSON only.` }
            ],
            temperature: 0.1,
            max_tokens: 200
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.intents) && typeof parsed.confidence === 'object') {
              return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          } catch (_) {
            // fall through to local
          }
        }
      } catch (e) {
        console.error('OpenAI intent detection failed, falling back to local:', e);
      }
    }

    const detected = localDetect(text);
    return new Response(JSON.stringify(detected), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('intent-analysis error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
