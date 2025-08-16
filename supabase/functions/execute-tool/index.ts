import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeatherData {
  current: {
    temp_c: number;
    condition: { text: string };
    humidity: number;
    wind_kph: number;
  };
  location: {
    name: string;
    country: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolName, parameters, enabledTools, fileReferences } = await req.json();

    console.log(`Executing tool: ${toolName} with parameters:`, parameters);

    // Check if tool is enabled
    if (!enabledTools || !enabledTools[toolName]) {
      return new Response(JSON.stringify({
        error: `Tool ${toolName} is not enabled`,
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any = {};

    switch (toolName) {
      case 'weatherApi':
        result = await handleWeatherAPI(parameters);
        break;
      
      case 'timeApi':
        result = await handleTimeAPI(parameters);
        break;
      
      case 'webSearch':
        result = await handleWebSearch(parameters);
        break;
      
      case 'fileSearch':
        result = await handlePineconeFileSearch(parameters, fileReferences);
        break;
      
      case 'customTool':
        result = await handleCustomTool(parameters);
        break;
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return new Response(JSON.stringify({
      success: true,
      toolName,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in execute-tool function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleWeatherAPI(params: any) {
  const { location } = params;
  
  if (!location) {
    throw new Error('Location parameter required for weather API');
  }

  // Using WeatherAPI.com (free tier)
  const weatherApiKey = Deno.env.get('WEATHER_API_KEY');
  
  if (!weatherApiKey) {
    throw new Error('Weather API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(location)}&aqi=no`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data: WeatherData = await response.json();
    
    return {
      location: `${data.location.name}, ${data.location.country}`,
      temperature: `${data.current.temp_c}°C`,
      condition: data.current.condition.text,
      humidity: `${data.current.humidity}%`,
      windSpeed: `${data.current.wind_kph} km/h`,
      summary: `Current weather in ${data.location.name}: ${data.current.temp_c}°C, ${data.current.condition.text}`
    };
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleTimeAPI(params: any) {
  const { timezone } = params;
  
  try {
    let url = 'https://worldtimeapi.org/api/ip';
    
    if (timezone) {
      url = `https://worldtimeapi.org/api/timezone/${timezone}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Time API error: ${response.status}`);
    }

    const data = await response.json();
    
    const dateTime = new Date(data.datetime);
    
    return {
      timezone: data.timezone,
      currentTime: dateTime.toLocaleString(),
      utcTime: dateTime.toISOString(),
      dayOfWeek: dateTime.toLocaleDateString('en-US', { weekday: 'long' }),
      date: dateTime.toLocaleDateString(),
      time: dateTime.toLocaleTimeString(),
      summary: `Current time in ${data.timezone}: ${dateTime.toLocaleString()}`
    };
  } catch (error) {
    throw new Error(`Failed to fetch time data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleWebSearch(params: any) {
  const { query } = params;
  
  if (!query) {
    throw new Error('Query parameter required for web search');
  }

  const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
  
  if (!tavilyApiKey) {
    throw new Error('Tavily API key not configured');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      query,
      answer: data.answer,
      results: data.results?.slice(0, 3).map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content?.substring(0, 200) + '...'
      })),
      summary: data.answer || 'Search completed, see results for details'
    };
  } catch (error) {
    throw new Error(`Failed to perform web search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleCustomTool(params: any) {
  const { apiEndpoint, apiKey, payload } = params;
  
  if (!apiEndpoint) {
    throw new Error('API endpoint required for custom tool');
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {})
    });

    const responseData = await response.json();
    
    return {
      statusCode: response.status,
      success: response.ok,
      data: responseData,
      summary: response.ok ? 'Custom tool executed successfully' : 'Custom tool execution failed'
    };
  } catch (error) {
    throw new Error(`Failed to execute custom tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handlePineconeFileSearch(params: any, fileReferences: any[]) {
  const { query } = params;
  
  if (!query) {
    throw new Error('Query parameter required for file search');
  }

  if (!fileReferences || fileReferences.length === 0) {
    return {
      query,
      results: [],
      summary: 'No files available to search'
    };
  }

  try {
    // Initialize Supabase client for Pinecone operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, ensure files are indexed in Pinecone
    const { data: indexData, error: indexError } = await supabase.functions.invoke('pinecone-search', {
      body: {
        action: 'index_files',
        fileReferences
      }
    });

    if (indexError) {
      console.error('Error indexing files:', indexError);
    }

    // Now perform the search
    const { data: searchData, error: searchError } = await supabase.functions.invoke('pinecone-search', {
      body: {
        action: 'search',
        query
      }
    });

    if (searchError) {
      throw new Error(`Pinecone search error: ${searchError.message}`);
    }

    return {
      query,
      results: searchData.results || [],
      summary: searchData.summary || 'Search completed'
    };

  } catch (error) {
    throw new Error(`Failed to perform vector file search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}