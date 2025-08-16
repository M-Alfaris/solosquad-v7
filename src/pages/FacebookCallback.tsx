import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Facebook, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function FacebookCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Facebook connection...');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    handleFacebookCallback();
  }, []);

  const handleFacebookCallback = async () => {
    try {
      // Get parameters from URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      console.log('Facebook callback received:', {
        hasCode: !!code,
        error,
        errorDescription,
        state
      });

      setDebugInfo({
        hasCode: !!code,
        error,
        errorDescription,
        state,
        fullUrl: window.location.href
      });

      // Handle OAuth errors
      if (error) {
        setStatus('error');
        setMessage('Facebook connection failed');
        setErrorDetails(errorDescription || error);
        
        if (error === 'access_denied') {
          setMessage('Facebook access was denied');
          setErrorDetails('You need to grant permissions to connect your Facebook account.');
        }
        return;
      }

      // Handle missing authorization code
      if (!code) {
        setStatus('error');
        setMessage('Invalid callback');
        setErrorDetails('No authorization code received from Facebook.');
        return;
      }

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setStatus('error');
        setMessage('Authentication required');
        setErrorDetails('Please sign in to your account first.');
        return;
      }

      setMessage('Exchanging authorization code...');

      // Exchange authorization code for access token with enhanced logging
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('facebook-auth', {
        body: {
          authorizationCode: code,
          redirectUri: `${window.location.origin}/facebook/callback`,
          state: state
        }
      });

      console.log('Facebook auth response:', { tokenData, tokenError });

      if (tokenError) {
        console.error('Token exchange error:', tokenError);
        setStatus('error');
        setMessage('Failed to connect Facebook account');
        setErrorDetails(tokenError.message || 'Unknown error occurred');
        return;
      }

      if (!tokenData?.success) {
        setStatus('error');
        setMessage('Facebook connection failed');
        setErrorDetails(tokenData?.error || 'Unknown error occurred');
        return;
      }

      // Test the enhanced pages endpoint with the new token
      setMessage('Testing Facebook page access...');
      
      try {
        const { data: pagesData, error: pagesError } = await supabase.functions.invoke('get-user-pages-enhanced', {
          body: {
            fbAccessToken: tokenData.accessToken
          }
        });

        console.log('Enhanced pages test:', { pagesData, pagesError });
        
        setDebugInfo(prev => ({
          ...prev,
          pagesTest: {
            success: pagesData?.success,
            pageCount: pagesData?.pages?.length,
            debug: pagesData?.debug,
            error: pagesError
          }
        }));

        if (pagesData?.pages?.length > 0) {
          setMessage(`Facebook account connected successfully! Found ${pagesData.pages.length} manageable page(s).`);
        } else {
          setMessage('Facebook account connected, but no manageable pages found.');
        }
      } catch (pagesTestError) {
        console.error('Pages test failed:', pagesTestError);
        setMessage('Facebook account connected, but page access test failed.');
      }

      setStatus('success');

      // Show success message
      toast.success('Facebook account connected successfully!');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);

    } catch (error) {
      console.error('Facebook callback error:', error);
      setStatus('error');
      setMessage('Connection failed');
      setErrorDetails(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleRetry = () => {
    setStatus('loading');
    setMessage('Retrying connection...');
    setErrorDetails('');
    handleFacebookCallback();
  };

  const handleGoToDashboard = () => {
    navigate('/', { replace: true });
  };

  const handleGoToAuth = () => {
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-primary flex items-center justify-center">
            {status === 'loading' && <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />}
            {status === 'success' && <CheckCircle className="w-8 h-8 text-primary-foreground" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-primary-foreground" />}
          </div>
          
          <CardTitle className="text-xl font-bold">
            {status === 'loading' && 'Connecting Facebook Account'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Facebook className="w-4 h-4 text-primary" />
                <span>Securely connecting to Facebook...</span>
              </div>
              <div className="mt-4 space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-gradient-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This may take a few moments...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <Alert className="border-success/20 bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success-foreground">
                  Your Facebook account has been successfully connected to Solosquad. 
                  You can now manage your Facebook pages and enable AI responses.
                </AlertDescription>
              </Alert>
              
              {debugInfo.pagesTest && (
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <strong>Connection Details:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• Pages found: {debugInfo.pagesTest.pageCount || 0}</li>
                    <li>• Pages with Instagram: {debugInfo.pagesTest.debug?.pagesWithInstagram || 0}</li>
                    <li>• Token valid: {debugInfo.pagesTest.debug?.tokenValid ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full btn-primary"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Redirecting automatically in a few seconds...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert className="border-destructive/20 bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive-foreground">
                  {errorDetails || 'An error occurred while connecting your Facebook account.'}
                </AlertDescription>
              </Alert>
              
              {Object.keys(debugInfo).length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Debug Information</summary>
                  <pre className="mt-2 p-2 bg-muted/50 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
              
              <div className="space-y-2">
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full btn-primary"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={handleGoToAuth}
                  variant="ghost"
                  className="w-full text-sm"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="pt-4 border-t border-border">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Need help? Click here for troubleshooting
              </summary>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p><strong>Common issues:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Make sure you're an admin of the Facebook page you want to connect</li>
                  <li>Check that your Facebook account has the necessary permissions</li>
                  <li>Try clearing your browser cache and cookies</li>
                  <li>Ensure you're signed into the correct Facebook account</li>
                  <li>Verify your Facebook pages have the required permissions (MANAGE, CREATE_CONTENT, MODERATE)</li>
                </ul>
                <p className="mt-2">
                  <strong>Still having issues?</strong> Contact support at{' '}
                  <a href="mailto:ceo@cyberbeam.ie" className="text-primary hover:text-primary/80 underline">
                    ceo@cyberbeam.ie
                  </a>
                </p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}