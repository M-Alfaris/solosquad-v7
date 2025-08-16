import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Check subscription function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const authUser = userData.user;
    if (!authUser) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: authUser.id });

    // Get user profile from our profiles table
    const { data: user, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const trialEnd = new Date(user.trial_end);
    const isTrialActive = now <= trialEnd;
    const hasActiveSubscription = user.subscription_status === 'active';

    const status = {
      isActive: isTrialActive || hasActiveSubscription,
      isTrial: isTrialActive && user.subscription_status === 'trial',
      isSubscribed: hasActiveSubscription,
      trialEnd: user.trial_end,
      subscriptionStatus: user.subscription_status,
      daysLeft: isTrialActive ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    };

    logStep("Subscription status checked", { 
      userId: authUser.id,
      status: status.subscriptionStatus,
      isActive: status.isActive,
      daysLeft: status.daysLeft
    });

    return new Response(JSON.stringify({ 
      success: true, 
      ...status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});