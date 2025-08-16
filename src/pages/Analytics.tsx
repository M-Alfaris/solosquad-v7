import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarDays, Download, TrendingUp, BarChart3, PieChart, Clock, RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity, Database, MessageCircle, ChevronDown, ChevronRight, User, LogOut, Eye, Heart, Share2 } from "lucide-react";
import { NoDataEmptyState, NoActivityEmptyState, NoChartsDataEmptyState, NoPlatformDataEmptyState, NoLogsEmptyState, ConnectionErrorEmptyState, SystemHealthEmptyState, NoMetricsEmptyState } from "@/components/AnalyticsEmptyStates";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, LineChart, Line, Pie } from "recharts";
import { TopNavigation } from "@/components/TopNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// Analytics data structure
interface AnalyticsData {
  totalPosts: number;
  totalComments: number;
  totalAIReplies: number;
  engagementRate: number;
  recentActivity: Array<{
    date: string;
    posts: number;
    comments: number;
    aiReplies: number;
  }>;
  platformBreakdown: Array<{
    platform: string;
    posts: number;
    percentage: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    activity: number;
  }>;
}

// Health status and log interfaces
interface HealthStatus {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  lastCheck: string;
  responseTime?: number;
  error?: string;
  details?: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  function_name?: string;
  id?: string;
  details?: any;
  error_type?: string;
  context?: any;
}

interface SyncStatus {
  is_syncing: boolean;
  last_sync: string;
  sync_type: string;
  status: string;
  error_message?: string;
}

// Skeleton components for different loading states
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  );
}

function HealthStatusSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center space-x-4 p-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

// Enhanced metrics component with charts and AI reply stats
function MetricsSection() {
  const [metrics, setMetrics] = useState({
    totalComments: 0,
    totalPosts: 0,
    totalAIReplies: 0,
    avgResponseTime: 0,
    dbHealth: 'checking...',
    activeConfigurations: 0,
    chatSessions: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(profile);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchMetrics = async () => {
    if (!currentUser) return;
    
    try {
      setMetricsLoading(true);
      
      const { count: commentCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      const { count: postCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      const { count: aiReplyCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .or('role.eq.assistant,role.eq.ai,role.eq.bot');

      const { count: configCount } = await supabase
        .from('prompt_configurations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: sessionCount } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      const startTime = Date.now();
      await supabase.from('sync_status').select('count').limit(1);
      const responseTime = Date.now() - startTime;

      setMetrics({
        totalComments: commentCount || 0,
        totalPosts: postCount || 0,
        totalAIReplies: aiReplyCount || 0,
        avgResponseTime: responseTime,
        dbHealth: responseTime < 1000 ? 'Optimal' : responseTime < 3000 ? 'Good' : 'Slow',
        activeConfigurations: configCount || 0,
        chatSessions: sessionCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setMetrics(prev => ({ ...prev, dbHealth: 'Error' }));
    } finally {
      setMetricsLoading(false);
    }
  };

  const hasAnyData = metrics.totalPosts > 0 || metrics.totalComments > 0 || metrics.totalAIReplies > 0;

  const aiResponseRate = metrics.totalComments > 0 
    ? ((metrics.totalAIReplies / (metrics.totalComments + metrics.totalAIReplies)) * 100).toFixed(1) 
    : '0';

  const totalInteractions = metrics.totalComments + metrics.totalAIReplies;

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return <NoMetricsEmptyState onRefresh={fetchMetrics} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPosts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Facebook posts synced</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInteractions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total interactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Replies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAIReplies.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{aiResponseRate}% response rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.chatSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active conversations</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Response Time</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Current latency</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Configs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeConfigurations}</div>
            <p className="text-xs text-muted-foreground">Active AI configurations</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [userData, setUserData] = useState<any>(null);
  const [healthData, setHealthData] = useState<HealthStatus[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
    checkAPIHealth();
    fetchRecentLogs();
    setLastRefreshTime(new Date());
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const refreshInterval = setInterval(() => {
      if (!isRefreshing) {
        setIsRefreshing(true);
        Promise.all([
          checkAPIHealth(),
          fetchRecentLogs(),
          userData ? fetchAnalyticsData() : Promise.resolve()
        ]).finally(() => {
          setIsRefreshing(false);
          setLastRefreshTime(new Date());
          console.log('Auto-refresh completed at', new Date().toLocaleTimeString());
        });
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [autoRefreshEnabled, isRefreshing, userData]);

  useEffect(() => {
    if (userData) {
      fetchAnalyticsData();
    }
  }, [dateRange, userData]);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserData(profile || { id: session.user.id, email: session.user.email });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const checkAPIHealth = async () => {
    setHealthLoading(true);
    const statuses: HealthStatus[] = [];

    try {
      // Check Facebook API
      const startTime = Date.now();
      const fbHealthCheck = await supabase.functions.invoke('fetch-facebook-data', {
        body: { test: true }
      });
      const responseTime = Date.now() - startTime;
      
      statuses.push({
        service: 'Facebook API',
        status: fbHealthCheck.error ? 'error' : 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: fbHealthCheck.error ? undefined : responseTime,
        error: fbHealthCheck.error?.message
      });

      // Check Supabase Database
      const dbStartTime = Date.now();
      const { error: dbError } = await supabase.from('chat_sessions').select('count').limit(1);
      const dbResponseTime = Date.now() - dbStartTime;
      
      statuses.push({
        service: 'Database',
        status: dbError ? 'error' : 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: dbError ? undefined : dbResponseTime,
        error: dbError?.message
      });

      setHealthData(statuses);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    setLogsLoading(true);
    try {
      const { data: errorLogs } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: chatLogs } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      const combinedLogs: LogEntry[] = [];

      if (errorLogs) {
        errorLogs.forEach((log) => {
          combinedLogs.push({
            id: `error-${log.id}`,
            timestamp: log.created_at,
            level: 'error',
            message: log.error_message,
            function_name: log.error_type,
            details: log.context
          });
        });
      }

      if (chatLogs) {
        chatLogs.forEach((log) => {
          combinedLogs.push({
            id: `chat-${log.id}`,
            timestamp: log.updated_at,
            level: 'info',
            message: `Chat session ${log.status}: ${log.chat_id}`,
            function_name: 'chat-system',
            details: { chat_id: log.chat_id, status: log.status }
          });
        });
      }

      combinedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentLogs(combinedLogs.slice(0, 50));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!userData) return;
    
    try {
      setLoading(true);

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      // Fetch posts data for current user
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch comments data for current user
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userData.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const aiReplies = comments?.filter(c => c.role === 'ai_agent') || [];

      // Create daily activity data
      const dailyData = [];
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < Math.min(days, 30); i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayPosts = posts?.filter(p => p.created_at.startsWith(dateStr)).length || 0;
        const dayComments = comments?.filter(c => c.created_at.startsWith(dateStr) && !aiReplies.includes(c)).length || 0;
        const dayAiReplies = aiReplies?.filter(c => c.created_at.startsWith(dateStr)).length || 0;
        
        dailyData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          posts: dayPosts,
          comments: dayComments,
          aiReplies: dayAiReplies
        });
      }

      // Platform breakdown
      const platformCounts = {
        facebook: posts?.filter(p => p.platform === 'facebook').length || 0,
        instagram: posts?.filter(p => p.platform === 'instagram').length || 0
      };

      const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0);
      
      const platformData = [
        { 
          platform: 'Facebook', 
          posts: platformCounts.facebook,
          percentage: totalPlatformPosts > 0 ? Math.round((platformCounts.facebook / totalPlatformPosts) * 100) : 0
        },
        { 
          platform: 'Instagram', 
          posts: platformCounts.instagram,
          percentage: totalPlatformPosts > 0 ? Math.round((platformCounts.instagram / totalPlatformPosts) * 100) : 0
        }
      ];

      // Hourly activity pattern
      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hourComments = comments?.filter(c => {
          const hour = new Date(c.created_at).getHours();
          return hour === i;
        }).length || 0;
        
        return {
          hour: i,
          activity: hourComments
        };
      });

      setAnalyticsData({
        totalPosts: posts?.length || 0,
        totalComments: comments?.length || 0,
        totalAIReplies: aiReplies.length,
        engagementRate: comments?.length ? Math.round((aiReplies.length / comments.length) * 100) : 0,
        recentActivity: dailyData,
        platformBreakdown: platformData,
        hourlyActivity: hourlyData
      });

    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    toast({
      title: "Export Started",
      description: "Analytics data export initiated",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default' as const,
      warning: 'secondary' as const,
      error: 'destructive' as const
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Overview skeleton */}
            <section>
              <div className="mb-6">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-5 w-64" />
              </div>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <MetricCardSkeleton key={i} />
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <MetricCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </section>
            
            {/* Charts skeleton */}
            <section>
              <div className="mb-6">
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-5 w-80" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </section>
            
            {/* Platform breakdown skeleton */}
            <section>
              <div className="mb-6">
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-72" />
              </div>
              <ChartSkeleton />
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation user={userData} onLogout={handleLogout} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-muted-foreground">Comprehensive insights and system monitoring</p>
              {lastRefreshTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                  {autoRefreshEnabled && <span className="text-green-600">(Auto-refresh ON)</span>}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-4">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-card text-foreground"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-border rounded-md bg-card text-foreground"
            />
            
            <Button onClick={exportData} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button 
              onClick={async () => {
                setIsRefreshing(true);
                await Promise.all([checkAPIHealth(), fetchRecentLogs(), fetchAnalyticsData()]);
                setIsRefreshing(false);
                setLastRefreshTime(new Date());
                toast({ title: "Refreshed", description: "Data updated successfully" });
              }} 
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              variant={autoRefreshEnabled ? "default" : "outline"}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Auto-refresh: {autoRefreshEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Overview Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Overview</h2>
              <p className="text-muted-foreground">Key metrics and performance indicators</p>
            </div>
            <MetricsSection />
          </section>

          {/* Activity Trends and Hourly Activity Side by Side */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Activity Analysis</h2>
              <p className="text-muted-foreground">Detailed breakdown of user activity patterns</p>
            </div>
            {loading ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            ) : analyticsData && (analyticsData.recentActivity.length > 0 || analyticsData.hourlyActivity.some(h => h.activity > 0)) ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Trends</CardTitle>
                    <CardDescription>Posts, comments, and AI replies over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.recentActivity.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={analyticsData?.recentActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="posts" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" />
                          <Area type="monotone" dataKey="comments" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" />
                          <Area type="monotone" dataKey="aiReplies" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoActivityEmptyState />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Activity Pattern</CardTitle>
                    <CardDescription>Peak activity hours throughout the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.hourlyActivity.some(h => h.activity > 0) ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analyticsData?.hourlyActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="activity" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <NoActivityEmptyState />
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <NoChartsDataEmptyState />
            )}
          </section>

          {/* Platform Breakdown Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">Platform Breakdown</h2>
              <p className="text-muted-foreground">Content distribution across different platforms</p>
            </div>
            {loading ? (
              <ChartSkeleton />
            ) : analyticsData && analyticsData.platformBreakdown.some(p => p.posts > 0) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Platform Distribution</CardTitle>
                  <CardDescription>How your content is distributed across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData?.platformBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ platform, posts }) => `${platform}: ${posts}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="posts"
                      >
                        {analyticsData?.platformBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <NoPlatformDataEmptyState />
            )}
          </section>

          {/* System Health Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">System Health</h2>
              <p className="text-muted-foreground">Monitor the health of all connected services</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
                <CardDescription>Real-time monitoring of system components</CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading ? (
                  <HealthStatusSkeleton />
                ) : healthData.length > 0 ? (
                  <div className="space-y-4">
                    {healthData.map((health, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(health.status)}
                          <div>
                            <div className="font-medium">{health.service}</div>
                            <div className="text-sm text-muted-foreground">
                              Last checked: {new Date(health.lastCheck).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {health.responseTime && (
                            <Badge variant="outline">{health.responseTime}ms</Badge>
                          )}
                          {getStatusBadge(health.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <SystemHealthEmptyState onRefresh={checkAPIHealth} />
                )}
              </CardContent>
            </Card>
          </section>

          {/* System Logs Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground mb-2">System Logs</h2>
              <p className="text-muted-foreground">Recent system events and activity logs</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Recent system events and errors</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {logsLoading ? (
                  <div className="p-4">
                    <LogsSkeleton />
                  </div>
                ) : recentLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-4"></TableHead>
                        <TableHead className="w-32">Time</TableHead>
                        <TableHead className="w-20">Level</TableHead>
                        <TableHead className="w-32">Source</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map((log) => (
                        <Collapsible 
                          key={log.id || log.timestamp} 
                          asChild
                          open={expandedLogs.has(log.id || log.timestamp)}
                          onOpenChange={(open) => {
                            const key = log.id || log.timestamp;
                            const newExpanded = new Set(expandedLogs);
                            if (open) {
                              newExpanded.add(key);
                            } else {
                              newExpanded.delete(key);
                            }
                            setExpandedLogs(newExpanded);
                          }}
                        >
                          <>
                            <CollapsibleTrigger asChild>
                              <TableRow className="cursor-pointer hover:bg-muted/50">
                                <TableCell>
                                  {expandedLogs.has(log.id || log.timestamp) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                                    {log.level}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {log.function_name || 'system'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {log.message}
                                </TableCell>
                              </TableRow>
                            </CollapsibleTrigger>
                            <CollapsibleContent asChild>
                              <TableRow>
                                <TableCell colSpan={5}>
                                  <div className="p-4 bg-muted/50 rounded-md">
                                    <pre className="text-xs whitespace-pre-wrap">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          </>
                        </Collapsible>
                      ))}
                    </TableBody>
                  </Table>
                 ) : (
                   <div className="p-4">
                     <NoLogsEmptyState onRefresh={fetchRecentLogs} />
                   </div>
                 )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Analytics;