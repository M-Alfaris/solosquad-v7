# Solosquad - AI Social Media Management Platform

A comprehensive AI-powered social media management platform that automatically handles Facebook and Instagram interactions, provides intelligent responses to comments and direct messages, and offers detailed analytics insights.

## 🎯 Project Goals

This platform aims to revolutionize social media management by:
- **Automating Customer Engagement**: Providing intelligent AI responses to comments and DMs across Facebook and Instagram
- **Advanced Intent Analysis**: Understanding user intentions and routing conversations to specialized AI agents
- **Contextual Intelligence**: Analyzing post content, media, and user behavior to provide relevant responses
- **Comprehensive Analytics**: Offering detailed insights into engagement metrics, response times, and user interactions
- **Scalable Architecture**: Supporting multiple social media accounts and high-volume interactions

## ✨ Key Features

### 🤖 AI-Powered Interactions
- **Smart Comment Replies**: Automatically responds to Facebook and Instagram comments with contextually relevant messages
- **Direct Message Handling**: Processes Facebook Messenger conversations with intelligent routing
- **Multi-Intent Detection**: Analyzes user messages to detect multiple intentions and routes to appropriate AI agents
- **Contextual Understanding**: Incorporates post content, media analysis, and user history for better responses

### 📊 Advanced Analytics
- **Real-time Dashboards**: Comprehensive analytics showing engagement metrics, response times, and user activity
- **User Memory Profiles**: Tracks user preferences, interaction patterns, and behavioral insights
- **Performance Metrics**: Monitors AI response quality, engagement rates, and conversion tracking
- **Trend Analysis**: Identifies patterns in user interactions and content performance

### 🔧 Management Tools
- **Prompt Configuration**: Customizable AI behavior with business-specific instructions and triggers
- **Content Synchronization**: Automatic syncing of Facebook and Instagram posts with metadata analysis
- **User Profile Management**: Centralized management of social media accounts and permissions
- **Role-based Access**: Differentiated access levels for followers, AI agents, and administrators

### 🎨 Modern Interface
- **Responsive Design**: Mobile-first design that works seamlessly across all devices
- **Dark/Light Mode**: User preference-based theming with consistent design tokens
- **Real-time Updates**: Live updates for new interactions and analytics data
- **Intuitive Navigation**: Clean, professional interface with easy-to-use controls

## 🎯 Use Cases

### For Business Owners
- **24/7 Customer Support**: Automatically handle customer inquiries outside business hours
- **Lead Generation**: Capture and qualify leads through intelligent conversation flows
- **Brand Consistency**: Maintain consistent brand voice across all social media interactions
- **Scalable Growth**: Handle increased social media volume without proportional staff increases

### For Content Creators
- **Audience Engagement**: Maintain high engagement rates with timely, relevant responses
- **Community Building**: Foster stronger relationships through personalized interactions
- **Content Insights**: Understand what content resonates most with your audience
- **Time Management**: Free up time for content creation while maintaining audience connection

### For Marketing Agencies
- **Multi-Client Management**: Handle multiple client accounts from a single platform
- **Performance Reporting**: Provide detailed analytics and ROI metrics to clients
- **Automated Workflows**: Streamline social media management processes
- **Competitive Analysis**: Track engagement patterns and optimize strategies

## 🛠 Technical Architecture

### Frontend Stack
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety and enhanced developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **shadcn/ui**: High-quality, accessible UI components
- **React Router**: Client-side routing with protected routes
- **TanStack Query**: Efficient data fetching and caching

### Backend Infrastructure
- **Supabase**: Backend-as-a-Service with PostgreSQL database
- **Edge Functions**: Serverless functions for AI processing and external API integrations
- **Row Level Security**: Database-level security policies for multi-tenant architecture
- **Real-time Subscriptions**: Live updates for chat sessions and analytics

### AI & External Integrations
- **OpenAI GPT-4**: Advanced language model for intelligent responses
- **Facebook Graph API**: Complete integration with Facebook and Instagram
- **Pinecone**: Vector database for semantic search and context retrieval
- **Intent Analysis**: Custom ML models for understanding user intentions
- **Media Analysis**: Automated analysis of images and videos for context

### Database Schema
```sql
-- Core Tables
- profiles: User authentication and social media account management
- posts: Facebook/Instagram posts with media analysis
- comments: User interactions with role-based classification
- chat_sessions: Conversation tracking and management
- user_memory_profile: User preference and behavior tracking
- prompt_configurations: AI behavior customization
- detected_intents: Intent analysis results and routing
```

### Security Features
- **JWT Authentication**: Secure user authentication with Supabase Auth
- **Row Level Security**: Database-level access controls
- **API Rate Limiting**: Protection against API abuse
- **Data Encryption**: Sensitive data encrypted at rest and in transit
- **Role-based Permissions**: Granular access control for different user types

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Facebook Developer account with app permissions
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database setup**
```bash
# Run Supabase migrations
npx supabase db reset
```

5. **Start development server**
```bash
npm run dev
```

### Configuration

1. **Facebook/Instagram Setup**
   - Create Facebook App in Meta Developers Console
   - Configure webhook endpoints
   - Set up page access tokens
   - Configure Instagram Business Account

2. **AI Configuration**
   - Add OpenAI API key to Supabase secrets
   - Configure prompt templates
   - Set up intent analysis rules

3. **Supabase Setup**
   - Configure authentication providers
   - Set up row-level security policies
   - Deploy edge functions

## 📈 Analytics & Monitoring

The platform provides comprehensive analytics including:
- **Response Time Metrics**: Average time between user message and AI response
- **Engagement Rates**: Comment reply rates, message response rates
- **User Behavior**: Interaction patterns, preference analysis
- **Content Performance**: Post engagement metrics, media analysis results
- **AI Performance**: Response quality metrics, intent detection accuracy

## 🔄 API Documentation

### Webhook Endpoints
- `POST /facebook-webhook`: Handles Facebook/Instagram webhooks
- `POST /process-ai-message`: Processes AI message generation
- `POST /intent-analysis`: Analyzes user intent from messages
- `POST /merge-agent`: Handles multi-intent conversation routing

### Data Synchronization
- `POST /fetch-facebook-data`: Syncs Facebook posts and comments
- `POST /fetch-instagram-data`: Syncs Instagram posts and comments
- `POST /analyze-user-context`: Updates user behavior profiles

## 📋 Changelog

### Version 2.1.0 (Latest - January 2025)
- ✅ **UI/UX Improvements**: Enhanced Analytics page with skeleton loaders for better perceived performance
- ✅ **Empty State Redesign**: Beautiful empty state components across all sections with actionable guidance
- ✅ **Auto-refresh Analytics**: Real-time data refresh with visual indicators and "Last updated" timestamps
- ✅ **Mobile Navigation**: Added responsive burger menu with slide-out navigation for mobile devices
- ✅ **Database Optimization**: Unified conversation memory and user profile tables with proper UUID references
- ✅ **Admin Command Fix**: Improved AI trigger logic for admin commands with more permissive keyword detection
- ✅ **Better Error Handling**: Enhanced error states and user feedback throughout the application

### Version 2.0.0
- ✅ **Enhanced Role System**: Differentiated follower, AI agent, and admin roles
- ✅ **Advanced Intent Analysis**: Multi-intent detection with specialized routing
- ✅ **User Memory Profiles**: Comprehensive user behavior tracking
- ✅ **Contextual AI Responses**: Media analysis integration for better context
- ✅ **Real-time Analytics**: Live dashboard updates and metrics
- ✅ **Channel Differentiation**: Separate handling for DMs vs comments

### Version 1.5.0
- ✅ **Instagram Integration**: Full Instagram Business Account support
- ✅ **Media Analysis**: Automated image and video content analysis
- ✅ **Prompt Management**: Configurable AI behavior and triggers
- ✅ **Performance Optimization**: Improved response times and caching

### Version 1.0.0
- ✅ **Facebook Integration**: Core Facebook Page and Messenger support
- ✅ **Basic AI Responses**: OpenAI-powered comment replies
- ✅ **User Dashboard**: Analytics and account management
- ✅ **Authentication**: Secure user authentication and authorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- **Documentation**: [Lovable Docs](https://docs.lovable.dev/)
- **Community**: [Discord Server](https://discord.com/channels/1119885301872070706/1280461670979993613)
- **Project URL**: https://lovable.dev/projects/f6bb1585-7bea-4692-9d11-8a9f557f311a

## 🚀 Deployment

### Lovable Platform (Recommended)
1. Open your [Lovable Project](https://lovable.dev/projects/f6bb1585-7bea-4692-9d11-8a9f557f311a)
2. Click **Share** → **Publish**
3. Configure custom domain in **Project** → **Settings** → **Domains**

### Manual Deployment
```bash
# Build the project
npm run build

# Deploy to your preferred hosting platform
# (Vercel, Netlify, AWS, etc.)
```

---

Built with ❤️ using [Lovable](https://lovable.dev)
