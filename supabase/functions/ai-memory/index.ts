import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversationMemory {
  id?: string
  user_id: string
  post_id?: string
  conversation_id: string
  message_type: 'user' | 'ai'
  content: string
  context?: any
  tools_used?: string[]
}

interface UserMemoryProfile {
  user_id: string
  user_name?: string
  preferences?: any
  interaction_count?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...data } = await req.json()

    switch (action) {
      case 'store_memory':
        return await storeMemory(supabase, data)
      case 'get_user_context':
        return await getUserContext(supabase, data)
      case 'get_conversation_history':
        return await getConversationHistory(supabase, data)
      case 'get_post_context':
        return await getPostContext(supabase, data)
      case 'update_user_profile':
        return await updateUserProfile(supabase, data)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error in ai-memory function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function storeMemory(supabase: any, data: ConversationMemory) {
  const { error } = await supabase
    .from('conversation_memory')
    .insert(data)

  if (error) throw error

  // Extract context and update user preferences
  await analyzeAndUpdateUserProfile(supabase, data)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getUserContext(supabase: any, { user_id, limit = 10 }: { user_id: string, limit?: number }) {
  // Get user profile
  const { data: profile } = await supabase
    .from('user_memory_profile')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle()

  // Get recent conversations
  const { data: recentMemories } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Get unique topics/posts the user has discussed
  const { data: discussedPosts } = await supabase
    .from('conversation_memory')
    .select('post_id, content')
    .eq('user_id', user_id)
    .not('post_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)

  return new Response(
    JSON.stringify({
      profile,
      recent_memories: recentMemories,
      discussed_posts: discussedPosts
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getConversationHistory(supabase: any, { conversation_id }: { conversation_id: string }) {
  const { data, error } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })

  if (error) throw error

  return new Response(
    JSON.stringify({ conversation_history: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPostContext(supabase: any, { post_id, user_id }: { post_id: string, user_id?: string }) {
  // Get post content
  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', post_id)
    .maybeSingle()

  // Get all comments/interactions on this post
  const { data: postInteractions } = await supabase
    .from('conversation_memory')
    .select('*')
    .eq('post_id', post_id)
    .order('created_at', { ascending: false })

  // Get user-specific interactions with this post if user_id provided
  let userPostHistory = null
  if (user_id) {
    const { data } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('post_id', post_id)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
    
    userPostHistory = data
  }

  return new Response(
    JSON.stringify({
      post_content: post,
      all_interactions: postInteractions,
      user_post_history: userPostHistory
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateUserProfile(supabase: any, data: UserMemoryProfile) {
  const { error } = await supabase
    .from('user_memory_profile')
    .upsert(data, { onConflict: 'user_id' })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function analyzeAndUpdateUserProfile(supabase: any, data: ConversationMemory) {
  try {
    // Get user's name from comments/messages
    const userName = await extractUserName(supabase, data.user_id)
    
    // Analyze user preferences from their content
    const preferences = await analyzeUserPreferences(supabase, data)
    
    // Get current profile
    const { data: existingProfile } = await supabase
      .from('user_memory_profile')
      .select('*')
      .eq('user_id', data.user_id)
      .maybeSingle()

    const currentCount = existingProfile?.interaction_count || 0
    const currentPrefs = existingProfile?.preferences || {}

    // Merge new preferences with existing ones
    const updatedPreferences = mergePreferences(currentPrefs, preferences)

    await supabase
      .from('user_memory_profile')
      .upsert({
        user_id: data.user_id,
        user_name: userName || existingProfile?.user_name,
        preferences: updatedPreferences,
        interaction_count: currentCount + 1,
        last_interaction: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
  } catch (error) {
    console.error('Error analyzing user profile:', error)
  }
}

async function extractUserName(supabase: any, userId: string) {
  // Try to get user name from comments where they mentioned their name
  const { data: comments } = await supabase
    .from('comments')
    .select('content')
    .eq('user_id', userId)
    .eq('role', 'user')
    .limit(20)

  if (!comments?.length) return null

  // Look for patterns like "my name is", "I'm", etc.
  for (const comment of comments) {
    const content = comment.content.toLowerCase()
    const namePatterns = [
      /(?:my name is|i'm|i am|call me)\s+([a-z]+)/i,
      /(?:أسمي|اسمي|انا)\s+([a-z\u0600-\u06FF]+)/i
    ]
    
    for (const pattern of namePatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
    }
  }
  
  return null
}

async function analyzeUserPreferences(supabase: any, data: ConversationMemory) {
  // Get recent user messages to analyze patterns
  const { data: recentMessages } = await supabase
    .from('conversation_memory')
    .select('content, context')
    .eq('user_id', data.user_id)
    .eq('message_type', 'user')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!recentMessages?.length) return {}

  const preferences = {
    topics: [],
    interests: [],
    language: 'en',
    communication_style: 'formal',
    frequently_asked: [],
    expertise_areas: [],
    goals: []
  }

  const allContent = recentMessages.map(m => m.content).join(' ').toLowerCase()

  // Detect language
  if (/[\u0600-\u06FF]/.test(allContent)) {
    preferences.language = 'ar'
  }

  // Detect topics and interests
  const techKeywords = ['programming', 'code', 'software', 'app', 'website', 'البرمجة', 'كود', 'تطبيق', 'موقع']
  const businessKeywords = ['business', 'startup', 'company', 'project', 'تجارة', 'شركة', 'مشروع', 'عمل']
  const educationKeywords = ['learn', 'study', 'course', 'university', 'تعلم', 'دراسة', 'جامعة', 'كورس']

  if (techKeywords.some(keyword => allContent.includes(keyword))) {
    preferences.topics.push('technology')
    preferences.interests.push('programming')
  }
  
  if (businessKeywords.some(keyword => allContent.includes(keyword))) {
    preferences.topics.push('business')
    preferences.interests.push('entrepreneurship')
  }
  
  if (educationKeywords.some(keyword => allContent.includes(keyword))) {
    preferences.topics.push('education')
    preferences.interests.push('learning')
  }

  // Detect communication style
  const formalWords = ['please', 'thank you', 'kindly', 'من فضلك', 'شكرا']
  const casualWords = ['hey', 'hi', 'thanks', 'هلا', 'اهلين']
  
  const formalCount = formalWords.reduce((count, word) => count + (allContent.match(new RegExp(word, 'g')) || []).length, 0)
  const casualCount = casualWords.reduce((count, word) => count + (allContent.match(new RegExp(word, 'g')) || []).length, 0)
  
  if (casualCount > formalCount) {
    preferences.communication_style = 'casual'
  }

  // Extract frequently asked topics
  const questions = recentMessages
    .filter(m => m.content.includes('?') || m.content.includes('؟'))
    .map(m => m.content)
  
  preferences.frequently_asked = questions.slice(0, 3)

  return preferences
}

function mergePreferences(existing: any, newPrefs: any) {
  const merged = { ...existing }
  
  // Merge arrays without duplicates
  if (newPrefs.topics) {
    merged.topics = [...new Set([...(existing.topics || []), ...newPrefs.topics])]
  }
  
  if (newPrefs.interests) {
    merged.interests = [...new Set([...(existing.interests || []), ...newPrefs.interests])]
  }
  
  if (newPrefs.frequently_asked) {
    merged.frequently_asked = [...new Set([...(existing.frequently_asked || []), ...newPrefs.frequently_asked])].slice(0, 5)
  }

  // Update other fields
  if (newPrefs.language) merged.language = newPrefs.language
  if (newPrefs.communication_style) merged.communication_style = newPrefs.communication_style
  if (newPrefs.expertise_areas) {
    merged.expertise_areas = [...new Set([...(existing.expertise_areas || []), ...newPrefs.expertise_areas])]
  }
  
  return merged
}