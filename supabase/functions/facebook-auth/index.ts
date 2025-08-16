import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FACEBOOK-AUTH] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Facebook auth function started");

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logStep("ERROR: Missing or invalid authorization header");
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the JWT token and get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Invalid authentication token", { authError, hasUser: !!user });
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logStep("ERROR: Failed to parse request body", { parseError });
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { fbAccessToken, fbUserData, selectedPages, authorizationCode, redirectUri, state } = body;
    
    // Handle OAuth flow with authorization code
    if (authorizationCode && redirectUri) {
      logStep("Processing OAuth authorization code", { hasCode: !!authorizationCode, redirectUri });
      
      try {
        // Exchange authorization code for access token
        const facebookAppId = Deno.env.get('FACEBOOK_APP_ID');
        const facebookAppSecret = Deno.env.get('FACEBOOK_APP_SECRET');
        
        if (!facebookAppId || !facebookAppSecret) {
          throw new Error('Facebook app credentials not configured');
        }
        
        const tokenUrl = `https://graph.facebook.com/v23.0/oauth/access_token?` +
          `client_id=${facebookAppId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `client_secret=${facebookAppSecret}&` +
          `code=${authorizationCode}`;
        
        const tokenResponse = await fetch(tokenUrl);
        const tokenData = await tokenResponse.json();
        
        if (!tokenResponse.ok || tokenData.error) {
          throw new Error(tokenData.error?.message || 'Failed to exchange authorization code');
        }
        
        const accessToken = tokenData.access_token;
        logStep("Successfully exchanged code for access token");
        
        // Get user info with the new access token
        const userResponse = await fetch(`https://graph.facebook.com/v23.0/me?fields=id,name,email&access_token=${accessToken}`);
        const userData = await userResponse.json();
        
        if (!userResponse.ok || userData.error) {
          throw new Error(userData.error?.message || 'Failed to get user info');
        }
        
        // Store the access token in user profile for future use
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            fb_access_token: accessToken,
            fb_user_id: userData.id,
            fb_uid: userData.id,
            display_name: userData.name,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (updateError) {
          logStep("ERROR: Failed to update user profile", { updateError });
          throw updateError;
        }
        
        logStep("OAuth flow completed successfully", { userId: user.id, fbUserId: userData.id });
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Facebook account connected successfully",
          userData: {
            id: userData.id,
            name: userData.name,
            email: userData.email
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
        
      } catch (oauthError) {
        logStep("ERROR: OAuth flow failed", { error: oauthError.message });
        return new Response(JSON.stringify({ 
          success: false,
          error: oauthError.message || 'OAuth flow failed'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }
    
    logStep("Received request data", { 
      hasToken: !!fbAccessToken, 
      hasUserData: !!fbUserData,
      pagesCount: selectedPages?.length || 0
    });
    
    // Input validation
    if (!fbAccessToken || typeof fbAccessToken !== 'string') {
      logStep("ERROR: Invalid or missing Facebook access token");
      throw new Error("Invalid or missing Facebook access token");
    }
    
    if (!fbUserData || typeof fbUserData !== 'object') {
      logStep("ERROR: Invalid or missing Facebook user data", { fbUserData });
      throw new Error("Invalid or missing Facebook user data");
    }
    
    if (!fbUserData.id || !fbUserData.name) {
      logStep("ERROR: Facebook user data missing required fields", { 
        hasId: !!fbUserData.id, 
        hasName: !!fbUserData.name 
      });
      throw new Error("Facebook user data must include id and name");
    }
    
    // Validate email format if provided
    if (fbUserData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fbUserData.email)) {
      logStep("ERROR: Invalid email format", { email: fbUserData.email });
      throw new Error("Invalid email format");
    }
    
    // Validate selected pages if provided
    if (selectedPages && (!Array.isArray(selectedPages) || selectedPages.some((page: any) => !page.id || !page.name))) {
      logStep("ERROR: Invalid selected pages format", { selectedPages });
      throw new Error("Invalid selected pages format");
    }

    // Fetch Facebook and Instagram user IDs from Graph API v23.0
    let fbUid = null;
    let igUid = null;
    
    try {
      logStep("Fetching user details from Facebook Graph API v23.0");
      
      // Fetch Facebook user ID (should be the same as fbUserData.id)
      const fbUserResponse = await fetch(`https://graph.facebook.com/v23.0/me?access_token=${fbAccessToken}&fields=id`);
      const fbUserResult = await fbUserResponse.json();
      
      if (fbUserResult.id) {
        fbUid = fbUserResult.id;
        logStep("Retrieved Facebook UID", { fbUid });
      }
      
      // Try to fetch Instagram business account ID
      try {
        const igAccountResponse = await fetch(`https://graph.facebook.com/v23.0/me/accounts?access_token=${fbAccessToken}&fields=instagram_business_account{id}`);
        const igAccountResult = await igAccountResponse.json();
        
        if (igAccountResult.data && igAccountResult.data.length > 0) {
          for (const page of igAccountResult.data) {
            if (page.instagram_business_account?.id) {
              igUid = page.instagram_business_account.id;
              logStep("Retrieved Instagram UID", { igUid });
              break;
            }
          }
        }
      } catch (igError) {
        logStep("Warning: Could not fetch Instagram account", { igError });
        // This is not a critical error, continue without IG UID
      }
    } catch (error) {
      logStep("Warning: Error fetching user details from Graph API", { error });
      // Continue with basic flow even if we can't get additional IDs
    }

    logStep("Processing Facebook user", { 
      fbUserId: fbUserData.id, 
      name: fbUserData.name,
      fbUid,
      igUid,
      pagesCount: selectedPages?.length || 0
    });

    // Check if profile already exists
    logStep("Checking for existing profile", { fbUserId: fbUserData.id });
    const { data: existingProfile, error: existingProfileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("fb_user_id", fbUserData.id)
      .single();

    if (existingProfileError && existingProfileError.code !== 'PGRST116') {
      logStep("ERROR: Database error checking existing profile", { error: existingProfileError });
      throw new Error(`Database error: ${existingProfileError.message}`);
    }

    let userId;
    
    if (existingProfile) {
      // Update existing profile
      logStep("Updating existing profile", { existingProfileId: existingProfile.id });
      const { data: updatedProfile, error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          display_name: fbUserData.name,
          full_name: fbUserData.name,
          fb_access_token: fbAccessToken,
          fb_uid: fbUid,
          ig_uid: igUid,
          updated_at: new Date().toISOString(),
          id: user.id, // Link to authenticated user
        })
        .eq("fb_user_id", fbUserData.id)
        .select()
        .single();

      if (updateError) {
        logStep("ERROR: Failed to update existing profile", { updateError });
        throw updateError;
      }
      userId = updatedProfile.id;
      logStep("Updated existing profile", { userId });
    } else {
      // Create new profile
      logStep("Creating new profile");
      const { data: newProfile, error: createError } = await supabaseClient
        .from("profiles")
        .insert({
          id: user.id, // Use authenticated user ID
          fb_user_id: fbUserData.id,
          display_name: fbUserData.name,
          full_name: fbUserData.name,
          fb_access_token: fbAccessToken,
          fb_uid: fbUid,
          ig_uid: igUid,
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          subscription_status: 'trial'
        })
        .select()
        .single();

      if (createError) {
        logStep("ERROR: Failed to create new profile", { createError });
        throw createError;
      }
      userId = newProfile.id;
      logStep("Created new profile", { userId });
    }

    // Handle selected pages
    if (selectedPages && selectedPages.length > 0) {
      logStep("Processing selected pages", { pagesCount: selectedPages.length });
      
      // Remove existing pages for this user
      const { error: deleteError } = await supabaseClient
        .from("pages")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        logStep("ERROR: Failed to delete existing pages", { deleteError });
        throw deleteError;
      }

      // Insert new pages and Instagram accounts
      const pageInserts = [];
      
      // Add Facebook pages and linked Instagram accounts
      selectedPages.forEach((page: any) => {
        // Add Facebook page
        pageInserts.push({
          user_id: userId,
          platform: 'facebook',
          fb_page_id: page.id,
          fb_page_token: page.access_token,
          name: page.name,
          category: page.category || null,
          is_active: true
        });
        
        // Add Instagram account if connected to this page
        if (page.instagram_business_account) {
          const igAccount = page.instagram_business_account;
          pageInserts.push({
            user_id: userId,
            platform: 'instagram',
            ig_account_id: igAccount.id,
            ig_access_token: page.access_token, // Instagram uses the page token
            name: igAccount.username || `${page.name} (Instagram)`,
            category: 'instagram_business',
            is_active: true
          });
        }
      });

      logStep("Inserting pages and Instagram accounts", { 
        totalInserts: pageInserts.length,
        facebook: pageInserts.filter(p => p.platform === 'facebook').length,
        instagram: pageInserts.filter(p => p.platform === 'instagram').length,
        details: pageInserts.map(p => ({ 
          platform: p.platform,
          name: p.name,
          fb_page_id: p.fb_page_id,
          ig_account_id: p.ig_account_id
        }))
      });

      const { error: pagesError } = await supabaseClient
        .from("pages")
        .insert(pageInserts);

      if (pagesError) {
        logStep("ERROR: Failed to insert pages/accounts", { pagesError });
        throw pagesError;
      }
      logStep("Successfully inserted pages and Instagram accounts", { 
        totalCount: pageInserts.length,
        facebookPages: pageInserts.filter(p => p.platform === 'facebook').length,
        instagramAccounts: pageInserts.filter(p => p.platform === 'instagram').length
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      userId,
      message: "User authenticated successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in facebook-auth", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});