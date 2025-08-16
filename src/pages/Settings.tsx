import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, Database, Save, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    display_name: '',
    full_name: '',
    email: '',
    category: 'business' as 'business' | 'content_creator' | 'other'
  });
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    ai_response_frequency: 'normal',
    auto_sync: true,
    dark_mode: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileData) {
          setCurrentUser({
            id: profileData.id,
            name: profileData.display_name || session.user.email || '',
            email: session.user.email || '',
            fb_user_id: profileData.fb_user_id || '',
            subscription_status: profileData.subscription_status || 'trial',
            trial_end: profileData.trial_end
          });

          setProfile({
            display_name: profileData.display_name || '',
            full_name: profileData.full_name || '',
            email: session.user.email || '',
            category: profileData.category === 'Content Creator' ? 'content_creator' : 
                     profileData.category === 'Business' ? 'business' : 
                     profileData.category === 'Other' ? 'other' : 'business'
          });
        }
      }
      setIsLoading(false);
    };
    getCurrentUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const categoryMapping: Record<string, string> = {
        'business': 'business',
        'content_creator': 'content_creator', 
        'other': 'other'
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name,
          full_name: profile.full_name,
          category: (categoryMapping[profile.category] || 'business') as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      setCurrentUser({ ...currentUser, name: profile.display_name });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      toast.success('Database connection successful');
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Database connection failed');
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout user={currentUser} onLogout={handleLogout}>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed here. Contact support to update your email.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full p-2 border border-input rounded-md bg-background"
                  value={profile.category}
                  onChange={(e) => setProfile({ ...profile, category: e.target.value as 'business' | 'content_creator' | 'other' })}
                >
                  <option value="business">Business</option>
                  <option value="content_creator">Content Creator</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full md:w-auto"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control how you receive notifications and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, email_notifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications in your browser
                  </p>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, push_notifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync posts from social media platforms
                  </p>
                </div>
                <Switch
                  checked={preferences.auto_sync}
                  onCheckedChange={(checked) => 
                    setPreferences({ ...preferences, auto_sync: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AI Response Settings
              </CardTitle>
              <CardDescription>
                Configure your AI assistant behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai_frequency">Response Frequency</Label>
                <select
                  id="ai_frequency"
                  className="w-full p-2 border border-input rounded-md bg-background"
                  value={preferences.ai_response_frequency}
                  onChange={(e) => 
                    setPreferences({ ...preferences, ai_response_frequency: e.target.value })
                  }
                >
                  <option value="low">Low - Respond only to direct questions</option>
                  <option value="normal">Normal - Respond to relevant comments</option>
                  <option value="high">High - Respond to most interactions</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Check your account status and system health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <Badge variant={currentUser.subscription_status === 'trial' ? 'secondary' : 'default'}>
                    {currentUser.subscription_status?.toUpperCase() || 'TRIAL'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Account ID</Label>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {currentUser.id}
                  </code>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                className="w-full md:w-auto"
              >
                <Database className="h-4 w-4 mr-2" />
                Test Database Connection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}