"use client";

import React from 'react';
import { Search, Vote, AlertCircle, Wifi, RefreshCw, Home, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { errorService } from '@/lib/error-service';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  severity?: 'info' | 'warning' | 'error';
}

/**
 * Enhanced generic empty state component with error handling
 * Implements Requirements 11.1, 11.2, 11.3, 11.5, 11.6
 */
export function EmptyState({ 
  title, 
  description, 
  icon, 
  action, 
  secondaryAction,
  className = "",
  severity = 'info'
}: EmptyStateProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20';
      default:
        return 'border-dashed border-2 border-muted-foreground/20 bg-muted/10';
    }
  };

  return (
    <Card className={`${getSeverityStyles()} ${className}`}>
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 text-muted-foreground">
          {icon || <Vote className="h-12 w-12" />}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {action && (
            <Button onClick={action.onClick} variant="outline">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="ghost" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced empty state for when no political markets are found
 * Implements Requirements 11.2, 11.5
 */
export function NoPoliticalMarketsState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="No Political Markets Found"
      description="There are currently no active political prediction markets available. This could be due to market conditions or temporary data issues."
      icon={<Vote className="h-12 w-12" />}
      action={onRetry ? {
        label: "Refresh Markets",
        onClick: onRetry
      } : undefined}
      secondaryAction={{
        label: "Browse All Categories",
        onClick: () => window.location.href = '/?tag=all'
      }}
    />
  );
}

/**
 * Enhanced empty state for when no markets match the selected tag filter
 * Implements Requirements 11.2, 11.5
 */
export function NoTagMarketsState({ tag, onClearFilter }: { tag: string; onClearFilter?: () => void }) {
  const displayTag = tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <EmptyState
      title={`No ${displayTag} Markets`}
      description={`There are currently no active markets in the ${displayTag} category. Try selecting a different category or check back later.`}
      icon={<Search className="h-12 w-12" />}
      action={onClearFilter ? {
        label: "Show All Politics",
        onClick: onClearFilter
      } : undefined}
      secondaryAction={{
        label: "Search Markets",
        onClick: () => window.location.href = '/search'
      }}
    />
  );
}

/**
 * Enhanced empty state for search results with suggestions
 * Implements Requirements 11.2, 11.5
 */
export function NoSearchResultsState({ 
  query, 
  onClearSearch,
  suggestions = []
}: { 
  query: string; 
  onClearSearch?: () => void;
  suggestions?: string[];
}) {
  return (
    <div className="space-y-4">
      <EmptyState
        title="No Results Found"
        description={`No markets found matching "${query}". Try adjusting your search terms or browse all available markets.`}
        icon={<Search className="h-12 w-12" />}
        action={onClearSearch ? {
          label: "Clear Search",
          onClick: onClearSearch
        } : undefined}
        secondaryAction={{
          label: "Browse All Markets",
          onClick: () => window.location.href = '/'
        }}
      />
      
      {suggestions.length > 0 && (
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10">
          <CardContent className="p-6">
            <h4 className="text-sm font-medium text-foreground mb-3">
              Try searching for:
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const searchParams = new URLSearchParams();
                    searchParams.set('q', suggestion);
                    window.location.href = `/search?${searchParams.toString()}`;
                  }}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Enhanced network error state with detailed recovery options
 * Implements Requirements 11.1, 11.4, 11.5, 11.6
 */
export function NetworkErrorState({ 
  onRetry, 
  isOnline = true,
  lastUpdated
}: { 
  onRetry?: () => void;
  isOnline?: boolean;
  lastUpdated?: Date;
}) {
  const handleRetry = () => {
    if (onRetry) {
      // Report the retry attempt
      errorService.reportNetworkError(
        new Error('User initiated retry after network error'),
        'retry_action',
        'GET'
      );
      onRetry();
    }
  };

  const getDescription = () => {
    if (!isOnline) {
      return 'You appear to be offline. Please check your internet connection and try again.';
    }
    
    if (lastUpdated) {
      const timeSince = Math.floor((Date.now() - lastUpdated.getTime()) / 1000 / 60);
      return `Unable to load fresh market data. Last updated ${timeSince} minutes ago. This might be a temporary server issue.`;
    }
    
    return 'Unable to load market data. Please check your internet connection and try again.';
  };

  return (
    <EmptyState
      title={isOnline ? "Connection Problem" : "You're Offline"}
      description={getDescription()}
      icon={isOnline ? <Wifi className="h-12 w-12" /> : <Wifi className="h-12 w-12 opacity-50" />}
      action={onRetry ? {
        label: isOnline ? "Try Again" : "Retry When Online",
        onClick: handleRetry
      } : undefined}
      secondaryAction={{
        label: "Check Status",
        onClick: () => window.open('https://status.polymarket.com', '_blank')
      }}
      severity="error"
    />
  );
}

/**
 * Enhanced data error state with technical details
 * Implements Requirements 11.1, 11.2, 11.3, 11.5
 */
export function DataErrorState({ 
  onRetry, 
  errorDetails,
  showTechnicalDetails = false
}: { 
  onRetry?: () => void;
  errorDetails?: string;
  showTechnicalDetails?: boolean;
}) {
  const handleRetry = () => {
    if (onRetry) {
      // Report the retry attempt
      errorService.reportDataError(
        new Error('User initiated retry after data error'),
        'market_data',
        { errorDetails }
      );
      onRetry();
    }
  };

  return (
    <div className="space-y-4">
      <EmptyState
        title="Data Processing Error"
        description="There was an issue processing the market data. Our team has been notified and is working on a fix."
        icon={<AlertCircle className="h-12 w-12" />}
        action={onRetry ? {
          label: "Refresh",
          onClick: handleRetry
        } : undefined}
        secondaryAction={{
          label: "Report Issue",
          onClick: () => {
            const subject = encodeURIComponent('Data Processing Error Report');
            const body = encodeURIComponent(`Error Details: ${errorDetails || 'Unknown error'}\nTimestamp: ${new Date().toISOString()}`);
            window.location.href = `mailto:support@tradewizard.com?subject=${subject}&body=${body}`;
          }
        }}
        severity="warning"
      />
      
      {showTechnicalDetails && errorDetails && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Technical Details
              </summary>
              <pre className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded overflow-auto">
                {errorDetails}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Trading error state with wallet-specific recovery
 * Implements Requirements 11.1, 11.3, 11.5
 */
export function TradingErrorState({ 
  onRetry, 
  onReconnectWallet,
  errorType = 'general'
}: { 
  onRetry?: () => void;
  onReconnectWallet?: () => void;
  errorType?: 'wallet' | 'balance' | 'network' | 'general';
}) {
  const getErrorContent = () => {
    switch (errorType) {
      case 'wallet':
        return {
          title: 'Wallet Connection Error',
          description: 'Unable to connect to your wallet. Please check your wallet extension and try reconnecting.',
          icon: <TrendingUp className="h-12 w-12" />,
        };
      case 'balance':
        return {
          title: 'Insufficient Balance',
          description: 'You don\'t have enough funds to complete this transaction. Please add funds to your wallet.',
          icon: <TrendingUp className="h-12 w-12" />,
        };
      case 'network':
        return {
          title: 'Network Error',
          description: 'Unable to connect to the blockchain network. Please check your network settings.',
          icon: <Wifi className="h-12 w-12" />,
        };
      default:
        return {
          title: 'Trading Error',
          description: 'There was an issue processing your trading request. Please try again.',
          icon: <TrendingUp className="h-12 w-12" />,
        };
    }
  };

  const { title, description, icon } = getErrorContent();

  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
      secondaryAction={onReconnectWallet ? {
        label: "Reconnect Wallet",
        onClick: onReconnectWallet
      } : {
        label: "Go to Dashboard",
        onClick: () => window.location.href = '/dashboard'
      }}
      severity="error"
    />
  );
}

/**
 * Enhanced loading state component with timeout handling
 * Implements Requirements 11.5, 11.6
 */
export function LoadingState({ 
  message = "Loading markets...",
  timeout = 30000,
  onTimeout
}: { 
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
}) {
  const [isTimedOut, setIsTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  if (isTimedOut) {
    return (
      <EmptyState
        title="Loading Taking Longer Than Expected"
        description="The request is taking longer than usual. This might be due to high server load or network issues."
        icon={<Clock className="h-12 w-12" />}
        action={{
          label: "Refresh Page",
          onClick: () => window.location.reload()
        }}
        secondaryAction={{
          label: "Go Home",
          onClick: () => window.location.href = '/'
        }}
        severity="warning"
      />
    );
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10">
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 text-muted-foreground animate-spin">
          <RefreshCw className="h-8 w-8" />
        </div>
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced grid loading state with skeleton cards and error handling
 * Implements Requirements 11.5, 11.6
 */
export function MarketGridLoadingState({ 
  count = 6,
  timeout = 30000,
  onTimeout
}: { 
  count?: number;
  timeout?: number;
  onTimeout?: () => void;
}) {
  const [isTimedOut, setIsTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  if (isTimedOut) {
    return (
      <NetworkErrorState 
        onRetry={() => window.location.reload()}
        isOnline={navigator.onLine}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="h-full animate-pulse">
          <div className="aspect-[1.91/1] w-full bg-muted" />
          <CardContent className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Maintenance mode state
 * Implements Requirements 11.1, 11.5
 */
export function MaintenanceState({ 
  estimatedDuration,
  onCheckStatus
}: { 
  estimatedDuration?: string;
  onCheckStatus?: () => void;
}) {
  return (
    <EmptyState
      title="Scheduled Maintenance"
      description={`TradeWizard is currently undergoing scheduled maintenance to improve your experience. ${estimatedDuration ? `Expected duration: ${estimatedDuration}` : 'We\'ll be back shortly.'}`}
      icon={<AlertCircle className="h-12 w-12" />}
      action={onCheckStatus ? {
        label: "Check Status",
        onClick: onCheckStatus
      } : undefined}
      secondaryAction={{
        label: "Get Updates",
        onClick: () => window.open('https://twitter.com/tradewizard', '_blank')
      }}
      severity="warning"
    />
  );
}