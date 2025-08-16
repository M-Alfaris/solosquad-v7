import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Building, Settings } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const pricingPlans = [
  {
    name: "Starter",
    price: "$9",
    period: "month",
    description: "Perfect for small businesses getting started",
    features: [
      "5,000 AI responses per month",
      "Basic analytics",
      "Email support",
      "Facebook & Instagram integration",
      "Basic AI prompts"
    ],
    icon: Zap,
    popular: false
  },
  {
    name: "Professional",
    price: "$29",
    period: "month", 
    description: "Ideal for growing businesses",
    features: [
      "25,000 AI responses per month",
      "Advanced analytics & insights",
      "Priority support",
      "Facebook & Instagram integration",
      "Custom AI prompts",
      "Webhook integrations",
      "Multi-page management"
    ],
    icon: Crown,
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom needs",
    features: [
      "Unlimited AI responses",
      "Advanced analytics & reporting",
      "Dedicated account manager",
      "All social platform integrations",
      "Custom AI training",
      "White-label solutions",
      "SLA guarantee",
      "Custom integrations"
    ],
    icon: Building,
    popular: false
  }
];

export default function Billing() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [creditsLimit, setCreditsLimit] = useState<number>(1000);

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
          const user = {
            id: profile.id,
            name: profile.display_name || session.user.email || '',
            email: session.user.email || '',
            fb_user_id: profile.fb_user_id || '',
            subscription_status: profile.subscription_status || 'trial',
            trial_end: profile.trial_end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: profile.stripe_customer_id
          };
          setCurrentUser(user);

          // Calculate trial days remaining
          if (user.subscription_status === 'trial' && user.trial_end) {
            const trialEnd = new Date(user.trial_end);
            const now = new Date();
            const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            setTrialDaysRemaining(daysLeft);
          }

          // Set credits based on subscription status
          setCreditsUsed(350); // This would come from actual usage data
          setCreditsLimit(user.subscription_status === 'trial' ? 1000 : 25000);

          // Fetch real subscription status
          await checkSubscriptionStatus();
        }
      }
    };
    getCurrentUser();
  }, []);

  const checkSubscriptionStatus = async () => {
    setIsLoadingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) {
        toast.error('Failed to open customer portal');
        return;
      }
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to access subscription management');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSubscribe = async (planName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planName }
      });

      if (error) {
        toast.error('Failed to create checkout session');
        return;
      }

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription process');
    }
  };

  const handleContactSales = () => {
    console.log("Contacting sales for enterprise plan");
    // TODO: Implement contact form or redirect
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout user={currentUser} onLogout={handleLogout}>
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your social media automation with AI-powered responses and analytics
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.name} 
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">/{plan.period}</span>}
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.name === "Enterprise" ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleContactSales}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary' : ''}`}
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.name)}
                    >
                      Get Started
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Current Plan Section */}
        <div className="mt-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">
                        {subscriptionData?.subscribed 
                          ? `${subscriptionData.subscription_status} Plan` 
                          : currentUser?.subscription_status === 'trial' ? 'Trial Plan' : 'Free Plan'}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {subscriptionData?.subscribed
                          ? `Active subscription until ${new Date(subscriptionData.subscription_end).toLocaleDateString()}`
                          : currentUser?.subscription_status === 'trial' 
                            ? `${trialDaysRemaining} days remaining • ${creditsLimit - creditsUsed} AI responses left`
                            : 'Limited features available'
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={subscriptionData?.subscribed ? "default" : "secondary"}>
                        {subscriptionData?.subscribed ? 'Active' : 'Trial'}
                      </Badge>
                      {subscriptionData?.subscribed && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleManageSubscription}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {/* Usage Bar */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        {currentUser?.subscription_status === 'trial' ? 'Trial Usage' : 'Monthly Usage'}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 mb-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{width: `${(creditsUsed / creditsLimit) * 100}%`}}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {creditsUsed.toLocaleString()} / {creditsLimit.toLocaleString()} responses used
                      </p>
                    </div>

                    {/* Trial-specific information */}
                    {currentUser?.subscription_status === 'trial' && (
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="h-4 w-4 text-warning" />
                          <span className="text-sm font-medium text-warning">Trial Period</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {trialDaysRemaining > 0 
                            ? `${trialDaysRemaining} days remaining in your free trial`
                            : 'Your trial has expired. Upgrade to continue using all features.'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What counts as an AI response?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Each automated reply generated by our AI system counts as one response. This includes comments, direct messages, and chat interactions.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards, PayPal, and bank transfers for enterprise plans.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, all new accounts start with a 14-day free trial that includes 1,000 AI responses.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}