"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useMagic } from '@/lib/magic';
import { LoginModal } from './login-modal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isLoggedIn, loading } = useMagic();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!loading && requireAuth && !isLoggedIn) {
      setShowLoginModal(true);
    }
  }, [loading, requireAuth, isLoggedIn]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !isLoggedIn) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md mx-auto px-4">
              <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">
                You need to be signed in to access this page. Please log in to continue.
              </p>
            </div>
          </div>
        )}
        
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          mode="login"
        />
      </>
    );
  }

  // User is authenticated or authentication is not required
  return <>{children}</>;
}