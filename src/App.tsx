import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import Landing from "./pages/Landing";
import PromptManagement from "./pages/PromptManagement";
import FacebookPosts from "./pages/FacebookPosts";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FacebookApp from "./pages/FacebookApp";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Billing from "./pages/Billing";
import TermsOfUse from "./pages/TermsOfUse";
import UserDeletionPolicy from "./pages/UserDeletionPolicy";
import Pricing from "./pages/Pricing";
import Analytics from "./pages/Analytics";

import Footer from "./components/Footer";
import FacebookCallback from "./pages/FacebookCallback";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
};

// Layout wrapper component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const showFooter = location.pathname !== '/auth';
  
  return (
    <>
      {children}
      {showFooter && <Footer />}
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider defaultTheme="dark" storageKey="solosquad-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-use" element={<TermsOfUse />} />
                <Route path="/user-deletion-policy" element={<UserDeletionPolicy />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/facebook/callback" element={<FacebookCallback />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><FacebookApp /></ProtectedRoute>} />
                <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/prompt-management" element={<ProtectedRoute><PromptManagement /></ProtectedRoute>} />
                <Route path="/facebook-posts" element={<ProtectedRoute><FacebookPosts /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;