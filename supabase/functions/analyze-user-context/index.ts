import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all user interactions
    const { data: interactions } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })

    // Analyze user behavior patterns
    const analysis = await analyzeUserBehavior(interactions || [], comments || [])

    // Update user profile with insights
    await supabase
      .from('user_memory_profile')
      .upsert({
        user_id,
        preferences: analysis.preferences,
        user_name: analysis.extracted_name,
        last_interaction: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    return new Response(
      JSON.stringify({
        user_id,
        analysis,
        insights_generated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-user-context function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function analyzeUserBehavior(interactions: any[], comments: any[]) {
  const allContent = [
    ...interactions.map(i => i.content),
    ...comments.map(c => c.content)
  ].join(' ')

  const analysis = {
    extracted_name: extractName(allContent),
    preferences: {
      primary_language: detectLanguage(allContent),
      topics_of_interest: extractTopics(allContent),
      communication_style: analyzeCommunicationStyle(allContent),
      expertise_level: assessExpertiseLevel(allContent),
      preferred_response_length: analyzeResponsePreference(interactions),
      active_times: analyzeActivityPatterns(interactions, comments),
      common_questions: extractCommonQuestions(allContent),
      sentiment_patterns: analyzeSentiment(allContent),
      technical_interests: extractTechnicalInterests(allContent),
      business_interests: extractBusinessInterests(allContent)
    },
    behavioral_insights: {
      interaction_frequency: calculateInteractionFrequency(interactions, comments),
      engagement_level: calculateEngagementLevel(interactions),
      learning_style: identifyLearningStyle(allContent),
      problem_solving_approach: analyzeProblemSolvingStyle(allContent)
    }
  }

  return analysis
}

function extractName(content: string): string | null {
  const namePatterns = [
    /(?:my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i,
    /(?:أسمي|اسمي|انا)\s+([a-zA-Z\u0600-\u06FF]+)/i,
    /name:\s*([a-zA-Z\u0600-\u06FF]+)/i
  ]
  
  for (const pattern of namePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1)
    }
  }
  
  return null
}

function detectLanguage(content: string): string {
  const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length
  const englishChars = (content.match(/[a-zA-Z]/g) || []).length
  
  if (arabicChars > englishChars * 0.3) {
    return 'arabic'
  }
  return 'english'
}

function extractTopics(content: string): string[] {
  const topicKeywords = {
    'programming': ['programming', 'code', 'software', 'البرمجة', 'كود', 'تطبيق'],
    'business': ['business', 'startup', 'company', 'تجارة', 'شركة', 'مشروع'],
    'education': ['learn', 'study', 'course', 'تعلم', 'دراسة', 'كورس'],
    'technology': ['AI', 'tech', 'digital', 'ذكي', 'تقنية', 'رقمي'],
    'finance': ['money', 'investment', 'مال', 'استثمار', 'ربح'],
    'health': ['health', 'medical', 'صحة', 'طبي', 'علاج'],
    'travel': ['travel', 'trip', 'سفر', 'رحلة', 'سياحة'],
    'food': ['food', 'recipe', 'طعام', 'وصفة', 'طبخ']
  }
  
  const topics = []
  const lowerContent = content.toLowerCase()
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
      topics.push(topic)
    }
  }
  
  return topics
}

function analyzeCommunicationStyle(content: string): string {
  const formalIndicators = ['please', 'thank you', 'kindly', 'من فضلك', 'شكرا لك']
  const casualIndicators = ['hey', 'hi', 'thanks', 'هلا', 'اهلين', 'شكرا']
  const directIndicators = ['need', 'want', 'give me', 'اريد', 'أعطني']
  
  const lowerContent = content.toLowerCase()
  
  const formalCount = formalIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const casualCount = casualIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const directCount = directIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
    
  if (formalCount > casualCount && formalCount > directCount) return 'formal'
  if (directCount > formalCount && directCount > casualCount) return 'direct'
  return 'casual'
}

function assessExpertiseLevel(content: string): string {
  const beginnerIndicators = ['how to', 'what is', 'explain', 'كيف', 'ما هو', 'اشرح']
  const intermediateIndicators = ['best practice', 'recommend', 'compare', 'أفضل طريقة', 'انصح']
  const advancedIndicators = ['optimize', 'architecture', 'implement', 'تحسين', 'هيكلة', 'تنفيذ']
  
  const lowerContent = content.toLowerCase()
  
  const beginnerCount = beginnerIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const intermediateCount = intermediateIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const advancedCount = advancedIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
    
  if (advancedCount > beginnerCount && advancedCount > intermediateCount) return 'advanced'
  if (intermediateCount > beginnerCount) return 'intermediate'
  return 'beginner'
}

function analyzeResponsePreference(interactions: any[]): string {
  const userMessages = interactions.filter(i => i.message_type === 'user')
  const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
  
  if (avgLength > 200) return 'detailed'
  if (avgLength > 100) return 'moderate'
  return 'concise'
}

function analyzeActivityPatterns(interactions: any[], comments: any[]): any {
  const allTimestamps = [
    ...interactions.map(i => new Date(i.created_at)),
    ...comments.map(c => new Date(c.created_at))
  ]
  
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)
  
  allTimestamps.forEach(timestamp => {
    hourCounts[timestamp.getHours()]++
    dayCounts[timestamp.getDay()]++
  })
  
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts))
  
  return {
    peak_hour: peakHour,
    peak_day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][peakDay],
    is_night_user: peakHour >= 20 || peakHour <= 6,
    activity_distribution: {
      morning: hourCounts.slice(6, 12).reduce((a, b) => a + b, 0),
      afternoon: hourCounts.slice(12, 18).reduce((a, b) => a + b, 0),
      evening: hourCounts.slice(18, 24).reduce((a, b) => a + b, 0),
      night: [...hourCounts.slice(0, 6), ...hourCounts.slice(20, 24)].reduce((a, b) => a + b, 0)
    }
  }
}

function extractCommonQuestions(content: string): string[] {
  const questions = content.split(/[.!؟]/).filter(sentence => 
    sentence.includes('?') || sentence.includes('؟') || 
    sentence.toLowerCase().includes('how') || sentence.includes('كيف') ||
    sentence.toLowerCase().includes('what') || sentence.includes('ما') ||
    sentence.toLowerCase().includes('why') || sentence.includes('لماذا')
  )
  
  return questions.slice(0, 5).map(q => q.trim()).filter(q => q.length > 10)
}

function analyzeSentiment(content: string): any {
  const positiveWords = ['good', 'great', 'excellent', 'love', 'جيد', 'ممتاز', 'رائع', 'أحب']
  const negativeWords = ['bad', 'terrible', 'hate', 'problem', 'سيء', 'مشكلة', 'أكره']
  const neutralWords = ['okay', 'normal', 'fine', 'عادي', 'طبيعي']
  
  const lowerContent = content.toLowerCase()
  
  const positiveCount = positiveWords.reduce((count, word) => 
    count + (lowerContent.match(new RegExp(word, 'g')) || []).length, 0)
  const negativeCount = negativeWords.reduce((count, word) => 
    count + (lowerContent.match(new RegExp(word, 'g')) || []).length, 0)
  const neutralCount = neutralWords.reduce((count, word) => 
    count + (lowerContent.match(new RegExp(word, 'g')) || []).length, 0)
    
  return {
    overall_sentiment: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral',
    positive_ratio: positiveCount / (positiveCount + negativeCount + neutralCount + 1),
    emotional_expressiveness: (positiveCount + negativeCount) > neutralCount ? 'expressive' : 'reserved'
  }
}

function extractTechnicalInterests(content: string): string[] {
  const techKeywords = {
    'web_development': ['html', 'css', 'javascript', 'react', 'vue', 'angular'],
    'mobile_development': ['android', 'ios', 'flutter', 'react native', 'swift', 'kotlin'],
    'backend_development': ['node.js', 'python', 'java', 'php', 'database', 'api'],
    'data_science': ['machine learning', 'AI', 'data analysis', 'python', 'statistics'],
    'devops': ['docker', 'kubernetes', 'aws', 'deployment', 'cloud'],
    'design': ['ui', 'ux', 'figma', 'photoshop', 'design', 'تصميم']
  }
  
  const interests = []
  const lowerContent = content.toLowerCase()
  
  for (const [interest, keywords] of Object.entries(techKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
      interests.push(interest)
    }
  }
  
  return interests
}

function extractBusinessInterests(content: string): string[] {
  const businessKeywords = {
    'entrepreneurship': ['startup', 'entrepreneur', 'business idea', 'ريادة', 'مشروع'],
    'marketing': ['marketing', 'social media', 'advertising', 'تسويق', 'إعلان'],
    'finance': ['investment', 'funding', 'profit', 'استثمار', 'ربح', 'تمويل'],
    'ecommerce': ['online store', 'ecommerce', 'selling', 'متجر', 'بيع اونلاين'],
    'consulting': ['consulting', 'advice', 'strategy', 'استشارة', 'نصيحة']
  }
  
  const interests = []
  const lowerContent = content.toLowerCase()
  
  for (const [interest, keywords] of Object.entries(businessKeywords)) {
    if (keywords.some(keyword => lowerContent.includes(keyword.toLowerCase()))) {
      interests.push(interest)
    }
  }
  
  return interests
}

function calculateInteractionFrequency(interactions: any[], comments: any[]): string {
  const totalInteractions = interactions.length + comments.length
  const timespan = Date.now() - new Date(Math.min(
    ...interactions.map(i => new Date(i.created_at).getTime()),
    ...comments.map(c => new Date(c.created_at).getTime())
  )).getTime()
  
  const daysActive = timespan / (1000 * 60 * 60 * 24)
  const dailyAverage = totalInteractions / Math.max(daysActive, 1)
  
  if (dailyAverage > 5) return 'very_high'
  if (dailyAverage > 2) return 'high'
  if (dailyAverage > 0.5) return 'moderate'
  return 'low'
}

function calculateEngagementLevel(interactions: any[]): string {
  const userMessages = interactions.filter(i => i.message_type === 'user')
  const avgMessageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length
  const questionsAsked = userMessages.filter(msg => msg.content.includes('?') || msg.content.includes('؟')).length
  
  const engagementScore = (avgMessageLength / 100) + (questionsAsked / userMessages.length * 2)
  
  if (engagementScore > 2) return 'high'
  if (engagementScore > 1) return 'medium'
  return 'low'
}

function identifyLearningStyle(content: string): string {
  const visualIndicators = ['show me', 'picture', 'example', 'اعرض لي', 'صورة', 'مثال']
  const auditoryIndicators = ['explain', 'tell me', 'describe', 'اشرح', 'قل لي', 'وصف']
  const kinestheticIndicators = ['how to do', 'step by step', 'practice', 'كيف أعمل', 'خطوة', 'تطبيق']
  
  const lowerContent = content.toLowerCase()
  
  const visualCount = visualIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const auditoryCount = auditoryIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const kinestheticCount = kinestheticIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
    
  if (visualCount > auditoryCount && visualCount > kinestheticCount) return 'visual'
  if (kinestheticCount > auditoryCount && kinestheticCount > visualCount) return 'kinesthetic'
  return 'auditory'
}

function analyzeProblemSolvingStyle(content: string): string {
  const analyticalIndicators = ['analyze', 'compare', 'pros and cons', 'تحليل', 'مقارنة', 'سلبيات وإيجابيات']
  const creativeIndicators = ['creative', 'innovative', 'unique', 'إبداعي', 'مبتكر', 'فريد']
  const practicalIndicators = ['practical', 'simple', 'quick', 'عملي', 'بسيط', 'سريع']
  
  const lowerContent = content.toLowerCase()
  
  const analyticalCount = analyticalIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const creativeCount = creativeIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
  const practicalCount = practicalIndicators.reduce((count, indicator) => 
    count + (lowerContent.match(new RegExp(indicator, 'g')) || []).length, 0)
    
  if (analyticalCount > creativeCount && analyticalCount > practicalCount) return 'analytical'
  if (creativeCount > practicalCount && creativeCount > analyticalCount) return 'creative'
  return 'practical'
}