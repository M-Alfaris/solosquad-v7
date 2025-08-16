// User Management Types
export interface User {
  id: string;
  name: string;
  email: string;
  fb_user_id?: string;
  subscription_status: string;
  trial_end: string;
  credits_used?: number;
  credits_limit?: number;
}

// Page Management Types
export interface Page {
  id: string;
  fb_page_id: string;
  name: string;
  category?: string;
  is_active: boolean;
}

// Instagram Management Types
export interface InstagramAccount {
  id: string;
  name: string;
  username: string;
  is_active: boolean;
}

// Facebook Management Types
export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
}

// Subscription Management Types
export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  isSubscribed: boolean;
  trialEnd: string;
  subscriptionStatus: string;
  daysLeft: number;
}

// Content Management Types
export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  message_type: 'user' | 'assistant';
  created_at: string;
  tools_used?: string[];
}

export interface Comment {
  id: string;
  content: string;
  role: "follower" | "ai_agent" | "admin";
  created_at: string;
  post_id?: string;
  parent_comment_id?: string;
}