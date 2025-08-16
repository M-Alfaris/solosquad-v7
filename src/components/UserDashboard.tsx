import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Crown, Settings, BarChart3, MessageSquare, Users, Calendar, TestTube, Instagram, ExternalLink, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { MemoryTest } from '@/components/MemoryTest';
import { useNavigate } from 'react-router-dom';
import { User, Page, InstagramAccount, SubscriptionStatus } from '@/lib/types';
interface UserDashboardProps {
  user: User;
}
// AI Responses Card Component
const AIResponsesCard = () => {
  const [aiResponses, setAiResponses] = useState(0);

  useEffect(() => {
    const fetchAIResponses = async () => {
      try {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'ai_agent');
        
        setAiResponses(count || 0);
      } catch (error) {
        console.error('Error fetching AI responses:', error);
      }
    };

    fetchAIResponses();
  }, []);

  return (
    <Card className="glass-card border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">AI Responses</CardTitle>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-2">{aiResponses.toLocaleString()}</div>
        <p className="text-sm text-muted-foreground">Total responses</p>
      </CardContent>
    </Card>
  );
};

// Response Rate Card Component
const ResponseRateCard = () => {
  const [responseRate, setResponseRate] = useState(0);

  useEffect(() => {
    const fetchResponseRate = async () => {
      try {
        const { count: totalComments } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });

        const { count: aiComments } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'ai_agent');

        if (totalComments && totalComments > 0) {
          const rate = ((aiComments || 0) / totalComments) * 100;
          setResponseRate(Math.round(rate));
        }
      } catch (error) {
        console.error('Error fetching response rate:', error);
      }
    };

    fetchResponseRate();
  }, []);

  return (
    <Card className="glass-card border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Response Rate</CardTitle>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-2">{responseRate}%</div>
        <p className="text-sm text-muted-foreground">AI response coverage</p>
      </CardContent>
    </Card>
  );
};

// Average Response Time Card Component
const AverageResponseTimeCard = () => {
  const [avgResponseTime, setAvgResponseTime] = useState(0);

  useEffect(() => {
    const fetchAvgResponseTime = async () => {
      try {
        // Get user comments and AI responses with timestamps
        const { data: userComments } = await supabase
          .from('comments')
          .select('id, created_at, post_id')
          .eq('role', 'follower')
          .order('created_at', { ascending: true });

        const { data: aiComments } = await supabase
          .from('comments')
          .select('id, created_at, post_id, parent_comment_id')
          .eq('role', 'ai_agent')
          .order('created_at', { ascending: true });

        if (!userComments || !aiComments || userComments.length === 0 || aiComments.length === 0) {
          return;
        }

        let totalResponseTime = 0;
        let responseCount = 0;

        // Match AI responses to user comments
        aiComments.forEach(aiComment => {
          // Find the user comment this AI comment is responding to
          const relatedUserComment = userComments.find(userComment => 
            (aiComment.parent_comment_id === userComment.id) || 
            (aiComment.post_id === userComment.post_id && !aiComment.parent_comment_id)
          );

          if (relatedUserComment) {
            const userTime = new Date(relatedUserComment.created_at).getTime();
            const aiTime = new Date(aiComment.created_at).getTime();
            const responseTime = (aiTime - userTime) / 1000; // Convert to seconds

            if (responseTime > 0 && responseTime < 3600) { // Only count responses within 1 hour
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        });

        if (responseCount > 0) {
          setAvgResponseTime(Math.round(totalResponseTime / responseCount));
        }
      } catch (error) {
        console.error('Error fetching average response time:', error);
      }
    };

    fetchAvgResponseTime();
  }, []);

  return (
    <Card className="glass-card border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-2">{avgResponseTime}s</div>
        <p className="text-sm text-muted-foreground">Average AI response speed</p>
      </CardContent>
    </Card>
  );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user
}) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMemoryTest, setShowMemoryTest] = useState(false);
  useEffect(() => {
    fetchUserData();
  }, [user.fb_user_id]);
  const fetchUserData = async () => {
    try {
      // Fetch user's Facebook pages
      const {
        data: pagesData,
        error: pagesError
      } = await supabase.from('pages').select('*').eq('user_id', user.id);
      if (pagesError) {
        console.error('Error fetching pages:', pagesError);
      } else {
        setPages(pagesData || []);
      }

      // Mock Instagram accounts for now (until Instagram integration is complete)
      setInstagramAccounts([{
        id: '1',
        name: 'Business Account',
        username: '@business',
        is_active: true
      }, {
        id: '2',
        name: 'Personal Account',
        username: '@personal',
        is_active: false
      }]);

      // Fetch subscription status
      const {
        data: statusData,
        error: statusError
      } = await supabase.functions.invoke('check-subscription-status');
      if (statusError) {
        console.error('Error fetching subscription status:', statusError);
      } else if (statusData.success) {
        setSubscriptionStatus(statusData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpgrade = () => {
    // TODO: Implement Stripe checkout
    toast.info('Payment integration coming soon!');
  };
  const handleManagePages = () => {
    // Redirect to Facebook app for permissions
    window.open('https://www.facebook.com/v23.0/dialog/oauth?client_id=1273421897705875&redirect_uri=' + encodeURIComponent(window.location.origin + '/') + '&scope=pages_manage_posts,pages_read_engagement&response_type=code', '_blank');
  };
  const handleViewAnalytics = () => {
    navigate('/facebook-posts');
  };
  const handleConfigurePrompt = () => {
    navigate('/prompt-management');
  };
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-64">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }
  return <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          AI Agent Active
        </div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Welcome back, {user.name}!
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Your AI assistant is ready to engage with your Facebook audience. Monitor performance and manage settings below.
        </p>
      </div>

      {/* Subscription Status */}
      {subscriptionStatus && <Card className={`glass-card border-0 shadow-lg ${subscriptionStatus.isActive ? 'bg-success/5' : subscriptionStatus.isTrial ? 'bg-warning/5' : 'bg-destructive/5'}`}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">Subscription Status</CardTitle>
              <Badge className={`px-3 py-1 ${subscriptionStatus.isActive ? 'status-active' : subscriptionStatus.isTrial ? 'status-trial' : 'status-expired'}`}>
                {subscriptionStatus.isActive && <Crown className="h-3 w-3 mr-1" />}
                {subscriptionStatus.isTrial && <Clock className="h-3 w-3 mr-1" />}
                {subscriptionStatus.isSubscribed ? 'Pro' : subscriptionStatus.isTrial ? 'Trial' : 'Expired'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptionStatus.isTrial ? <Alert className="border-warning/20 bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
                <AlertDescription className="text-base">
                  Your free trial expires in <span className="font-semibold">{subscriptionStatus.daysLeft} days</span>. 
                  <Button variant="link" className="p-0 ml-2 h-auto text-primary font-semibold" onClick={handleUpgrade}>
                    Upgrade now →
                  </Button>
                </AlertDescription>
              </Alert> : subscriptionStatus.isSubscribed ? <div className="flex items-center gap-3 text-success">
                <Crown className="h-5 w-5" />
                <span className="text-base font-medium">You have an active Pro subscription</span>
              </div> : <Alert className="border-destructive/20 bg-destructive/10">
                <AlertDescription className="text-base">
                  Your trial has expired. 
                  <Button variant="link" className="p-0 ml-2 h-auto text-primary font-semibold" onClick={handleUpgrade}>
                    Upgrade to continue →
                  </Button>
                </AlertDescription>
              </Alert>}
          </CardContent>
        </Card>}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="glass-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facebook Pages</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{pages.length}</div>
            <p className="text-sm text-muted-foreground">
              <span className="text-success font-medium">{pages.filter(p => p.is_active).length} active</span> • {pages.length - pages.filter(p => p.is_active).length} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Instagram Accounts</CardTitle>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{instagramAccounts.length}</div>
            <p className="text-sm text-muted-foreground">
              <span className="text-success font-medium">{instagramAccounts.filter(acc => acc.is_active).length} active</span> • {instagramAccounts.length - instagramAccounts.filter(acc => acc.is_active).length} inactive
            </p>
          </CardContent>
        </Card>

        <AIResponsesCard />

        <ResponseRateCard />

        <AverageResponseTimeCard />
      </div>

      {/* Connected Social Media Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facebook Pages */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  Facebook Pages
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Manage which pages have AI responses enabled
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleManagePages} className="hover:bg-primary/10">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Posts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No pages connected</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Connect your Facebook pages to start using AI responses
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pages.slice(0, 3).map(page => (
                    <div key={page.id} className="flex items-center justify-between p-3 glass-card border border-border/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {page.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{page.name}</h4>
                          {page.category && <p className="text-xs text-muted-foreground">{page.category}</p>}
                        </div>
                      </div>
                      <Badge className={`px-2 py-1 text-xs ${page.is_active ? 'status-active' : 'status-inactive'}`}>
                        {page.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                  {pages.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" onClick={handleManagePages}>
                        View all {pages.length} pages
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {/* Always show connect pages button */}
              <div className="text-center pt-2">
                <Button onClick={handleManagePages} size="sm" variant="outline" className="w-full">
                  Connect More Pages
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instagram Accounts */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                    <Instagram className="h-5 w-5 text-purple-600" />
                  </div>
                  Instagram Accounts
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Manage Instagram AI interactions
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleManagePages} className="hover:bg-primary/10">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Posts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {instagramAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4">
                    <Instagram className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No accounts connected</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Connect your Instagram accounts to start using AI responses
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {instagramAccounts.slice(0, 3).map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 glass-card border border-border/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                          <Instagram className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{account.name}</h4>
                          <p className="text-xs text-muted-foreground">{account.username}</p>
                        </div>
                      </div>
                      <Badge className={`px-2 py-1 text-xs ${account.is_active ? 'status-active' : 'status-inactive'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                  {instagramAccounts.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" onClick={handleManagePages}>
                        View all {instagramAccounts.length} accounts
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {/* Always show connect accounts button */}
              <div className="text-center pt-2">
                <Button onClick={handleManagePages} size="sm" variant="outline" className="w-full">
                  Connect More Accounts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Business */}
        <Card className="glass-card border-0 shadow-lg opacity-75">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  WhatsApp Business
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  AI responses for WhatsApp Business messages
                </CardDescription>
              </div>
              <Button variant="outline" disabled className="opacity-50">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">WhatsApp Integration</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                AI-powered responses for your WhatsApp Business account
              </p>
              <Badge variant="outline" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card className="glass-card border-0 shadow-lg opacity-75">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  Telegram
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  AI bot for Telegram channels and groups
                </CardDescription>
              </div>
              <Button variant="outline" disabled className="opacity-50">
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Telegram Bot</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Smart AI responses for Telegram channels and groups
              </p>
              <Badge variant="outline" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-0 shadow-md cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group" onClick={handleViewAnalytics}>
          <CardHeader className="space-y-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold mb-2">View Posts & Analytics</CardTitle>
              <CardDescription className="text-base">
                See your social media posts and AI interaction analytics
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="glass-card border-0 shadow-md cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group" onClick={handleConfigurePrompt}>
          <CardHeader className="space-y-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold mb-2">Configure AI Prompts</CardTitle>
              <CardDescription className="text-base">
                Customize your AI responses and behavior settings
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="glass-card border-0 shadow-md cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group" onClick={handleManagePages}>
          <CardHeader className="space-y-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold mb-2">Manage Content</CardTitle>
              <CardDescription className="text-base">
                View and manage your Facebook and Instagram content
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Memory Test Section */}
      <Card className="glass-card border-0 shadow-lg">
        
        {showMemoryTest && <CardContent>
            <MemoryTest />
          </CardContent>}
      </Card>
    </div>;
};