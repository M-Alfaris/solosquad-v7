import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Facebook, Clock, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { User, FacebookPage } from '@/lib/types';
interface FacebookAuthProps {
  onAuthSuccess?: (user: User) => void;
}
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}
export const FacebookAuth: React.FC<FacebookAuthProps> = ({
  onAuthSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [fbAccessToken, setFbAccessToken] = useState<string>('');
  useEffect(() => {
    initializeFacebook();
  }, []);
  const initializeFacebook = async () => {
    try {
      console.log('[FacebookAuth] Starting Facebook SDK initialization...');

      // Get Facebook App ID from secure endpoint
      const {
        data,
        error
      } = await supabase.functions.invoke('get-facebook-app-id');
      console.log('[FacebookAuth] App ID response:', {
        data,
        error
      });
      if (error) {
        console.error('[FacebookAuth] App ID error:', error);
        toast.error(`Failed to get Facebook App ID: ${error.message}`);
        return;
      }
      if (!data?.appId) {
        console.error('[FacebookAuth] No App ID in response:', data);
        toast.error('Facebook App ID not configured properly');
        return;
      }
      console.log('[FacebookAuth] Got App ID:', data.appId);

      // Load Facebook SDK
      if (!window.FB) {
        console.log('[FacebookAuth] Loading Facebook SDK...');
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;

        // Add load timeout
        const timeout = setTimeout(() => {
          console.error('[FacebookAuth] SDK load timeout');
          toast.error('Facebook SDK failed to load. Please check your internet connection.');
        }, 10000);
        script.onload = () => {
          console.log('[FacebookAuth] SDK script loaded');
          clearTimeout(timeout);
        };
        script.onerror = () => {
          console.error('[FacebookAuth] SDK script failed to load');
          clearTimeout(timeout);
          toast.error('Failed to load Facebook SDK');
        };
        document.head.appendChild(script);
        window.fbAsyncInit = () => {
          console.log('[FacebookAuth] Initializing FB SDK with App ID:', data.appId);
          try {
            window.FB.init({
              appId: data.appId,
              cookie: true,
              xfbml: true,
              version: 'v23.0'
            });

            // Verify SDK is ready
            window.FB.getLoginStatus((response: any) => {
              console.log('[FacebookAuth] SDK initialized, login status:', response);
              setIsInitialized(true);
              toast.success('Facebook SDK loaded successfully');
            });
          } catch (initError) {
            console.error('[FacebookAuth] SDK init error:', initError);
            toast.error('Failed to initialize Facebook SDK');
          }
        };
      } else {
        console.log('[FacebookAuth] FB SDK already loaded');
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('[FacebookAuth] Error initializing Facebook:', error);
      toast.error(`Failed to initialize Facebook SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  const handleFacebookLogin = () => {
    if (!isInitialized) {
      console.error('[FacebookAuth] SDK not initialized');
      toast.error('Facebook SDK not initialized. Please refresh the page.');
      return;
    }
    if (!window.FB) {
      console.error('[FacebookAuth] FB object not available');
      toast.error('Facebook SDK not available. Please refresh the page.');
      return;
    }
    console.log('[FacebookAuth] Starting Facebook login...');
    setIsLoading(true);
    
    // For OAuth flow, redirect to Facebook's OAuth dialog
    const facebookAppId = '1273421897705875'; // Use your Facebook App ID
    const redirectUri = `${window.location.origin}/facebook/callback`;
    const scope = 'pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,email,instagram_basic,instagram_manage_comments';
    
    const oauthUrl = `https://www.facebook.com/v23.0/dialog/oauth?` +
      `client_id=${facebookAppId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=code&` +
      `state=${crypto.randomUUID()}`;
    
    console.log('[FacebookAuth] Redirecting to Facebook OAuth:', oauthUrl);
    window.location.href = oauthUrl;
    
    // Keep the existing SDK-based login as fallback
    /*
    window.FB.login((response: any) => {
      console.log('[FacebookAuth] Login response:', response);
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        console.log('[FacebookAuth] Got access token, length:', accessToken?.length);
        setFbAccessToken(accessToken);

        // Get user info
        console.log('[FacebookAuth] Fetching user info...');
        window.FB.api('/me', {
          fields: 'id,name,email'
        }, (userResponse: any) => {
          console.log('[FacebookAuth] User API response:', userResponse);
          if (userResponse && !userResponse.error) {
            const userData: User = {
              id: userResponse.id,
              name: userResponse.name,
              email: userResponse.email,
              subscription_status: 'trial',
              trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            };
            console.log('[FacebookAuth] Setting user data:', userData);
            setCurrentUser(userData);
            fetchUserPages(accessToken);
          } else {
            console.error('[FacebookAuth] User API error:', userResponse?.error);
            toast.error(`Failed to get user information: ${userResponse?.error?.message || 'Unknown error'}`);
            setIsLoading(false);
          }
        });
      } else {
        console.error('[FacebookAuth] No auth response:', response);
        const errorMsg = response.error_description || response.error || 'Login cancelled or failed';
        toast.error(`Facebook login failed: ${errorMsg}`);
        setIsLoading(false);
      }
    }, {
      scope: 'pages_show_list,pages_manage_metadata,pages_read_engagement,pages_manage_posts,email,instagram_basic,instagram_manage_comments'
    });
    */
  };
  const fetchUserPages = async (accessToken: string) => {
    try {
      console.log('[FacebookAuth] Fetching user pages...');
      const {
        data,
        error
      } = await supabase.functions.invoke('get-user-pages-enhanced', {
        body: {
          fbAccessToken: accessToken
        }
      });
      console.log('[FacebookAuth] Pages fetch response:', {
        data,
        error
      });
      if (error) {
        console.error('[FacebookAuth] Pages fetch error:', error);
        throw error;
      }
      if (data?.success) {
        console.log('[FacebookAuth] Found pages:', data.pages?.length);
        setPages(data.pages || []);
        setShowPageSelection(true);
        if (!data.pages || data.pages.length === 0) {
          toast.error('No manageable Facebook pages found. Make sure you have admin access to at least one page.');
        }
      } else {
        console.error('[FacebookAuth] Pages fetch failed:', data);
        throw new Error(data?.error || 'Failed to fetch pages');
      }
    } catch (error) {
      console.error('[FacebookAuth] Error fetching pages:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to fetch Facebook pages: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePageToggle = (pageId: string) => {
    setSelectedPages(prev => prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]);
  };
  const handleCompleteSetup = async () => {
    if (selectedPages.length === 0) {
      toast.error('Please select at least one page');
      return;
    }
    if (!currentUser) {
      toast.error('User data not available');
      return;
    }
    if (!fbAccessToken) {
      toast.error('Facebook access token not available');
      return;
    }
    console.log('[FacebookAuth] Starting setup completion...');
    setIsLoading(true);
    try {
      const selectedPageData = pages.filter(page => selectedPages.includes(page.id));
      console.log('[FacebookAuth] Selected pages:', selectedPageData);
      const requestBody = {
        fbAccessToken,
        fbUserData: currentUser,
        selectedPages: selectedPageData
      };
      console.log('[FacebookAuth] Sending auth request...', {
        ...requestBody,
        fbAccessToken: '***HIDDEN***'
      });
      const {
        data,
        error
      } = await supabase.functions.invoke('facebook-auth', {
        body: requestBody
      });
      console.log('[FacebookAuth] Auth response:', {
        data,
        error
      });
      if (error) {
        console.error('[FacebookAuth] Auth error:', error);
        throw error;
      }
      if (data?.success) {
        console.log('[FacebookAuth] Setup completed successfully');
        toast.success('Setup completed successfully!');
        onAuthSuccess?.(currentUser);
      } else {
        console.error('[FacebookAuth] Setup failed:', data);
        throw new Error(data?.error || 'Setup failed');
      }
    } catch (error) {
      console.error('[FacebookAuth] Error completing setup:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to complete setup: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };
  if (!showPageSelection) {
    return <Card className="w-full max-w-md mx-auto glass-card border-0 shadow-lg">
        
        
      </Card>;
  }
  return <Card className="w-full max-w-2xl mx-auto glass-card border-0 shadow-lg">
      <CardHeader className="space-y-4">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-4">
            <Facebook className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl font-bold">Select Your Facebook Pages</CardTitle>
          <CardDescription className="text-base mt-2">
            Choose which pages you want to enable AI responses for. You can change this later.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentUser && <Alert className="border-success/20 bg-success/10">
            <Crown className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              Welcome, {currentUser.name}! Your 14-day free trial starts now.
            </AlertDescription>
          </Alert>}

        {pages.length === 0 ? <Alert className="border-warning/20 bg-warning/10">
            <AlertDescription className="text-warning-foreground">
              No eligible pages found. Make sure you have admin access to at least one Facebook page.
            </AlertDescription>
          </Alert> : <div className="space-y-3 max-h-72 overflow-y-auto">
            {pages.map(page => <div key={page.id} className="flex items-center space-x-4 p-4 glass-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
                <Checkbox id={page.id} checked={selectedPages.includes(page.id)} onCheckedChange={() => handlePageToggle(page.id)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <div className="flex-1 min-w-0">
                  <label htmlFor={page.id} className="font-medium cursor-pointer block">
                    {page.name}
                  </label>
                  {page.category && <p className="text-sm text-muted-foreground mt-1">{page.category}</p>}
                </div>
              </div>)}
          </div>}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => setShowPageSelection(false)} disabled={isLoading} size="lg">
            Back
          </Button>
          <Button onClick={handleCompleteSetup} disabled={isLoading || selectedPages.length === 0} className="flex-1 btn-primary h-12 font-semibold">
            {isLoading ? <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Setting up...
              </> : `Continue with ${selectedPages.length} page${selectedPages.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>;
};