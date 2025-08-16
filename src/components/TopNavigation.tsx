import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Settings, Crown, Clock, BarChart3, MessageSquare, FileText, User as UserIcon, CreditCard, Menu } from 'lucide-react';
import { User as UserType } from '@/lib/types';
interface TopNavigationProps {
  user: UserType;
  onLogout: () => void;
}
const navigationItems = [{
  path: '/analytics',
  label: 'Analytics',
  icon: BarChart3
}, {
  path: '/facebook-posts',
  label: 'Posts',
  icon: MessageSquare
}, {
  path: '/prompt-management',
  label: 'Prompts',
  icon: FileText
}];
export const TopNavigation: React.FC<TopNavigationProps> = ({
  user,
  onLogout
}) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getSubscriptionBadge = () => {
    const isActive = user.subscription_status === 'active';
    const isTrial = user.subscription_status === 'trial';
    return <Badge variant={isActive ? "default" : isTrial ? "secondary" : "destructive"} className="ml-2">
        {isActive && <Crown className="h-3 w-3 mr-1" />}
        {isTrial && <Clock className="h-3 w-3 mr-1" />}
        {isActive ? 'Pro' : isTrial ? 'Trial' : 'Expired'}
      </Badge>;
  };
  return <header className="border-b border-border bg-card/50 backdrop-blur-lg z-40 w-full">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Solosquad
                </h1>
                
              </div>
            </Link>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return <Link key={item.path} to={item.path}>
                    <Button variant={isActive ? "secondary" : "ghost"} size="sm" className="gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>;
            })}
            </nav>
          </div>
          
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      {getSubscriptionBadge()}
                    </div>
                  </div>
                  
                  {/* Navigation Items */}
                  <nav className="flex flex-col gap-2">
                    {navigationItems.map(item => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                          <Button 
                            variant={isActive ? "secondary" : "ghost"} 
                            className="w-full justify-start gap-3 h-12"
                          >
                            <Icon className="h-5 w-5" />
                            {item.label}
                          </Button>
                        </Link>
                      );
                    })}
                  </nav>
                  
                  {/* User Actions */}
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                    <Button variant="ghost" className="justify-start gap-3 h-12">
                      <UserIcon className="h-5 w-5" />
                      Profile
                    </Button>
                    <Link to="/billing" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3 h-12">
                        <CreditCard className="h-5 w-5" />
                        Manage Plan
                      </Button>
                    </Link>
                    <Button variant="ghost" className="justify-start gap-3 h-12">
                      <Settings className="h-5 w-5" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12 text-destructive hover:text-destructive"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center gap-3">
            {getSubscriptionBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <UserIcon className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <Link to="/billing">
                  <DropdownMenuItem>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Plan
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>;
};