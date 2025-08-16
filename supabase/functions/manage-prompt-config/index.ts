import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PromptConfiguration {
  business_name: string;
  details: string;
  system_instructions: string;
  web_search_enabled: boolean;
  file_search_enabled: boolean;
  weather_api_enabled: boolean;
  time_api_enabled: boolean;
  custom_tools: Array<{
    id: string;
    name: string;
    apiEndpoint: string;
    apiKey: string;
    description: string;
  }>;
  trigger_mode: 'keyword' | 'nlp';
  keywords: string[];
  nlp_intents: string[];
  file_references: Array<{
    id: string;
    name: string;
    type: 'upload' | 'google_docs' | 'google_sheets';
    url: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const method = req.method;

    if (method === 'GET') {
      // Legacy support for GET requests - get active configuration
      const { data, error } = await supabase
        .from('prompt_configurations')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error fetching active configuration:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      let requestBody;
      try {
        const bodyText = await req.text();
        if (!bodyText || bodyText.trim() === '') {
          console.error('Empty request body received');
          return new Response(JSON.stringify({ error: 'Request body is empty' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        requestBody = JSON.parse(bodyText);
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if this is a get_active action
      if (requestBody.action === 'get_active') {
        const { data, error } = await supabase
          .from('prompt_configurations')
          .select('*')
          .eq('is_active', true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching active configuration:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle save configuration (existing logic)
      const config: PromptConfiguration = requestBody;
      
      console.log('Saving configuration:', config);

      // Start a transaction to deactivate old configs and insert new one
      const { error: deactivateError } = await supabase
        .from('prompt_configurations')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        console.error('Error deactivating old configurations:', deactivateError);
        return new Response(JSON.stringify({ error: deactivateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Insert new configuration
      const { data, error } = await supabase
        .from('prompt_configurations')
        .insert({
          business_name: config.business_name,
          details: config.details,
          system_instructions: config.system_instructions,
          web_search_enabled: config.web_search_enabled,
          file_search_enabled: config.file_search_enabled,
          weather_api_enabled: config.weather_api_enabled,
          time_api_enabled: config.time_api_enabled,
          custom_tools: config.custom_tools,
          trigger_mode: config.trigger_mode,
          keywords: config.keywords,
          nlp_intents: config.nlp_intents,
          file_references: config.file_references,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving configuration:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Configuration saved successfully:', data.id);

      return new Response(JSON.stringify({ 
        message: 'Configuration saved successfully', 
        data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manage-prompt-config function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});