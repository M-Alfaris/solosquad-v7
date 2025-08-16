import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const ConnectionTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, ...updates } : result
    ));
  };

  const runConnectionTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Supabase Connection
      addResult({
        name: 'Supabase Connection',
        status: 'pending',
        message: 'Testing Supabase connection...'
      });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        updateResult(0, {
          status: session ? 'success' : 'warning',
          message: session ? 'Connected to Supabase' : 'Not authenticated with Supabase',
          details: { authenticated: !!session, userId: session?.user?.id }
        });
      } catch (error) {
        updateResult(0, {
          status: 'error',
          message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      // Test 2: Facebook App ID
      addResult({
        name: 'Facebook App Configuration',
        status: 'pending',
        message: 'Checking Facebook App ID...'
      });

      try {
        const { data, error } = await supabase.functions.invoke('get-facebook-app-id');
        if (error) {
          updateResult(1, {
            status: 'error',
            message: `Failed to get Facebook App ID: ${error.message}`,
            details: { error }
          });
        } else if (data?.appId) {
          updateResult(1, {
            status: 'success',
            message: 'Facebook App ID configured',
            details: { appId: data.appId }
          });
        } else {
          updateResult(1, {
            status: 'error',
            message: 'Facebook App ID not configured',
            details: { response: data }
          });
        }
      } catch (error) {
        updateResult(1, {
          status: 'error',
          message: `Facebook App ID test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      // Test 3: Facebook SDK Loading
      addResult({
        name: 'Facebook SDK',
        status: 'pending',
        message: 'Checking Facebook SDK availability...'
      });

      if (window.FB) {
        updateResult(2, {
          status: 'success',
          message: 'Facebook SDK is loaded and available',
          details: { sdkLoaded: true }
        });
      } else {
        updateResult(2, {
          status: 'warning',
          message: 'Facebook SDK not loaded. This is normal if you haven\'t logged in yet.',
          details: { sdkLoaded: false }
        });
      }

      // Test 4: Database Schema Check
      addResult({
        name: 'Database Schema',
        status: 'pending',
        message: 'Checking database tables...'
      });

      try {
        // Check if required tables exist by trying to query them
        const [pagesCheck, profilesCheck, postsCheck] = await Promise.all([
          supabase.from('pages').select('id').limit(1),
          supabase.from('profiles').select('id').limit(1),
          supabase.from('posts').select('id').limit(1)
        ]);

        const tableStatus = {
          pages: !pagesCheck.error,
          profiles: !profilesCheck.error,
          posts: !postsCheck.error
        };

        const allTablesExist = Object.values(tableStatus).every(Boolean);

        updateResult(3, {
          status: allTablesExist ? 'success' : 'error',
          message: allTablesExist ? 'All required tables exist' : 'Some required tables are missing',
          details: tableStatus
        });
      } catch (error) {
        updateResult(3, {
          status: 'error',
          message: `Database schema check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      // Test 5: Edge Functions Health
      addResult({
        name: 'Edge Functions',
        status: 'pending',
        message: 'Testing edge functions...'
      });

      try {
        // Test multiple edge functions
        const healthChecks = await Promise.allSettled([
          supabase.functions.invoke('get-facebook-app-id'),
          // We can't test the others without proper auth/data, but we can check if they're deployed
        ]);

        const functionsWorking = healthChecks.filter(result => result.status === 'fulfilled').length;
        const totalFunctions = healthChecks.length;

        updateResult(4, {
          status: functionsWorking > 0 ? 'success' : 'error',
          message: `${functionsWorking}/${totalFunctions} edge functions responding`,
          details: { functionsWorking, totalFunctions }
        });
      } catch (error) {
        updateResult(4, {
          status: 'error',
          message: `Edge functions test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }

      toast.success('Connection tests completed');
    } catch (error) {
      toast.error('Connection tests failed');
      console.error('Connection test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'bg-success/10 text-success border-success/20',
      error: 'bg-destructive/10 text-destructive border-destructive/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      pending: 'bg-muted/10 text-muted-foreground border-muted/20'
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Connection Diagnostics
        </CardTitle>
        <CardDescription>
          Test your Facebook/Instagram integration setup to identify potential issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runConnectionTests}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Connection Tests
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.name}</span>
                        {getStatusBadge(result.status)}
                      </div>
                      <AlertDescription className="text-sm">
                        {result.message}
                      </AlertDescription>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {results.length > 0 && !isRunning && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Steps:</strong>
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>If Facebook App ID is missing, check your Supabase secrets configuration</li>
                <li>If database tables are missing, ensure your database migration was successful</li>
                <li>If edge functions fail, check the function logs in your Supabase dashboard</li>
                <li>For Facebook SDK issues, try refreshing the page or clearing browser cache</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};