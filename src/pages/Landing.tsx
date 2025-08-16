'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  MessageSquareIcon, 
  BarChart3Icon, 
  ShieldCheckIcon, 
  BrainCircuitIcon,
  UsersIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeIcon,
  CalendarIcon,
  TrendingUpIcon,
  EyeIcon,
  FilterIcon,
  LinkIcon,
  AlertTriangleIcon,
  HeartIcon,
  MessageCircleIcon,
  InstagramIcon,
  FacebookIcon,
  PlayIcon,
  MonitorIcon,
  PieChartIcon,
  ActivityIcon,
  ClockIcon,
  ZapIcon,
  SparklesIcon,
  RocketIcon,
  CrownIcon,
  ChevronDownIcon,
  MenuIcon,
  XIcon
} from 'lucide-react';

function Landing() {
  const [currentPage, setCurrentPage] = useState<'home' | 'learn-more'>('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartTrial = () => {
    navigate('/auth');
  };

  const handleLearnMore = () => {
    setCurrentPage('learn-more');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
  };

  if (currentPage === 'learn-more') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <Button 
            variant="outline" 
            onClick={handleBackToHome}
            className="mb-8 border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300"
          >
            ← Back to Home
          </Button>
          <Card className="bg-white border border-slate-200 shadow-xl">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BrainCircuitIcon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">Learn More About Solosquad</h1>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed lekton-regular">
                  Discover how our AI-powered platform transforms social media management for businesses of all sizes.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 lekton-bold">Platform Capabilities</h2>
                  <ul className="space-y-4">
                    {[
                      "Multi-platform social media management",
                      "AI-powered comment responses",
                      "Advanced sentiment analysis",
                      "Real-time engagement monitoring",
                      "Automated content moderation",
                      "Comprehensive analytics dashboard"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-slate-700 lekton-regular">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 lekton-bold">Why Choose Us</h2>
                  <ul className="space-y-4">
                    {[
                      "Built by ex-Meta AI experts",
                      "Enterprise-grade security",
                      "24/7 automated monitoring",
                      "Multi-language support",
                      "Scalable infrastructure",
                      "Dedicated customer success"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <SparklesIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-slate-700 lekton-regular">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-center mt-12">
                <Button 
                  size="lg"
                  onClick={handleStartTrial}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 lekton-bold"
                >
                  Start Your Free Trial
                  <RocketIcon className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <MessageSquareIcon className="w-8 h-8" />,
      title: "Intelligent Comment Management",
      description: "Automatically reply to comments with context-aware responses. Profile users and remember their interactions for personalized engagement.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <BarChart3Icon className="w-8 h-8" />,
      title: "Advanced Analytics & Insights",
      description: "Convert quantitative data to qualitative insights. Track sentiment, measure engagement, and generate comprehensive reports.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <ShieldCheckIcon className="w-8 h-8" />,
      title: "Content Moderation & Safety",
      description: "Automatically detect and remove spam, phishing, or violating comments. Create smart blocklists with reasoning.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: <BrainCircuitIcon className="w-8 h-8" />,
      title: "AI-Powered Intent Analysis",
      description: "Understand context of posts, reels, stories, and videos. Analyze user intent from comments and interactions.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <UsersIcon className="w-8 h-8" />,
      title: "Reputation Management",
      description: "Manage Google Reviews and other platforms automatically. Generate personalized marketing insights.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <LinkIcon className="w-8 h-8" />,
      title: "Seamless Integrations",
      description: "Connect via APIs to inventory, e-commerce, ticketing systems, and scheduling platforms.",
      color: "from-teal-500 to-teal-600"
    }
  ];

  const platforms = [
    { name: "Facebook Pages", icon: <FacebookIcon className="w-6 h-6" />, status: "Live", color: "text-blue-600" },
    { name: "Instagram Business", icon: <InstagramIcon className="w-6 h-6" />, status: "Live", color: "text-purple-600" },
    { name: "WhatsApp Business", icon: <MessageCircleIcon className="w-6 h-6" />, status: "Coming Soon", color: "text-green-600" },
    { name: "Telegram", icon: <MessageSquareIcon className="w-6 h-6" />, status: "Coming Soon", color: "text-blue-500" },
    { name: "Google Reviews", icon: <StarIcon className="w-6 h-6" />, status: "Beta", color: "text-yellow-600" }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: <ActivityIcon className="w-5 h-5" />, color: "text-green-600" },
    { value: "< 2s", label: "Response Time", icon: <ClockIcon className="w-5 h-5" />, color: "text-blue-600" },
    { value: "24/7", label: "AI Monitoring", icon: <EyeIcon className="w-5 h-5" />, color: "text-purple-600" },
    { value: "50+", label: "Languages", icon: <GlobeIcon className="w-5 h-5" />, color: "text-orange-600" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Marketing Director",
      company: "TechFlow Solutions",
      content: "Solosquad transformed our social media engagement. We're now responding to 10x more comments with personalized AI responses.",
      avatar: "SC"
    },
    {
      name: "Marcus Rodriguez",
      role: "Small Business Owner",
      company: "Local Cafe Chain",
      content: "The AI understands our brand voice perfectly. Our customers love the instant, helpful responses even outside business hours.",
      avatar: "MR"
    },
    {
      name: "Emily Watson",
      role: "Content Creator",
      company: "Fashion Influencer",
      content: "Managing comments across platforms was overwhelming. Now I can focus on creating while AI handles community engagement.",
      avatar: "EW"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg border-b border-slate-200' : 'bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg lekton-bold">S</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent lekton-bold">
                Solosquad
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Features</a>
              <a href="#platforms" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Platforms</a>
              <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Reviews</a>
              <Button variant="outline" onClick={() => navigate('/auth')} className="border-slate-300 text-slate-700 hover:bg-slate-50 lekton-regular">Sign In</Button>
              <Button onClick={handleStartTrial} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 lekton-bold">
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-200">
              <div className="flex flex-col gap-4 pt-4">
                <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Features</a>
                <a href="#platforms" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Platforms</a>
                <a href="#pricing" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Pricing</a>
                <a href="#testimonials" className="text-slate-600 hover:text-slate-900 transition-colors lekton-regular">Reviews</a>
                <Separator className="bg-slate-200" />
                <Button variant="outline" onClick={() => navigate('/auth')} className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 lekton-regular">Sign In</Button>
                <Button onClick={handleStartTrial} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white lekton-bold">
                  Start Free Trial
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium lekton-regular">
              🚀 7-Day Free Trial • No Credit Card Required
            </Badge>
            
            <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight lekton-bold">
              Meet{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Solosquad
              </span>
              <div className="mt-4">
                <Badge className="text-xl px-4 py-2 bg-green-500 text-white border-0 lekton-bold">
                  LIVE
                </Badge>
              </div>
            </h1>
            
            <p className="text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed lekton-regular">
              Transform your social media management with{' '}
              <span className="font-semibold text-blue-600 lekton-bold">AI-powered automation</span>.
              Start your <span className="font-semibold text-slate-900 lekton-bold">7-day free trial</span> today and experience 
              the future of customer engagement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 transition-all duration-300 rounded-xl lekton-bold hover:from-blue-700 hover:to-purple-700"
                onClick={handleStartTrial}
              >
                Get Started Free
                <RocketIcon className="w-5 h-5 ml-3" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-12 py-4 text-lg border-2 border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 rounded-xl lekton-regular"
                onClick={handleLearnMore}
              >
                Watch Demo
                <PlayIcon className="w-5 h-5 ml-3" />
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="lekton-regular">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="lekton-regular">Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="lekton-regular">Full access during trial</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center p-6 bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <div className={stat.color}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1 lekton-bold">{stat.value}</div>
                  <div className="text-sm text-slate-600 lekton-regular">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dashboard Preview */}
          <Card className="mb-20 overflow-hidden shadow-2xl border border-slate-200 bg-white">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-slate-300 font-medium lekton-regular">Solosquad Dashboard</span>
                </div>
                
                {/* Mock Dashboard Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <ActivityIcon className="w-5 h-5 text-green-400" />
                      </div>
                      <span className="text-slate-300 font-medium lekton-regular">Live Interactions</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2 lekton-bold">2,847</div>
                    <div className="text-sm text-green-400 lekton-regular">+23% from yesterday</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <HeartIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-slate-300 font-medium lekton-regular">Sentiment Score</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2 lekton-bold">94.2%</div>
                    <div className="text-sm text-blue-400 lekton-regular">Positive</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <ZapIcon className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-slate-300 font-medium lekton-regular">Auto Responses</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2 lekton-bold">1,293</div>
                    <div className="text-sm text-purple-400 lekton-regular">This hour</div>
                  </div>
                </div>

                {/* Mock Activity Feed */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <FacebookIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium lekton-regular">Auto-replied to customer inquiry about product availability</div>
                      <div className="text-slate-400 text-sm lekton-regular">2 minutes ago • Facebook Page</div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 lekton-regular">Resolved</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <InstagramIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium lekton-regular">Detected spam comment and added user to blocklist</div>
                      <div className="text-slate-400 text-sm lekton-regular">5 minutes ago • Instagram Post</div>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 lekton-regular">Blocked</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200 lekton-regular">
              Powerful Features
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Everything you need to scale your social presence
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto lekton-regular">
              Our AI-powered platform provides comprehensive tools for modern social media management
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-500 border border-slate-200 bg-white overflow-hidden">
                <CardContent className="p-8">
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 lekton-bold">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed lekton-regular">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section id="platforms" className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200 lekton-regular">
              Multi-Platform
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Connect all your social platforms
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto lekton-regular">
              Manage your entire social media presence from one unified dashboard
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
            {platforms.map((platform, index) => (
              <Card key={index} className="text-center p-8 hover:shadow-xl transition-all duration-300 group border border-slate-200 bg-white">
                <CardContent className="p-0">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <div className={platform.color}>
                      {platform.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 lekton-bold">{platform.name}</h3>
                  <Badge 
                    variant={platform.status === 'Live' ? 'default' : platform.status === 'Beta' ? 'secondary' : 'outline'}
                    className={`lekton-regular ${platform.status === 'Live' ? 'bg-green-500 text-white border-0' : platform.status === 'Beta' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'border-slate-300 text-slate-600'}`}
                  >
                    {platform.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 border-0 lekton-regular">
              <RocketIcon className="w-4 h-4 mr-2" />
              More platforms launching soon
            </Badge>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200 lekton-regular">
              Simple Process
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Get started in minutes, not hours
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto lekton-regular">
              Our streamlined onboarding process gets you up and running quickly
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection lines */}
            <div className="hidden md:block absolute top-12 left-1/8 right-1/8 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>
            
            {[
              { 
                step: "1", 
                title: "Sign Up", 
                desc: "Create your account in under 60 seconds",
                icon: <UsersIcon className="w-8 h-8" />,
                color: "from-blue-500 to-blue-600"
              },
              { 
                step: "2", 
                title: "Connect", 
                desc: "Link your social media accounts securely",
                icon: <LinkIcon className="w-8 h-8" />,
                color: "from-green-500 to-green-600"
              },
              { 
                step: "3", 
                title: "Configure", 
                desc: "Customize AI behavior and response style",
                icon: <BrainCircuitIcon className="w-8 h-8" />,
                color: "from-purple-500 to-purple-600"
              },
              { 
                step: "4", 
                title: "Launch", 
                desc: "Go live with intelligent automation",
                icon: <RocketIcon className="w-8 h-8" />,
                color: "from-orange-500 to-orange-600"
              }
            ].map((item, index) => (
              <div key={index} className="text-center relative z-10">
                <div className={`w-20 h-20 bg-gradient-to-br ${item.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300`}>
                  {item.icon}
                </div>
                <div className={`w-10 h-10 bg-gradient-to-br ${item.color} text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4 -mt-3 shadow-lg lekton-bold`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 lekton-bold">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed lekton-regular">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={handleStartTrial}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 lekton-bold hover:from-blue-700 hover:to-purple-700"
            >
              <ClockIcon className="w-5 h-5 mr-2" />
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-100 text-yellow-800 border-yellow-200 lekton-regular">
              Customer Stories
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Loved by businesses worldwide
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto lekton-regular">
              See how companies are transforming their social media engagement with Solosquad
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 hover:shadow-2xl transition-all duration-300 border border-slate-200 bg-white">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold lekton-bold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-slate-900 lekton-bold">{testimonial.name}</div>
                      <div className="text-sm text-slate-600 lekton-regular">{testimonial.role}</div>
                      <div className="text-sm text-blue-600 font-medium lekton-regular">{testimonial.company}</div>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed italic lekton-regular-italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex gap-1 mt-4">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-100 text-slate-800 border-slate-200 lekton-regular">
              Expert Team
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Built by industry veterans
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto lekton-regular">
              Our team combines deep AI expertise with real-world social media experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-0">
                <Avatar className="w-24 h-24 mx-auto mb-6">
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold lekton-bold">F</AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 lekton-bold">Founder & CEO</h3>
                <Badge className="mb-4 bg-blue-500 text-white px-4 py-1 border-0 lekton-regular">Ex-Meta Trust & Safety</Badge>
                <p className="text-slate-700 leading-relaxed lekton-regular">
                  Former Technical Project Manager at Meta's Trust & Safety, led global GenAI projects across markets. 
                  4+ years in violation detection. 19K Facebook, 21K TikTok, 6K Instagram, 4K LinkedIn followers.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border border-slate-200 bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-0">
                <Avatar className="w-24 h-24 mx-auto mb-6">
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-green-500 to-green-600 text-white font-bold lekton-bold">C</AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-bold text-slate-900 mb-2 lekton-bold">Co-founder & CTO</h3>
                <Badge className="mb-4 bg-green-500 text-white px-4 py-1 border-0 lekton-regular">Amazon Lambda Senior Manager</Badge>
                <p className="text-slate-700 leading-relaxed lekton-regular">
                  Senior Software Development Manager at Amazon Lambda, former CTO in Fintech. 
                  Extensive network of AI engineering and technical talent across the industry.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-100 text-indigo-800 border-indigo-200 lekton-regular">
              FAQ
            </Badge>
            <h2 className="text-5xl font-bold text-slate-900 mb-6 lekton-bold">
              Frequently asked questions
            </h2>
            <p className="text-xl text-slate-600 lekton-regular">
              Everything you need to know about Solosquad
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="bg-white rounded-xl border border-slate-200 shadow-lg">
              <AccordionTrigger className="px-8 py-6 text-left text-lg font-semibold text-slate-900 hover:no-underline lekton-bold">
                Does Solosquad replace human social media managers?
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-6 text-slate-600 leading-relaxed lekton-regular">
                No, Solosquad extends human productivity and efficiency beyond physical boundaries. It handles routine tasks, provides insights, and manages large-scale interactions so your team can focus on strategy and high-value activities.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2" className="bg-white rounded-xl border border-slate-200 shadow-lg">
              <AccordionTrigger className="px-8 py-6 text-left text-lg font-semibold text-slate-900 hover:no-underline lekton-bold">
                What platforms does Solosquad support?
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-6 text-slate-600 leading-relaxed lekton-regular">
                Currently supports Facebook Pages, Instagram Business accounts, Google Reviews, with expanding support for WhatsApp Business, Telegram, and other platforms. We regularly add new integrations based on user demand.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3" className="bg-white rounded-xl border border-slate-200 shadow-lg">
              <AccordionTrigger className="px-8 py-6 text-left text-lg font-semibold text-slate-900 hover:no-underline lekton-bold">
                How does the AI ensure brand consistency?
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-6 text-slate-600 leading-relaxed lekton-regular">
                Solosquad learns from your brand voice, previous interactions, and customizable prompts. You can edit the AI agent's behavior in settings to maintain your unique brand personality across all interactions.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4" className="bg-white rounded-xl border border-slate-200 shadow-lg">
              <AccordionTrigger className="px-8 py-6 text-left text-lg font-semibold text-slate-900 hover:no-underline lekton-bold">
                Is my data secure and compliant?
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-6 text-slate-600 leading-relaxed lekton-regular">
                Yes, Solosquad adheres to GDPR, SOC 2, and relevant ISO standards. We maintain enterprise-grade security and privacy policies, ensuring your business and customer data is protected.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5" className="bg-white rounded-xl border border-slate-200 shadow-lg">
              <AccordionTrigger className="px-8 py-6 text-left text-lg font-semibold text-slate-900 hover:no-underline lekton-bold">
                Can I customize the AI responses?
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-6 text-slate-600 leading-relaxed lekton-regular">
                Absolutely! You have full control over your AI's personality, response style, and behavior. Configure custom prompts, set response triggers, and train the AI to match your brand voice perfectly.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <RocketIcon className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-5xl font-bold mb-6 lekton-bold">
            Ready to transform your social media?
          </h2>
          <p className="text-2xl text-white/90 mb-12 font-light lekton-regular">
            Join thousands of businesses using AI to enhance their social presence and customer engagement.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50 px-12 py-4 text-lg font-semibold shadow-2xl rounded-xl transform hover:-translate-y-1 transition-all duration-300 lekton-bold"
              onClick={handleStartTrial}
            >
              Start 7-Day Free Trial
              <ArrowRightIcon className="w-5 h-5 ml-3" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-white/30 text-white hover:bg-white/10 px-12 py-4 text-lg rounded-xl backdrop-blur-sm transition-all duration-300 lekton-regular"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
              <CalendarIcon className="w-5 h-5 ml-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="lekton-regular">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="lekton-regular">Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="lekton-regular">Full access during trial</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;