import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FacebookAuth } from '@/components/FacebookAuth';
import { UserDashboard } from '@/components/UserDashboard';
import { AppLayout } from '@/components/AppLayout';
import { MemoryTest } from '@/components/MemoryTest';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { User } from '@/lib/types';

export default function FacebookApp() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is authenticated with Supabase
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[FacebookApp] User session found:', session.user.id);
        
        // Load user from unified profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile && !profileError) {
          console.log('[FacebookApp] Found user profile:', profile);
          setCurrentUser({
            id: profile.id,
            name: profile.display_name || profile.full_name || session.user.email || '',
            email: session.user.email || '',
            fb_user_id: profile.fb_user_id || '',
            subscription_status: profile.subscription_status || 'trial',
            trial_end: profile.trial_end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });
        } else {
          console.log('[FacebookApp] No user profile found');
        }
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = async (userData: { id: string; name: string; email: string }) => {
    console.log('[FacebookApp] Auth success callback:', userData);
    
    // Refresh user data from database after successful Facebook auth
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile && !error) {
        setCurrentUser({
          id: profile.id,
          name: profile.display_name || profile.full_name || userData.name,
          email: session.user.email || userData.email,
          fb_user_id: profile.fb_user_id || userData.id,
          subscription_status: profile.subscription_status || 'trial',
          trial_end: profile.trial_end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      } else {
        // Fallback to provided user data
        const user: User = {
          id: session.user.id,
          name: userData.name,
          email: userData.email,
          fb_user_id: userData.id,
          subscription_status: 'trial',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        };
        setCurrentUser(user);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    toast.success('Logged out successfully');
    navigate('/landing');
  };

  // Show user dashboard with Facebook connection options
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout user={currentUser} onLogout={handleLogout}>
      <div className="container mx-auto px-4 py-8">
        <div className="animate-slide-up">
          <UserDashboard user={currentUser} />
          {/* Facebook connection is now optional and shown in the dashboard */}
          <div className="mt-8">
            <FacebookAuth onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}