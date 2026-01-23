"use client";

import { Search, Vote, AlertCircle, Wifi, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Generic empty state component
 * Implements Requirements 9.3, 9.4
 */
export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <Card className={`border-dashed border-2 border-muted-foreground/20 bg-muted/10 ${className}`}>
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
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Empty state for when no political markets are found
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
    />
  );
}

/**
 * Empty state for when no markets match the selected tag filter
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
    />
  );
}

/**
 * Empty state for search results
 */
export function NoSearchResultsState({ query, onClearSearch }: { query: string; onClearSearch?: () => void }) {
  return (
    <EmptyState
      title="No Results Found"
      description={`No markets found matching "${query}". Try adjusting your search terms or browse all available markets.`}
      icon={<Search className="h-12 w-12" />}
      action={onClearSearch ? {
        label: "Clear Search",
        onClick: onClearSearch
      } : undefined}
    />
  );
}

/**
 * Empty state for network/API errors
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Connection Problem"
      description="Unable to load market data. Please check your internet connection and try again."
      icon={<Wifi className="h-12 w-12" />}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry
      } : undefined}
      className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
    />
  );
}

/**
 * Empty state for data parsing errors
 */
export function DataErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      title="Data Processing Error"
      description="There was an issue processing the market data. Our team has been notified and is working on a fix."
      icon={<AlertCircle className="h-12 w-12" />}
      action={onRetry ? {
        label: "Refresh",
        onClick: onRetry
      } : undefined}
      className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
    />
  );
}

/**
 * Loading state component
 */
export function LoadingState({ message = "Loading markets..." }: { message?: string }) {
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
 * Grid loading state with skeleton cards
 */
export function MarketGridLoadingState({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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