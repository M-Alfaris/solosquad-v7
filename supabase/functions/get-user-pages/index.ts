import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-USER-PAGES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Get user pages function started");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("ERROR: Missing authorization header");
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing authorization header' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      logStep("ERROR: Invalid auth token", { authError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid auth token' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id });

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logStep("ERROR: Failed to parse request body", { parseError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let { fbAccessToken } = body;

    // If no token provided in body, try to get from user profile
    if (!fbAccessToken) {
      logStep("No access token in request, fetching from profile");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_access_token')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.user_access_token) {
        logStep("ERROR: No access token found in profile", { profileError });
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No Facebook access token found. Please connect your Facebook account first.' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      fbAccessToken = profile.user_access_token;
      logStep("Using access token from profile");
    }
    
    if (!fbAccessToken || typeof fbAccessToken !== 'string') {
      logStep("ERROR: Missing or invalid Facebook access token");
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing or invalid Facebook access token' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Fetching pages from Facebook API", { tokenLength: fbAccessToken.length });

    // Fetch user's pages from Facebook Graph API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let pagesResponse;
    try {
      pagesResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?access_token=${fbAccessToken}&fields=id,name,category,access_token,tasks`,
        { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'MyApp/1.0'
          }
        }
      );
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      logStep("ERROR: Facebook API request failed", { fetchError });
      
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Facebook API request timeout' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 408,
        });
      }
      
      throw fetchError;
    }

    logStep("Facebook API response received", { 
      status: pagesResponse.status,
      ok: pagesResponse.ok
    });

    if (!pagesResponse.ok) {
      const errorText = await pagesResponse.text();
      logStep("ERROR: Facebook API HTTP error", { 
        status: pagesResponse.status,
        statusText: pagesResponse.statusText,
        errorText
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Facebook API error (${pagesResponse.status}): ${pagesResponse.statusText}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    let pagesData;
    try {
      pagesData = await pagesResponse.json();
    } catch (jsonError) {
      logStep("ERROR: Failed to parse Facebook API response", { jsonError });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid response from Facebook API' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }
    
    if (pagesData.error) {
      logStep("ERROR: Facebook API returned error", { fbError: pagesData.error });
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Facebook API error: ${pagesData.error.message || 'Unknown error'}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Fetched user pages", { count: pagesData.data?.length || 0 });

    // Filter pages that have required permissions
    const validPages = pagesData.data?.filter((page: any) => {
      // Check if page has required tasks/permissions
      const hasRequiredPermissions = page.tasks && (
        page.tasks.includes('MANAGE') || 
        page.tasks.includes('CREATE_CONTENT') ||
        page.tasks.includes('MODERATE')
      );
      
      logStep("Checking page permissions", {
        pageId: page.id,
        pageName: page.name,
        tasks: page.tasks,
        hasPermissions: hasRequiredPermissions
      });
      
      return hasRequiredPermissions;
    }) || [];

    logStep("Filtered valid pages", { count: validPages.length });

    // Also fetch Instagram accounts linked to these pages
    const pagesWithInstagram = await Promise.all(
      validPages.map(async (page: any) => {
        try {
          const igResponse = await fetch(
            `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
            { signal: AbortSignal.timeout(5000) }
          );
          
          if (igResponse.ok) {
            const igData = await igResponse.json();
            if (igData.instagram_business_account) {
              logStep("Found Instagram account for page", {
                pageId: page.id,
                igAccountId: igData.instagram_business_account.id
              });
              return {
                ...page,
                instagram_business_account: igData.instagram_business_account
              };
            }
          }
        } catch (igError) {
          logStep("Failed to fetch Instagram account for page", {
            pageId: page.id,
            error: igError.message
          });
        }
        return page;
      })
    );

    return new Response(JSON.stringify({ 
      success: true, 
      pages: pagesWithInstagram
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-user-pages", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});