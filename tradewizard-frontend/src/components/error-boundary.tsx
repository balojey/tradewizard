"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error boundary component for graceful error handling
 * Implements Requirements 9.1, 9.2, 9.3
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Something went wrong
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-md">
          {error?.message || 'An unexpected error occurred while loading the market data.'}
        </p>
        <Button 
          onClick={retry}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Market-specific error fallback
 */
export function MarketErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <Card className="h-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
        <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
          Market Unavailable
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
          Unable to load market data
        </p>
        <Button 
          onClick={retry}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 text-xs px-3 py-1"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for using error boundary in functional components
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    // Could integrate with error reporting service here
  };
}