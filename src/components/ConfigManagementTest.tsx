import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

type TestResult = {
  status: 'success' | 'error' | 'testing';
  message: string;
  data?: any;
  error?: any;
};

export function ConfigManagementTest() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testUserId] = useState('test-user-' + Date.now());
  const [loading, setLoading] = useState(false);

  const updateResult = (test: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [test]: result }));
  };

  const testPromptConfig = async () => {
    updateResult('prompt_config', { status: 'testing', message: 'Testing prompt configuration...' });
    
    try {
      // Test get active configuration
      const { data, error } = await supabase.functions.invoke('manage-prompt-config', {
        body: { action: 'get_active' }
      });

      if (error) {
        updateResult('prompt_config', { 
          status: 'error', 
          message: 'Failed to get active configuration', 
          error 
        });
      } else {
        updateResult('prompt_config', { 
          status: 'success', 
          message: 'Prompt configuration system working', 
          data 
        });
      }
    } catch (error) {
      updateResult('prompt_config', { 
        status: 'error', 
        message: 'Prompt config function failed', 
        error: error.message 
      });
    }
  };

  const testAIMemory = async () => {
    updateResult('ai_memory', { status: 'testing', message: 'Testing AI memory system...' });
    
    try {
      // Test store memory
      const storeResult = await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'store_memory',
          user_id: testUserId,
          conversation_id: crypto.randomUUID(),
          message_type: 'user',
          content: 'Test memory storage',
          context: { test: true }
        }
      });

      if (storeResult.error) {
        updateResult('ai_memory', { 
          status: 'error', 
          message: 'Failed to store memory', 
          error: storeResult.error 
        });
        return;
      }

      // Test get user context
      const getResult = await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'get_user_context',
          user_id: testUserId,
          limit: 5
        }
      });

      if (getResult.error) {
        updateResult('ai_memory', { 
          status: 'error', 
          message: 'Failed to get user context', 
          error: getResult.error 
        });
      } else {
        updateResult('ai_memory', { 
          status: 'success', 
          message: 'AI memory system working', 
          data: { store: storeResult.data, get: getResult.data }
        });
      }
    } catch (error) {
      updateResult('ai_memory', { 
        status: 'error', 
        message: 'AI memory function failed', 
        error: error.message 
      });
    }
  };

  const testAIProcessing = async () => {
    updateResult('ai_processing', { status: 'testing', message: 'Testing AI message processing...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-message', {
        body: {
          message: 'test message',
          senderId: testUserId,
          sessionId: 'test',
          context: 'test'
        }
      });

      if (error) {
        updateResult('ai_processing', { 
          status: 'error', 
          message: 'Failed to process AI message', 
          error 
        });
      } else {
        updateResult('ai_processing', { 
          status: 'success', 
          message: 'AI processing system working', 
          data 
        });
      }
    } catch (error) {
      updateResult('ai_processing', { 
        status: 'error', 
        message: 'AI processing function failed', 
        error: error.message 
      });
    }
  };

  const testAnalyzeTrigger = async () => {
    updateResult('analyze_trigger', { status: 'testing', message: 'Testing trigger analysis...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-trigger', {
        body: {
          text: 'ai help me',
          triggerConfig: {
            mode: 'keyword',
            keywords: ['ai'],
            nlpIntents: []
          }
        }
      });

      if (error) {
        updateResult('analyze_trigger', { 
          status: 'error', 
          message: 'Failed to analyze trigger', 
          error 
        });
      } else {
        updateResult('analyze_trigger', { 
          status: 'success', 
          message: 'Trigger analysis working', 
          data 
        });
      }
    } catch (error) {
      updateResult('analyze_trigger', { 
        status: 'error', 
        message: 'Trigger analysis function failed', 
        error: error.message 
      });
    }
  };

  const testPineconeSearch = async () => {
    updateResult('pinecone_search', { status: 'testing', message: 'Testing file search...' });
    
    try {
      const { data, error } = await supabase.functions.invoke('pinecone-search', {
        body: {
          action: 'search',
          query: 'test search',
          fileReferences: []
        }
      });

      if (error) {
        updateResult('pinecone_search', { 
          status: 'error', 
          message: 'File search test failed', 
          error 
        });
      } else {
        updateResult('pinecone_search', { 
          status: 'success', 
          message: 'File search system working', 
          data 
        });
      }
    } catch (error) {
      updateResult('pinecone_search', { 
        status: 'error', 
        message: 'File search function failed', 
        error: error.message 
      });
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setResults({});
    
    try {
      await Promise.all([
        testPromptConfig(),
        testAIMemory(),
        testAIProcessing(),
        testAnalyzeTrigger(),
        testPineconeSearch()
      ]);
    } catch (error) {
      console.error('Error running tests:', error);
    }
    
    setLoading(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="outline">Not tested</Badge>;
    }
  };

  const tests = [
    { key: 'prompt_config', name: 'Prompt Configuration', description: 'Test prompt config retrieval and parsing' },
    { key: 'ai_memory', name: 'AI Memory System', description: 'Test conversation memory storage and retrieval' },
    { key: 'ai_processing', name: 'AI Message Processing', description: 'Test AI response generation' },
    { key: 'analyze_trigger', name: 'Trigger Analysis', description: 'Test keyword and NLP trigger detection' },
    { key: 'pinecone_search', name: 'File Search', description: 'Test document search functionality' }
  ];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration Management System Test</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test all critical configuration management functions to verify they're working properly.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={runAllTests} disabled={loading} className="mb-4">
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          <div className="space-y-4">
            {tests.map(test => {
              const result = results[test.key];
              return (
                <Card key={test.key} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result?.status)}
                        <h3 className="font-medium">{test.name}</h3>
                      </div>
                      {getStatusBadge(result?.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                    
                    {result && (
                      <div className="space-y-2">
                        <p className="text-sm">{result.message}</p>
                        
                        {result.error && (
                          <Card className="bg-red-50 border-red-200">
                            <CardContent className="pt-3">
                              <p className="text-sm font-medium text-red-700 mb-1">Error Details:</p>
                              <pre className="text-xs text-red-600 overflow-auto">
                                {JSON.stringify(result.error, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        )}
                        
                        {result.data && result.status === 'success' && (
                          <Card className="bg-green-50 border-green-200">
                            <CardContent className="pt-3">
                              <p className="text-sm font-medium text-green-700 mb-1">Success Data:</p>
                              <pre className="text-xs text-green-600 overflow-auto max-h-32">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-900 mb-2">Test Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-green-600">
                  {Object.values(results).filter(r => r.status === 'success').length}
                </p>
                <p className="text-green-600">Passed</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-red-600">
                  {Object.values(results).filter(r => r.status === 'error').length}
                </p>
                <p className="text-red-600">Failed</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-yellow-600">
                  {Object.values(results).filter(r => r.status === 'testing').length}
                </p>
                <p className="text-yellow-600">Testing</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-600">
                  {tests.length - Object.keys(results).length}
                </p>
                <p className="text-gray-600">Not Tested</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-blue-600">{tests.length}</p>
                <p className="text-blue-600">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}