import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileSearchTestProps {
  fileReferences: Array<{
    id: string;
    name: string;
    type: 'upload' | 'google_docs' | 'google_sheets';
    url: string;
  }>;
}

export default function FileSearchTest({ fileReferences }: FileSearchTestProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testFileSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-tool', {
        body: {
          toolName: 'fileSearch',
          parameters: { query },
          enabledTools: { fileSearch: true },
          fileReferences
        }
      });

      if (error) {
        throw error;
      }

      setResults(data.result);
      toast({
        title: "Search completed",
        description: `Found ${data.result?.results?.length || 0} results`
      });
    } catch (error) {
      console.error('File search test error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test File Search</CardTitle>
        <CardDescription>
          Test the file search functionality with your uploaded files and linked documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter search query (e.g., 'project budget', 'contact information')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && testFileSearch()}
          />
          <Button 
            onClick={testFileSearch} 
            disabled={loading || fileReferences.length === 0}
          >
            {loading ? 'Searching...' : 'Search Files'}
          </Button>
        </div>
        
        {fileReferences.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No files available to search. Upload files or link documents first.
          </p>
        )}

        {results && (
          <div className="mt-4 space-y-3">
            <h4 className="font-semibold">Search Results:</h4>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
            
            {results.results && results.results.length > 0 && (
              <div className="space-y-3">
                {results.results.map((result: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{result.fileName}</h5>
                      <span className="text-xs bg-secondary px-2 py-1 rounded">
                        {result.type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.content.substring(0, 200)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Relevance: {result.relevanceScore}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}