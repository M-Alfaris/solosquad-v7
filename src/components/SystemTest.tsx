import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  responseTime?: number;
}

const EDGE_FUNCTIONS = [
  'get-facebook-app-id',
  'check-subscription-status', 
  'signup',
  'facebook-auth',
  'fetch-facebook-data',
  'fetch-instagram-data',
  'sync-facebook-posts',
  'get-user-pages',
  'analyze-image',
  'analyze-trigger',
  'analyze-video',
  'ai-memory',
  'process-ai-message',
  'execute-tool',
  'file-search',
  'pinecone-search',
  'manage-prompt-config',
  'test-custom-tool',
  'create-checkout',
  'customer-portal',
  'check-subscription'
];

export default function SystemTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Pass</Badge>;
      case 'error':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Warning</Badge>;
      default:
        return <Badge variant="outline">Testing...</Badge>;
    }
  };

  const testEdgeFunction = async (functionName: string): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      let testPayload = {};
      
      // Customize payloads for specific functions
      switch (functionName) {
        case 'get-facebook-app-id':
          break; // No payload needed
        case 'analyze-image':
          testPayload = { imageUrl: 'https://via.placeholder.com/300' };
          break;
        case 'analyze-trigger':
          testPayload = {
            text: 'hello test',
            triggerConfig: { mode: 'keyword', keywords: ['hello'] }
          };
          break;
        case 'test-custom-tool':
          testPayload = {
            apiEndpoint: 'https://httpbin.org/post',
            testPayload: { test: true }
          };
          break;
        default:
          testPayload = { test: true };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: testPayload
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          name: functionName,
          status: 'error',
          message: error.message || 'Function error',
          details: `Error: ${error.message}`,
          responseTime
        };
      }

      if (data?.error) {
        return {
          name: functionName,
          status: 'warning',
          message: 'Function responded with error',
          details: data.error,
          responseTime
        };
      }

      return {
        name: functionName,
        status: 'success',
        message: 'Function working correctly',
        details: `Response time: ${responseTime}ms`,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        name: functionName,
        status: 'error',
        message: 'Function failed to execute',
        details: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      };
    }
  };

  const runSystemTests = async () => {
    setTesting(true);
    setResults([]);
    
    toast({
      title: "Testing All Edge Functions",
      description: "Running comprehensive function tests...",
    });

    const testResults: TestResult[] = [];

    // Test all edge functions in batches to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < EDGE_FUNCTIONS.length; i += batchSize) {
      const batch = EDGE_FUNCTIONS.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (functionName) => {
        const result = await testEdgeFunction(functionName);
        testResults.push(result);
        setResults([...testResults]);
        return result;
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < EDGE_FUNCTIONS.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setTesting(false);

    // Summary statistics
    const passed = testResults.filter(r => r.status === 'success').length;
    const warnings = testResults.filter(r => r.status === 'warning').length;
    const failed = testResults.filter(r => r.status === 'error').length;
    const total = testResults.length;
    const avgResponseTime = Math.round(
      testResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / total
    );
    
    toast({
      title: "Edge Function Tests Complete",
      description: `${passed} passed, ${warnings} warnings, ${failed} failed. Avg response: ${avgResponseTime}ms`,
      variant: failed === 0 ? "default" : "destructive"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edge Functions Test Suite</CardTitle>
        <CardDescription>
          Test all {EDGE_FUNCTIONS.length} edge functions to verify they're working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runSystemTests} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run System Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium">{result.name}</h5>
                      {getStatusBadge(result.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-1 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}