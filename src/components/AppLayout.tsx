import React from 'react';
import { TopNavigation } from '@/components/TopNavigation';
import { SidebarProvider } from '@/components/ui/sidebar';
import { User } from '@/lib/types';
import { BRAND_NAME } from '@/lib/shared';
interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  sidebar?: React.ReactNode; // Optional sidebar
}
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  user,
  onLogout,
  sidebar
}) => {
  if (sidebar) {
    // Layout with sidebar
    return <div className="min-h-screen bg-background">
        {/* Top Navigation - Full Width, Fixed Position */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <TopNavigation user={user} onLogout={onLogout} />
        </div>
        
        {/* Content Area with Sidebar - Pushed down by nav height */}
        <div className="pt-16 flex min-h-screen">
          <SidebarProvider>
            <div className="flex w-full">
              {/* Sidebar */}
              <div className="flex-shrink-0">
                {sidebar}
              </div>
              
              <div className="flex-1 flex flex-col">
                <main className="flex-1">
                  {children}
                </main>

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
            </div>
          </SidebarProvider>
        </div>
      </div>;
  }

  // Layout without sidebar
  return <div className="min-h-screen bg-background">
      {/* Top Navigation - Full Width, Fixed Position */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TopNavigation user={user} onLogout={onLogout} />
      </div>
      
      {/* Content pushed down by nav height */}
      <div className="pt-16">
        <main className="min-h-screen">
          {children}
        </main>

        <footer className="border-t border-border bg-card/30">
          
        </footer>
      </div>
    </div>;
};