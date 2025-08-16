import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get video metadata and thumbnail from external API
async function getVideoInfo(videoUrl: string): Promise<{ thumbnail?: string, title?: string, description?: string }> {
  try {
    console.log('Attempting to extract video information:', videoUrl);
    
    // Try to extract video ID if it's a YouTube URL
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return {
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: `YouTube Video: ${videoId}`,
        description: 'YouTube video content'
      };
    }

    // Try to extract Instagram video info (multiple patterns)
    if (videoUrl.includes('instagram.com') || videoUrl.includes('instagram')) {
      // Extract post ID from various Instagram URL formats
      const igMatch = videoUrl.match(/(?:instagram\.com\/(?:p|reel|tv)\/([^\/\?]+))|(?:instagram\.com\/stories\/[^\/]+\/([^\/\?]+))/);
      const postId = igMatch ? (igMatch[1] || igMatch[2]) : 'unknown';
      return {
        title: `Instagram Video: ${postId}`,
        description: 'Instagram video content from social media platform'
      };
    }

    // Try to extract Facebook video info (multiple patterns)
    if (videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch') || videoUrl.includes('facebook')) {
      // Extract video ID from various Facebook URL formats
      const fbMatch = videoUrl.match(/(?:facebook\.com\/.*\/videos\/([^\/\?]+))|(?:fb\.watch\/([^\/\?]+))|(?:facebook\.com\/watch\/?\?v=([^&\n?#]+))/);
      const videoId = fbMatch ? (fbMatch[1] || fbMatch[2] || fbMatch[3]) : 'unknown';
      return {
        title: `Facebook Video: ${videoId}`,
        description: 'Facebook video content from social media platform'
      };
    }

    // Try to extract TikTok video info
    if (videoUrl.includes('tiktok.com') || videoUrl.includes('tiktok')) {
      const tiktokMatch = videoUrl.match(/tiktok\.com\/.*\/video\/([^\/\?]+)/);
      const videoId = tiktokMatch ? tiktokMatch[1] : 'unknown';
      return {
        title: `TikTok Video: ${videoId}`,
        description: 'TikTok video content from social media platform'
      };
    }

    // Handle Supabase storage URLs (your uploaded videos)
    if (videoUrl.includes('supabase.co') && videoUrl.includes('storage')) {
      const fileName = videoUrl.split('/').pop() || 'unknown';
      const platform = fileName.includes('instagram') ? 'Instagram' : 
                     fileName.includes('facebook') ? 'Facebook' : 'Uploaded';
      return {
        title: `${platform} Video: ${fileName}`,
        description: `${platform} video content stored in application`
      };
    }

    // Handle generic video files
    if (videoUrl.match(/\.(mp4|avi|mov|webm|mkv|flv|wmv)(\?.*)?$/i)) {
      const fileName = videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
      return {
        title: `Video File: ${fileName}`,
        description: 'Video file content'
      };
    }

    // If no specific pattern matches, try to extract basic info
    const domain = new URL(videoUrl).hostname;
    return {
      title: `Video from ${domain}`,
      description: `Video content from ${domain} platform`
    };
    
  } catch (error) {
    console.error('Failed to extract video info:', error);
    // Fallback: try to get basic info even if URL parsing fails
    const urlParts = videoUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1] || 'unknown';
    return {
      title: `Video: ${lastPart}`,
      description: 'Video content requiring analysis'
    };
  }
}

// Helper function to analyze video using available metadata and OpenAI
async function analyzeVideoWithMetadata(videoUrl: string, videoInfo: any, openAIApiKey: string): Promise<string> {
  try {
    console.log('Analyzing video with metadata approach');
    
    const messages = [
      {
        role: 'system',
        content: `You are a video content analyzer. Based on the video URL and any available metadata, provide a comprehensive analysis of what this video likely contains. Consider the platform, URL structure, and any available information to give insights about the video content, potential topics, and context that would help an AI assistant understand and respond to questions about this video.`
      },
      {
        role: 'user',
        content: `Please analyze this video based on the available information:

VIDEO URL: ${videoUrl}
VIDEO TITLE: ${videoInfo.title || 'Not available'}
VIDEO DESCRIPTION: ${videoInfo.description || 'Not available'}
THUMBNAIL URL: ${videoInfo.thumbnail || 'Not available'}

Provide a detailed analysis of what this video likely contains, including:
1. Platform-specific context and typical content types
2. Potential topics or themes based on the URL and metadata
3. Suggestions for what questions users might ask about this video
4. Guidance on how to better analyze this video content

If a thumbnail is available, note that it could be analyzed separately for visual content.`
      }
    ];

    // If we have a thumbnail, include it in the analysis
    if (videoInfo.thumbnail) {
      messages[1].content = [
        {
          type: 'text',
          text: messages[1].content
        },
        {
          type: 'image_url',
          image_url: { url: videoInfo.thumbnail }
        }
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI analysis error:', errorText);
      return '';
    }

    const data = await response.json();
    return data.choices[0].message.content || '';
    
  } catch (error) {
    console.error('Video analysis failed:', error);
    return '';
  }
}

// Helper function to provide enhanced video analysis guidance
async function generateVideoAnalysisGuidance(videoUrl: string, openAIApiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant providing guidance on video content analysis. Help users understand how to effectively share video information for analysis.'
          },
          {
            role: 'user',
            content: `I have a video at this URL: ${videoUrl}. Since automatic video processing isn't available in this environment, could you guide me on the best ways to share video content for analysis? What specific information would be most helpful to extract and share?`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      return 'I can help analyze video content if you provide key details like: visual descriptions, audio transcripts, main topics, or screenshots from the video.';
    }

    const data = await response.json();
    return data.choices[0].message.content || '';
  } catch (error) {
    console.error('Guidance generation failed:', error);
    return 'I can help analyze video content if you provide key details like: visual descriptions, audio transcripts, main topics, or screenshots from the video.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting video analysis (metadata approach):', videoUrl);

    // Get video metadata/info
    const videoInfo = await getVideoInfo(videoUrl);
    console.log('Extracted video info:', videoInfo);

    // Analyze based on available metadata
    const metadataAnalysis = await analyzeVideoWithMetadata(videoUrl, videoInfo, openAIApiKey);

    // Generate helpful guidance for further analysis
    const analysisGuidance = await generateVideoAnalysisGuidance(videoUrl, openAIApiKey);

    // Combine analysis and guidance
    const combinedResponse = `${metadataAnalysis}

---

**For more detailed analysis:** ${analysisGuidance}`;

    console.log('Video analysis completed successfully with metadata approach');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: combinedResponse,
      metadata: {
        approach: 'metadata_based',
        videoInfo,
        thumbnailAvailable: !!videoInfo.thumbnail,
        platform: videoUrl.includes('youtube') ? 'youtube' : 
                 videoUrl.includes('instagram') ? 'instagram' :
                 videoUrl.includes('facebook') ? 'facebook' : 'unknown',
        videoUrl
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing video:', error);
    
    // Enhanced fallback response with specific guidance
    const fallbackResponse = `I'm unable to automatically process video files in this environment, but I can help you analyze video content in several ways:

**Alternative approaches:**
1. **Share a screenshot** - Upload a key frame or thumbnail from the video
2. **Describe the content** - Tell me what you see in the video (objects, people, text, actions)
3. **Provide audio transcript** - Share any spoken content from the video
4. **Share video details** - Platform, title, description, or context about the video

**For social media videos:**
- Instagram/Facebook: I can help create engaging responses based on your description
- YouTube: Share the title and description for context-based analysis
- TikTok: Describe trending elements, music, or visual themes

**What would you like help with regarding this video?** I can assist with content creation, response generation, or analysis once you share some details about what's shown.

Error details: ${error.message}`;

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      analysis: fallbackResponse,
      metadata: {
        approach: 'fallback',
        videoUrl: videoUrl || 'unknown'
      }
    }), {
      status: 200, // Return 200 so the client gets the helpful fallback response
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
