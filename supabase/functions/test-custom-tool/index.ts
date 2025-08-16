import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestToolRequest {
  apiEndpoint: string;
  apiKey?: string;
  testPayload?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { apiEndpoint, apiKey, testPayload }: TestToolRequest = await req.json();

    if (!apiEndpoint) {
      return new Response(JSON.stringify({ 
        error: 'API endpoint is required',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Testing custom tool: ${apiEndpoint}`);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Prompt-Management-Tool/1.0'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Prepare test payload
    const payload = testPayload || { test: true, message: 'Health check from prompt management system' };

    // Test the API endpoint
    const startTime = Date.now();
    let response: Response;
    let responseData: any;
    let statusCode: number;
    let responseTime: number;

    try {
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      statusCode = response.status;
      responseTime = Date.now() - startTime;

      // Try to parse response as JSON, fallback to text
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const isSuccess = statusCode >= 200 && statusCode < 300;
      
      console.log(`Tool test result: ${isSuccess ? 'SUCCESS' : 'FAILED'} (${statusCode}) in ${responseTime}ms`);

      return new Response(JSON.stringify({
        success: isSuccess,
        statusCode,
        responseTime,
        responseData,
        timestamp: new Date().toISOString(),
        endpoint: apiEndpoint
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      responseTime = Date.now() - startTime;
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      
      console.error(`Tool test failed: ${errorMessage}`);

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        responseTime,
        timestamp: new Date().toISOString(),
        endpoint: apiEndpoint
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in test-custom-tool function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});