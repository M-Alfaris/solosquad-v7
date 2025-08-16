import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileReference {
  id: string;
  name: string;
  type: 'upload' | 'google_docs' | 'google_sheets';
  url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, fileReferences } = await req.json();
    
    console.log('File search request:', { query, fileReferences });

    const searchResults: Array<{
      fileName: string;
      content: string;
      relevanceScore: number;
      type: string;
    }> = [];

    // Process each file reference
    for (const fileRef of fileReferences as FileReference[]) {
      try {
        let content = '';
        
        if (fileRef.type === 'upload') {
          // Read from Supabase storage
          const { data, error } = await supabase.storage
            .from('prompt-files')
            .download(fileRef.url);
            
          if (error) {
            console.error('Error downloading file:', error);
            continue;
          }
          
          content = await data.text();
        } else if (fileRef.type === 'google_docs') {
          // Extract Google Docs content
          content = await extractGoogleDocsContent(fileRef.url);
        } else if (fileRef.type === 'google_sheets') {
          // Extract Google Sheets content
          content = await extractGoogleSheetsContent(fileRef.url);
        }

        // Simple text search - check if query terms appear in content
        const relevanceScore = calculateRelevance(query, content);
        
        if (relevanceScore > 0) {
          searchResults.push({
            fileName: fileRef.name,
            content: content.substring(0, 2000), // Limit content length
            relevanceScore,
            type: fileRef.type
          });
        }
      } catch (error) {
        console.error(`Error processing file ${fileRef.name}:`, error);
      }
    }

    // Sort by relevance score
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return new Response(JSON.stringify({ 
      results: searchResults.slice(0, 5), // Return top 5 results
      query 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in file-search function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractGoogleDocsContent(url: string): Promise<string> {
  try {
    // Convert Google Docs URL to export format
    const docId = extractGoogleDocId(url);
    if (!docId) {
      throw new Error('Invalid Google Docs URL');
    }
    
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Doc: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error extracting Google Docs content:', error);
    throw error;
  }
}

async function extractGoogleSheetsContent(url: string): Promise<string> {
  try {
    // Convert Google Sheets URL to CSV export format
    const sheetId = extractGoogleSheetId(url);
    if (!sheetId) {
      throw new Error('Invalid Google Sheets URL');
    }
    
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error extracting Google Sheets content:', error);
    throw error;
  }
}

function extractGoogleDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function extractGoogleSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function calculateRelevance(query: string, content: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Simple relevance calculation based on term frequency
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  let score = 0;
  
  for (const word of queryWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  
  return score;
}