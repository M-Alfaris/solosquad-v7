import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MemoryTest() {
  const [testUserId, setTestUserId] = useState('test-user-123');
  const [testMessage, setTestMessage] = useState('Hello, can you remember me?');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testStoreMemory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'store_memory',
          user_id: testUserId,
          conversation_id: crypto.randomUUID(),
          message_type: 'user',
          content: testMessage,
          context: { test: true },
          tools_used: []
        }
      });

      console.log('Store memory result:', { data, error });
      setResults({ action: 'store_memory', data, error });
    } catch (error) {
      console.error('Error storing memory:', error);
      setResults({ action: 'store_memory', error: error.message });
    }
    setLoading(false);
  };

  const testGetUserContext = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-memory', {
        body: {
          action: 'get_user_context',
          user_id: testUserId,
          limit: 5
        }
      });

      console.log('Get user context result:', { data, error });
      setResults({ action: 'get_user_context', data, error });
    } catch (error) {
      console.error('Error getting user context:', error);
      setResults({ action: 'get_user_context', error: error.message });
    }
    setLoading(false);
  };

  const testAIMessage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-ai-message', {
        body: {
          message: testMessage,
          senderId: testUserId,
          sessionId: crypto.randomUUID(),
          context: 'test'
        }
      });

      console.log('AI message result:', { data, error });
      setResults({ action: 'process_ai_message', data, error });
    } catch (error) {
      console.error('Error processing AI message:', error);
      setResults({ action: 'process_ai_message', error: error.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Memory System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test User ID:</label>
            <Input
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="Enter test user ID"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Test Message:</label>
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter test message"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testStoreMemory} disabled={loading}>
              Test Store Memory
            </Button>
            <Button onClick={testGetUserContext} disabled={loading}>
              Test Get User Context
            </Button>
            <Button onClick={testAIMessage} disabled={loading}>
              Test AI Message Processing
            </Button>
          </div>

          {loading && (
            <div className="text-sm text-muted-foreground">
              Testing... Check console for detailed logs.
            </div>
          )}

          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Test Results: {results.action}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}