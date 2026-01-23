"use client";

import { ReactNode } from 'react';
import { useMagic } from '@/lib/magic';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback, 
  loadingFallback,
  requireAuth = false 
}: AuthGuardProps) {
  const { isLoggedIn, loading } = useMagic();

  if (loading) {
    return loadingFallback || null;
  }

  if (requireAuth && !isLoggedIn) {
    return fallback || null;
  }

  if (!requireAuth && isLoggedIn) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Convenience components
export function AuthenticatedOnly({ children, fallback, loadingFallback }: Omit<AuthGuardProps, 'requireAuth'>) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback} loadingFallback={loadingFallback}>
      {children}
    </AuthGuard>
  );
}

export function UnauthenticatedOnly({ children, fallback, loadingFallback }: Omit<AuthGuardProps, 'requireAuth'>) {
  return (
    <AuthGuard requireAuth={false} fallback={fallback} loadingFallback={loadingFallback}>
      {children}
    </AuthGuard>
  );
}