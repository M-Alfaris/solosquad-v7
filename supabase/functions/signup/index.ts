import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { fullName, email, password, category } = await req.json();

    console.log('Signup request:', {
      fullName,
      email,
      category
    });

    // Validate required fields
    if (!fullName || !email || !password || !category) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: fullName, email, password, category'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate category and map to database enum values
    const validCategories = ['Business', 'Content Creator', 'Other'];
    if (!validCategories.includes(category)) {
      return new Response(JSON.stringify({
        error: 'Invalid category. Must be: Business, Content Creator, or Other'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Map category to database enum value
    const categoryMap: { [key: string]: string } = {
      'Business': 'business',
      'Content Creator': 'content_creator', 
      'Other': 'other'
    };
    const dbCategory = categoryMap[category];

    // Step 1: Create user with admin client
    console.log('Creating user with admin client...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName.trim(),
        category: category
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({
        error: authError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!authData.user) {
      console.error('No user returned from createUser');
      return new Response(JSON.stringify({
        error: 'Failed to create user account'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User created successfully:', authData.user.id);

    // Step 2: Create profile in public.profiles table
    console.log('Creating profile...');
    
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName.trim(),
        category: dbCategory,
        subscription_status: 'trial',
        trial_end: trialEnd.toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // User was created but profile failed - return partial success
      return new Response(JSON.stringify({
        success: true,
        warning: 'User created but profile setup incomplete',
        message: 'Account created successfully, but some setup failed. Please contact support.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          displayName: fullName.trim(),
          category: category,
          subscriptionStatus: 'unknown'
        }
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Profile created successfully');

    // Step 3: Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Account created successfully!',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        displayName: fullName.trim(),
        category: category,
        subscriptionStatus: 'trial',
        trialEnd: trialEnd.toISOString(),
        needsEmailConfirmation: false // Already confirmed by admin
      }
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Signup function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});