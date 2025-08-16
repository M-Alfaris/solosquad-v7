import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftIcon, CheckCircleIcon, StarIcon, ZapIcon, RocketIcon, CrownIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Pricing() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for small businesses getting started",
      icon: <ZapIcon className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
      badge: null,
      features: [
        "Up to 3 social media accounts",
        "500 AI responses per month",
        "Basic analytics dashboard",
        "Email support",
        "Comment moderation",
        "Basic sentiment analysis"
      ]
    },
    {
      name: "Professional",
      price: "$79",
      period: "/month",
      description: "Ideal for growing businesses and agencies",
      icon: <RocketIcon className="w-6 h-6" />,
      color: "from-green-500 to-green-600",
      badge: { text: "Most Popular", color: "bg-green-500" },
      features: [
        "Up to 10 social media accounts",
        "2,000 AI responses per month",
        "Advanced analytics & insights",
        "Priority email & chat support",
        "Advanced content moderation",
        "Sentiment analysis & reporting",
        "Custom AI prompt configuration",
        "Multi-platform management",
        "Team collaboration (3 users)"
      ]
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "Comprehensive solution for large organizations",
      icon: <CrownIcon className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
      badge: { text: "Best Value", color: "bg-purple-500" },
      features: [
        "Unlimited social media accounts",
        "10,000 AI responses per month",
        "Premium analytics & AI insights",
        "24/7 phone & priority support",
        "Enterprise-grade security",
        "Advanced reputation management",
        "Custom AI model training",
        "API access & integrations",
        "Unlimited team members",
        "Dedicated account manager",
        "White-label options",
        "Custom reporting & dashboards"
      ]
    }
  ];

  const handleStartTrial = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link to="/landing">
            <Button variant="outline" className="mb-6">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
              🚀 Choose Your Perfect Plan
            </Badge>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Start with our free trial and scale as you grow. All plans include our core AI features and 24/7 monitoring.
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative bg-white/80 backdrop-blur hover:shadow-2xl transition-all duration-300 ${plan.badge ? 'ring-2 ring-green-200 scale-105' : ''}`}>
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badge.color} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                  {plan.badge.text}
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} text-white rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                <div className="flex items-end justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600 pb-1">{plan.period}</span>
                </div>
                <p className="text-slate-600 text-sm">{plan.description}</p>
              </CardHeader>

              <CardContent className="pt-0">
                <Button 
                  onClick={handleStartTrial}
                  className={`w-full mb-6 bg-gradient-to-r ${plan.color} text-white hover:opacity-90 transition-opacity`}
                  size="lg"
                >
                  Start Free Trial
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <Card className="mb-16 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-slate-900">All Plans Include</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Free Trial", desc: "14-day free trial for all plans", icon: <StarIcon className="w-5 h-5 text-yellow-500" /> },
                { title: "AI Monitoring", desc: "24/7 automated social media monitoring", icon: <ZapIcon className="w-5 h-5 text-blue-500" /> },
                { title: "Multi-Platform", desc: "Facebook, Instagram, WhatsApp support", icon: <RocketIcon className="w-5 h-5 text-green-500" /> },
                { title: "Security", desc: "Enterprise-grade data encryption", icon: <CrownIcon className="w-5 h-5 text-purple-500" /> }
              ].map((item, index) => (
                <div key={index} className="text-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    {item.icon}
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-16 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-slate-900">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Can I change plans anytime?</h4>
                <p className="text-slate-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">What happens during the free trial?</h4>
                <p className="text-slate-600 text-sm">You get full access to all features of your chosen plan for 14 days. No credit card required to start.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Is my data secure?</h4>
                <p className="text-slate-600 text-sm">Absolutely. We use enterprise-grade encryption and are GDPR & SOC 2 compliant. Your data is never shared with third parties.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Do you offer custom enterprise solutions?</h4>
                <p className="text-slate-600 text-sm">Yes, we offer custom solutions for large enterprises. Contact us to discuss your specific requirements.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="text-center p-8">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Social Media Management?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join hundreds of businesses already using Solosquad to scale their social media presence with AI-powered automation.
            </p>
            <Button 
              onClick={handleStartTrial}
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Start Your Free Trial Today
            </Button>
            <p className="text-blue-200 text-sm mt-3">No credit card required • 14-day free trial • Cancel anytime</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}