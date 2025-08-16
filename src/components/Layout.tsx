import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, Crown, Clock } from 'lucide-react';
import { User } from '@/lib/types';
import { BRAND_NAME } from '@/lib/shared';

interface LayoutProps {
  children: React.ReactNode;
  user?: User | null;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const getSubscriptionBadge = () => {
    if (!user) return null;
    
    const isActive = user.subscription_status === 'active';
    const isTrial = user.subscription_status === 'trial';
    
    return (
      <Badge 
        variant={isActive ? "default" : isTrial ? "secondary" : "destructive"}
        className="ml-2"
      >
        {isActive && <Crown className="h-3 w-3 mr-1" />}
        {isTrial && <Clock className="h-3 w-3 mr-1" />}
        {isActive ? 'Pro' : isTrial ? 'Trial' : 'Expired'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {user && (
        <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">AI</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {BRAND_NAME}
                    </h1>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground">
                        Connected as {user.name}
                      </span>
                      {getSubscriptionBadge()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={onLogout}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Powered by</span>
              <span className="font-semibold bg-gradient-primary bg-clip-text text-transparent">
                AI Technology
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>© 2024 {BRAND_NAME}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};