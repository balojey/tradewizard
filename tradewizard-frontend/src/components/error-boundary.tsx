"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, Home, Search, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorType?: 'network' | 'trading' | 'rendering' | 'data' | 'unknown';
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void; errorType?: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string; // Component name for better error tracking
  maxRetries?: number;
  showRecoveryOptions?: boolean;
}

/**
 * Enhanced error boundary component for comprehensive error handling
 * Implements Requirements 11.1, 11.2, 11.3, 11.5, 11.6
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Classify error type based on error message and stack
    let errorType: ErrorBoundaryState['errorType'] = 'unknown';
    
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      errorType = 'network';
    } else if (error.message.includes('trading') || error.message.includes('order') || error.message.includes('wallet')) {
      errorType = 'trading';
    } else if (error.message.includes('render') || error.stack?.includes('render')) {
      errorType = 'rendering';
    } else if (error.message.includes('data') || error.message.includes('parse') || error.message.includes('JSON')) {
      errorType = 'data';
    }

    return { 
      hasError: true, 
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Enhanced error logging with context
    const errorContext = {
      component: this.props.name || 'Unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      retryCount: this.state.retryCount,
    };
    
    console.error('ErrorBoundary caught an error:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo,
      context: errorContext,
    });
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureException(error, {
        extra: { errorInfo, context: errorContext }
      });
    }
  }

  retry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for ${this.props.name || 'component'}`);
      return;
    }

    // Clear any existing timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    // Exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }, delay);
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error} 
            retry={this.retry}
            errorType={this.state.errorType}
          />
        );
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          retry={this.retry}
          errorType={this.state.errorType}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
          showRecoveryOptions={this.props.showRecoveryOptions}
          componentName={this.props.name}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Enhanced default error fallback component with recovery options
 * Implements Requirements 11.1, 11.2, 11.3, 11.5, 11.6
 */
function DefaultErrorFallback({ 
  error, 
  retry, 
  errorType, 
  retryCount, 
  maxRetries, 
  showRecoveryOptions = true,
  componentName 
}: { 
  error?: Error; 
  retry: () => void;
  errorType?: string;
  retryCount: number;
  maxRetries: number;
  showRecoveryOptions?: boolean;
  componentName?: string;
}) {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-12 w-12 text-red-500 mb-4" />;
      case 'trading':
        return <TrendingUp className="h-12 w-12 text-red-500 mb-4" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'network':
        return 'Connection Problem';
      case 'trading':
        return 'Trading Error';
      case 'data':
        return 'Data Loading Error';
      case 'rendering':
        return 'Display Error';
      default:
        return 'Something went wrong';
    }
  };

  const getErrorMessage = () => {
    const baseMessage = error?.message || 'An unexpected error occurred.';
    
    switch (errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'trading':
        return 'There was a problem processing your trading request. Please try again or contact support if the issue persists.';
      case 'data':
        return 'Failed to load market data. This might be a temporary issue with the data provider.';
      case 'rendering':
        return 'There was a problem displaying this content. Refreshing the page might help.';
      default:
        return baseMessage.length > 100 ? 'An unexpected error occurred while loading this content.' : baseMessage;
    }
  };

  const canRetry = retryCount < maxRetries;

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        {getErrorIcon()}
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          {getErrorTitle()}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4 max-w-md">
          {getErrorMessage()}
        </p>
        
        {/* Error details for development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-xs text-red-600 dark:text-red-400 max-w-md">
            <summary className="cursor-pointer mb-2">Technical Details</summary>
            <pre className="text-left bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-auto">
              {componentName && `Component: ${componentName}\n`}
              {error.name}: {error.message}
              {error.stack && `\n\nStack:\n${error.stack.slice(0, 500)}...`}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {canRetry && (
            <Button 
              onClick={retry}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </Button>
          )}
          
          {showRecoveryOptions && (
            <>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              
              <Link href="/">
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </>
          )}
        </div>

        {!canRetry && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            Maximum retry attempts reached. Please refresh the page or contact support.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Market-specific error fallback with enhanced recovery options
 * Implements Requirements 11.1, 11.2, 11.3
 */
export function MarketErrorFallback({ 
  error, 
  retry, 
  errorType,
  showFallbackData = false 
}: { 
  error?: Error; 
  retry: () => void;
  errorType?: string;
  showFallbackData?: boolean;
}) {
  const getErrorMessage = () => {
    switch (errorType) {
      case 'network':
        return 'Connection failed';
      case 'data':
        return 'Data unavailable';
      case 'trading':
        return 'Trading disabled';
      default:
        return 'Market unavailable';
    }
  };

  return (
    <Card className="h-full border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
        {errorType === 'network' ? (
          <WifiOff className="h-8 w-8 text-red-500 mb-3" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
        )}
        <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
          {getErrorMessage()}
        </h4>
        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
          {errorType === 'network' 
            ? 'Check your connection' 
            : 'Unable to load market data'
          }
        </p>
        
        {showFallbackData && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
            Showing cached data
          </div>
        )}
        
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
 * Trading-specific error fallback
 * Implements Requirements 11.1, 11.3, 11.5
 */
export function TradingErrorFallback({ 
  error, 
  retry, 
  onContactSupport 
}: { 
  error?: Error; 
  retry: () => void;
  onContactSupport?: () => void;
}) {
  const isCriticalError = error?.message.includes('wallet') || error?.message.includes('balance');

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <TrendingUp className="h-10 w-10 text-red-500 mb-4" />
        <h4 className="text-base font-medium text-red-900 dark:text-red-100 mb-2">
          Trading Temporarily Unavailable
        </h4>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          {isCriticalError 
            ? 'There was an issue with your wallet connection or balance.'
            : 'Unable to process trading requests at this time.'
          }
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={retry}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          {onContactSupport && (
            <Button 
              onClick={onContactSupport}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
            >
              Contact Support
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Network-specific error fallback with connection status
 * Implements Requirements 11.1, 11.4, 11.5
 */
export function NetworkErrorFallback({ 
  error, 
  retry, 
  isOnline = true 
}: { 
  error?: Error; 
  retry: () => void;
  isOnline?: boolean;
}) {
  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        {isOnline ? (
          <Wifi className="h-10 w-10 text-red-500 mb-4" />
        ) : (
          <WifiOff className="h-10 w-10 text-red-500 mb-4" />
        )}
        <h4 className="text-base font-medium text-red-900 dark:text-red-100 mb-2">
          {isOnline ? 'Server Connection Failed' : 'No Internet Connection'}
        </h4>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          {isOnline 
            ? 'Unable to reach the server. This might be a temporary issue.'
            : 'Please check your internet connection and try again.'
          }
        </p>
        
        <Button 
          onClick={retry}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
          disabled={!isOnline}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {isOnline ? 'Try Again' : 'Waiting for Connection...'}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for using error boundary in functional components with enhanced features
 * Implements Requirements 11.1, 11.5
 */
export function useErrorHandler() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    const errorContext = {
      timestamp: new Date().toISOString(),
      userAgent: window.navigator.userAgent,
      url: window.location.href,
      isOnline,
    };

    console.error('Error caught by useErrorHandler:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo,
      context: errorContext,
    });

    // Report to error tracking service (if available)
    if ((window as any).errorTracker) {
      (window as any).errorTracker.captureException(error, {
        extra: { errorInfo, context: errorContext }
      });
    }
  }, [isOnline]);

  return { handleError, isOnline };
}

/**
 * Hook for handling async operations with error boundaries
 * Implements Requirements 11.1, 11.2, 11.3
 */
export function useAsyncError() {
  const { handleError } = useErrorHandler();
  
  const throwError = React.useCallback((error: Error) => {
    handleError(error);
    throw error; // Re-throw to trigger error boundary
  }, [handleError]);

  return throwError;
}

/**
 * Higher-order component for wrapping components with error boundaries
 * Implements Requirements 11.1, 11.2, 11.5
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      name={Component.displayName || Component.name}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}