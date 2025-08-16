import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Bot, 
  User, 
  Calendar, 
  Heart, 
  Share, 
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  role: "user" | "ai_agent";
  updated_at: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  media_url?: string;
  platform?: string;
}

interface PostWithComments extends Post {
  comments: Comment[];
}

interface PostCardProps {
  post: PostWithComments;
}

const PostCard = ({ post }: PostCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  const getCommentCount = () => post.comments.length;
  const getAICommentCount = () => post.comments.filter(comment => comment.role === "ai_agent").length;
  const getUserCommentCount = () => post.comments.filter(comment => comment.role === "user").length;

  const hasMedia = post.media_url && post.media_url !== 'text only';
  const isVideo = hasMedia && (post.media_url!.includes('.mp4') || post.media_url!.includes('video'));

  const getTextPreview = () => {
    const maxLength = 120;
    if (post.content.length <= maxLength) return post.content;
    return post.content.substring(0, maxLength);
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg group cursor-pointer">
          <div className="aspect-square relative overflow-hidden bg-muted">
            {hasMedia ? (
              isVideo ? (
                <video 
                  className="w-full h-full object-cover"
                  src={post.media_url}
                />
              ) : (
                <img 
                  src={post.media_url} 
                  alt="Post media"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex flex-col justify-center p-4">
                <p className="text-sm text-foreground leading-relaxed">
                  {getTextPreview()}
                  {post.content.length > 120 && (
                    <span className="text-primary font-medium ml-1 hover:underline">
                      read more
                    </span>
                  )}
                </p>
              </div>
            )}
        
        {/* Platform Badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="secondary"
            className={`${
              post.platform === 'instagram' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0'
                : 'bg-primary text-primary-foreground border-0'
            }`}
          >
            {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}
          </Badge>
        </div>

        {/* Media Type Indicator */}
        {isVideo && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-background/80 text-foreground">
              Video
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Date and Time */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
          </div>
          <span>{format(new Date(post.created_at), "h:mm a")}</span>
        </div>

        {/* Post Content Preview */}
        <div className="space-y-2">
          <p className="text-sm text-foreground line-clamp-2">
            {post.content.length > 80 
              ? `${post.content.substring(0, 80)}...` 
              : post.content}
          </p>
        </div>

        {/* Engagement Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{getCommentCount()}</span>
              <span className="text-muted-foreground">comments</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">{getAICommentCount()}</span>
              <span className="text-muted-foreground">AI replies</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">-</span>
              <span className="text-muted-foreground">reactions</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Share className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">-</span>
              <span className="text-muted-foreground">shares</span>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Post Details</span>
            <Badge 
              variant="secondary"
              className={`${
                post.platform === 'instagram' 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0'
                  : 'bg-primary text-primary-foreground border-0'
              }`}
            >
              {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Post Metadata */}
          <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{getCommentCount()} comments</span>
              </div>
              <div className="flex items-center gap-1">
                <Bot className="h-4 w-4 text-primary" />
                <span>{getAICommentCount()} AI replies</span>
              </div>
            </div>
          </div>

          {/* Full Content */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">Post Content</h4>
            <p className="text-sm text-foreground leading-relaxed bg-muted p-4 rounded-md whitespace-pre-wrap">
              {post.content}
            </p>
          </div>

          {/* Media Section */}
          {hasMedia && (
            <div>
              <h4 className="font-semibold mb-3 text-foreground">Media</h4>
              <div className="bg-muted p-4 rounded-md flex justify-center">
                {isVideo ? (
                  <video 
                    controls 
                    className="max-w-full max-h-96 rounded-md"
                    src={post.media_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img 
                    src={post.media_url} 
                    alt="Post media" 
                    className="max-w-full max-h-96 rounded-md object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">
              Comments ({post.comments.length})
            </h4>
            {post.comments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {post.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-4 rounded-md border-l-4 ${
                      comment.role === "ai_agent"
                        ? "bg-primary/10 border-l-primary"
                        : "bg-muted border-l-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {comment.role === "ai_agent" ? (
                        <Bot className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">
                            {comment.role === "ai_agent" ? "AI Assistant" : "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted rounded-md">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No comments yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostCard;