import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[get-user-pages-enhanced] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting enhanced user pages fetch");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(JSON.stringify({ 
        error: "No authorization header" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      logStep("ERROR: Authentication failed", { authError });
      return new Response(JSON.stringify({ 
        error: "Authentication failed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id });

    const { fbAccessToken } = await req.json();
    logStep("Request body parsed", { hasToken: !!fbAccessToken });

    let accessToken = fbAccessToken;

    // If no token provided, try to get from user profile
    if (!accessToken) {
      logStep("No token provided, fetching from user profile");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('fb_access_token')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.fb_access_token) {
        logStep("ERROR: No access token available", { profileError });
        return new Response(JSON.stringify({ 
          error: "No Facebook access token available" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      accessToken = profile.fb_access_token;
      logStep("Access token retrieved from profile");
    }

    // Test token validity first
    logStep("Testing token validity");
    const tokenTestUrl = `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name`;
    
    try {
      const tokenTestResponse = await fetch(tokenTestUrl);
      const tokenTestData = await tokenTestResponse.json();
      
      if (tokenTestData.error) {
        logStep("ERROR: Token validation failed", tokenTestData.error);
        return new Response(JSON.stringify({ 
          error: `Invalid Facebook token: ${tokenTestData.error.message}`,
          success: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      logStep("Token is valid", { fbUserId: tokenTestData.id, fbUserName: tokenTestData.name });
    } catch (tokenError) {
      logStep("ERROR: Token test failed", tokenError);
      return new Response(JSON.stringify({ 
        error: "Failed to validate Facebook token",
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch user's Facebook pages with detailed logging
    logStep("Fetching Facebook pages");
    const pagesUrl = `https://graph.facebook.com/me/accounts?access_token=${accessToken}&fields=id,name,category,access_token,perms,tasks`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const pagesResponse = await fetch(pagesUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const pagesData = await pagesResponse.json();
      logStep("Raw Facebook pages response", pagesData);

      if (pagesData.error) {
        logStep("ERROR: Facebook API error", pagesData.error);
        return new Response(JSON.stringify({ 
          error: `Facebook API error: ${pagesData.error.message}`,
          success: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!pagesData.data) {
        logStep("ERROR: No data in pages response", pagesData);
        return new Response(JSON.stringify({ 
          error: "No pages data received from Facebook",
          success: false 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      logStep("Raw pages count", { count: pagesData.data.length });

      // Process pages with detailed permission logging
      const processedPages = [];
      
      for (const page of pagesData.data) {
        logStep(`Processing page: ${page.name}`, {
          id: page.id,
          category: page.category,
          hasAccessToken: !!page.access_token,
          permissions: page.perms || [],
          tasks: page.tasks || []
        });

        // Check for required permissions
        const requiredPerms = ['MANAGE', 'CREATE_CONTENT', 'MODERATE'];
        const hasRequiredPerms = requiredPerms.some(perm => 
          (page.perms && page.perms.includes(perm)) ||
          (page.tasks && page.tasks.includes(perm))
        );

        logStep(`Page ${page.name} permission check`, {
          requiredPerms,
          userPerms: page.perms || [],
          userTasks: page.tasks || [],
          hasRequiredPerms
        });

        if (!hasRequiredPerms) {
          logStep(`Skipping page ${page.name} - insufficient permissions`);
          continue;
        }

        // Try to get Instagram Business Account for this page
        let instagramAccount = null;
        if (page.access_token) {
          try {
            logStep(`Fetching Instagram account for page: ${page.name}`);
            const igUrl = `https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
            const igResponse = await fetch(igUrl);
            const igData = await igResponse.json();
            
            logStep(`Instagram response for ${page.name}`, igData);
            
            if (igData.instagram_business_account) {
              const igAccountId = igData.instagram_business_account.id;
              
              // Get Instagram account details
              const igDetailsUrl = `https://graph.facebook.com/${igAccountId}?fields=id,username&access_token=${page.access_token}`;
              const igDetailsResponse = await fetch(igDetailsUrl);
              const igDetailsData = await igDetailsResponse.json();
              
              logStep(`Instagram details for ${page.name}`, igDetailsData);
              
              if (igDetailsData.id && !igDetailsData.error) {
                instagramAccount = {
                  id: igDetailsData.id,
                  username: igDetailsData.username
                };
                logStep(`Found Instagram account: @${igDetailsData.username}`);
              }
            }
          } catch (igError) {
            logStep(`Instagram fetch error for ${page.name}`, igError);
          }
        }

        processedPages.push({
          id: page.id,
          name: page.name,
          category: page.category,
          access_token: page.access_token,
          permissions: page.perms || [],
          tasks: page.tasks || [],
          instagram_account: instagramAccount
        });
      }

      logStep("Processed pages summary", {
        totalPages: pagesData.data.length,
        eligiblePages: processedPages.length,
        pagesWithInstagram: processedPages.filter(p => p.instagram_account).length
      });

      return new Response(JSON.stringify({
        success: true,
        pages: processedPages,
        debug: {
          totalFacebookPages: pagesData.data.length,
          eligiblePages: processedPages.length,
          pagesWithInstagram: processedPages.filter(p => p.instagram_account).length,
          tokenValid: true
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      logStep("ERROR: Pages fetch failed", fetchError);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch pages: ${fetchError.message}`,
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

  } catch (error) {
    logStep("ERROR: Unexpected error", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});