import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageCircle, RefreshCw, Search, Clock, User, Bot, Filter, Archive, Trash2, Download } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { AppLayout } from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import PostFilters from "@/components/PostFilters";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExportDialog } from "@/components/ExportDialog";
import { usePagination } from "@/hooks/usePagination";
import { useLazyLoading } from "@/hooks/useLazyLoading";

// Post-related interfaces
interface Post {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  media_url?: string;
  platform?: string;
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  role: "user" | "ai_agent";
  updated_at: string;
}

interface PostWithComments extends Post {
  comments: Comment[];
}

// Conversation-related interfaces
interface Conversation {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string;
  status: 'active' | 'archived' | 'flagged';
  platform: 'facebook' | 'instagram';
  post_content?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  message_type: 'user' | 'assistant';
  created_at: string;
  tools_used?: string[];
}

const FacebookPosts = () => {
  // Posts state
  const [posts, setPosts] = useState<PostWithComments[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Posts filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_comments' | 'most_ai_replies'>('newest');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'media_only' | 'text_only'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const notifications = useNotifications();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.display_name || session.user.email || '',
            email: session.user.email || '',
            fb_user_id: profile.fb_user_id || '',
            subscription_status: 'trial',
            trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPosts();
      fetchConversations();
    }
  }, [currentUser, statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Posts functions
  const fetchPosts = async () => {
    try {
      // Only fetch posts for the current user
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq('user_id', currentUser?.id)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Only fetch comments for the current user's posts
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq('user_id', currentUser?.id)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const postsWithComments: PostWithComments[] = (postsData || []).map(post => ({
        ...post,
        comments: (commentsData || []).filter(comment => comment.post_id === post.id).map(comment => ({
          ...comment,
          role: comment.role as "user" | "ai_agent"
        }))
      }));

      setPosts(postsWithComments);
    } catch (error) {
      console.error("Error fetching posts:", error);
      notifications.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const syncAllPosts = async () => {
    setSyncing(true);
    try {
      // First check if user has connected pages
      const { data: userPages, error: pagesError } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', currentUser?.id);

      if (pagesError) {
        console.error("Error fetching user pages:", pagesError);
        notifications.error("Failed to fetch connected pages");
        return;
      }

      if (!userPages || userPages.length === 0) {
        notifications.warning("No Facebook pages or Instagram accounts connected. Please connect your accounts first.");
        return;
      }

      console.log("Syncing posts for pages:", userPages);

      // Sync posts for each connected page/account
      const syncPromises = userPages.map(async (page) => {
        if (page.platform === 'facebook' && page.fb_page_id && page.fb_page_token) {
          return supabase.functions.invoke("fetch-facebook-data", {
            body: {
              pageId: page.fb_page_id,
              accessToken: page.fb_page_token,
              userId: currentUser?.id
            }
          });
        } else if (page.platform === 'instagram' && page.ig_account_id && page.ig_access_token) {
          return supabase.functions.invoke("fetch-instagram-data", {
            body: {
              accountId: page.ig_account_id,
              accessToken: page.ig_access_token,
              userId: currentUser?.id
            }
          });
        }
        return null;
      }).filter(Boolean);

      const results = await Promise.allSettled(syncPromises);

      let successCount = 0;
      let errorCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successCount++;
        } else {
          errorCount++;
          console.error("Sync error:", result);
        }
      });

      if (successCount > 0) {
        notifications.success(`Successfully synced ${successCount} account${successCount > 1 ? 's' : ''}`);
        await fetchPosts();
      }
      
      if (errorCount > 0) {
        notifications.error(`Failed to sync ${errorCount} account${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error("Error syncing posts:", error);
      notifications.error("Failed to sync posts");
    } finally {
      setSyncing(false);
    }
  };

  // Conversations functions
  const fetchConversations = async () => {
    try {
      setConversationLoading(true);
      
      // Get conversation memory data and group by conversation_id
      const { data: memoryData, error } = await supabase
        .from("user_conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by conversation_id and create conversation objects
      const conversationMap = new Map();
      
      memoryData?.forEach((memory) => {
        const convId = memory.conversation_id;
        if (!conversationMap.has(convId)) {
          conversationMap.set(convId, {
            id: convId,
            post_id: memory.post_id || 'unknown',
            user_id: memory.user_id,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
            message_count: 1,
            last_message: memory.content.substring(0, 100),
            status: 'active' as const,
            platform: 'facebook' as const,
            messages: [memory]
          });
        } else {
          const conv = conversationMap.get(convId);
          conv.message_count++;
          conv.updated_at = memory.updated_at > conv.updated_at ? memory.updated_at : conv.updated_at;
          conv.last_message = memory.content.substring(0, 100);
          conv.messages.push(memory);
        }
      });

      const conversationList = Array.from(conversationMap.values());
      
      // Apply status filter
      const filteredConversations = statusFilter === "all" 
        ? conversationList 
        : conversationList.filter(conv => conv.status === statusFilter);

      setConversations(filteredConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      notifications.error("Failed to load conversations", {
        title: "Error",
      });
    } finally {
      setConversationLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_conversations")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data?.map(memory => ({
        id: memory.id,
        conversation_id: memory.conversation_id,
        content: memory.content,
        message_type: memory.message_type as 'user' | 'assistant',
        created_at: memory.created_at,
        tools_used: memory.tools_used
      })) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      notifications.error("Failed to load messages", {
        title: "Error",
      });
    }
  };

  const updateConversationStatus = async (conversationId: string, status: 'active' | 'archived' | 'flagged') => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, status } : conv
      )
    );

    notifications.success(`Conversation marked as ${status}`, {
      title: "Status Updated",
    });
  };

  // Filter functions
  const filteredPosts = posts.filter(post => {
    // Platform filter
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
    
    // Search filter - check both content and comments
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const contentMatch = post.content.toLowerCase().includes(searchLower);
      const commentMatch = post.comments.some(comment => 
        comment.content.toLowerCase().includes(searchLower)
      );
      if (!contentMatch && !commentMatch) return false;
    }
    
    // Media filter
    if (mediaFilter === 'media_only' && (!post.media_url || post.media_url === 'text only')) return false;
    if (mediaFilter === 'text_only' && post.media_url && post.media_url !== 'text only') return false;
    
    // Date range filter
    if (dateRange.from || dateRange.to) {
      const postDate = new Date(post.created_at);
      if (dateRange.from && postDate < new Date(dateRange.from.setHours(0, 0, 0, 0))) return false;
      if (dateRange.to && postDate > new Date(dateRange.to.setHours(23, 59, 59, 999))) return false;
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most_comments':
        return b.comments.length - a.comments.length;
      case 'most_ai_replies':
        return b.comments.filter(c => c.role === 'ai_agent').length - a.comments.filter(c => c.role === 'ai_agent').length;
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const filteredConversations = conversations.filter(conv =>
    conv.last_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.post_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearFilters = () => {
    setSearchQuery("");
    setPlatformFilter('all');
    setSortBy('newest');
    setMediaFilter('all');
    setDateRange({ from: null, to: null });
  };

  // Pagination for posts
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedPosts,
    goToPage,
  } = usePagination({
    data: filteredPosts,
    itemsPerPage: 12,
  });

  // Lazy loading for conversations
  const {
    visibleData: visibleConversations,
    isLoading: conversationsLoadingMore,
    hasMore: hasMoreConversations,
    loadMore: loadMoreConversations,
    containerRef: conversationsRef,
  } = useLazyLoading({
    data: filteredConversations,
    initialItemsToShow: 20,
    itemsPerLoad: 20,
  });

  if (loading || !currentUser) {
    return (
      <div className="container mx-auto py-8">
        <LoadingSkeleton variant="post" count={8} />
      </div>
    );
  }

  return (
    <AppLayout user={currentUser} onLogout={handleLogout}>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Social Media Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your Facebook and Instagram posts and AI conversations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <ExportDialog data={filteredPosts} filename="social_media_posts">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </ExportDialog>
            <Button 
              onClick={syncAllPosts} 
              disabled={syncing}
              className="flex items-center gap-2"
              size="sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Posts
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts Library</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            {/* Filters */}
            <PostFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              platformFilter={platformFilter}
              onPlatformChange={setPlatformFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              mediaFilter={mediaFilter}
              onMediaFilterChange={setMediaFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onClearFilters={clearFilters}
            />

            {/* Posts Grid */}
            {filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {posts.length === 0 
                      ? "Sync your social media posts to get started" 
                      : "No posts match your current filters"
                    }
                  </p>
                  {posts.length === 0 ? (
                    <Button onClick={syncAllPosts} disabled={syncing}>
                      {syncing ? "Syncing..." : "Sync Posts"}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Posts Count and Pagination Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Showing {((currentPage - 1) * 12) + 1}-{Math.min(currentPage * 12, filteredPosts.length)} of {filteredPosts.length} posts
                  </span>
                  <span className="hidden sm:block">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                {/* Posts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {paginatedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px] lg:h-[800px]">
              {/* Conversations List */}
              <div className="lg:col-span-1">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Conversations
                    </CardTitle>
                    
                    {/* Search and Filter */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search conversations..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                      >
                        <option value="all">All Conversations</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                        <option value="flagged">Flagged</option>
                      </select>
                    </div>
                  </CardHeader>
                  
                   <CardContent className="p-0 flex-1">
                    <div ref={conversationsRef} className="space-y-2 max-h-[600px] overflow-y-auto">
                      {conversationLoading ? (
                        <LoadingSkeleton variant="conversation" count={5} />
                      ) : (
                        <>
                          {visibleConversations.map((conversation) => (
                            <div
                              key={conversation.id}
                              onClick={() => setSelectedConversation(conversation)}
                              className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                                selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <Badge variant={
                                  conversation.status === 'active' ? 'default' :
                                  conversation.status === 'archived' ? 'secondary' : 'destructive'
                                }>
                                  {conversation.status}
                                </Badge>
                                <Badge variant="outline">{conversation.platform}</Badge>
                              </div>
                              
                              <p className="text-sm text-foreground font-medium mb-1">
                                Post: {conversation.post_id.substring(0, 20)}...
                              </p>
                              
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {conversation.last_message}...
                              </p>
                              
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{conversation.message_count} messages</span>
                                <span>{new Date(conversation.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Loading More Indicator */}
                          {conversationsLoadingMore && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">Loading more...</span>
                            </div>
                          )}
                          
                          {/* Load More Button */}
                          {hasMoreConversations && !conversationsLoadingMore && (
                            <div className="p-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={loadMoreConversations}
                              >
                                Load More Conversations
                              </Button>
                            </div>
                          )}
                          
                          {visibleConversations.length === 0 && !conversationLoading && (
                            <div className="p-8 text-center text-muted-foreground">
                              No conversations found
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conversation Detail */}
              <div className="lg:col-span-2">
                {selectedConversation ? (
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Conversation Details</CardTitle>
                          <CardDescription>
                            Post: {selectedConversation.post_id} • {selectedConversation.message_count} messages
                          </CardDescription>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'archived')}
                          >
                            <Archive className="w-4 h-4 mr-1" />
                            Archive
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateConversationStatus(selectedConversation.id, 'flagged')}
                          >
                            <Filter className="w-4 h-4 mr-1" />
                            Flag
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${
                              message.message_type === 'assistant' ? 'justify-start' : 'justify-end'
                            }`}
                          >
                            <div className={`flex gap-3 max-w-[80%] ${
                              message.message_type === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                            }`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                message.message_type === 'assistant' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {message.message_type === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              </div>
                              
                              <div className={`p-3 rounded-lg ${
                                message.message_type === 'assistant'
                                  ? 'bg-muted text-foreground'
                                  : 'bg-primary text-primary-foreground'
                              }`}>
                                <p className="text-sm">{message.content}</p>
                                
                                {message.tools_used && message.tools_used.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {message.tools_used.map((tool, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {tool}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                                  <Clock className="w-3 h-3" />
                                  {new Date(message.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full">
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Select a conversation to view details</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default FacebookPosts;