"use client";

import { useState, useEffect } from "react";
import { MarketCard } from "@/components/market-card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessedEvent } from "@/lib/polymarket-types";
import type { SearchFilters } from "@/components/market-search";
import { searchMarkets, highlightSearchTerms, type SearchResult } from "@/lib/services/market-search";

interface MarketSearchResultsProps {
  filters: SearchFilters;
  className?: string;
  onResultsChange?: (count: number) => void;
  showLoadMore?: boolean;
  pageSize?: number;
}

/**
 * Market Search Results Component
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function MarketSearchResults({
  filters,
  className,
  onResultsChange,
  showLoadMore = true,
  pageSize = 20,
}: MarketSearchResultsProps) {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Perform search when filters change
  useEffect(() => {
    performSearch(true);
  }, [filters]);

  // Notify parent of results count change
  useEffect(() => {
    if (searchResult && onResultsChange) {
      onResultsChange(searchResult.totalCount);
    }
  }, [searchResult, onResultsChange]);

  const performSearch = async (resetPage = false) => {
    if (resetPage) {
      setCurrentPage(0);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);

    try {
      const page = resetPage ? 0 : currentPage + 1;
      const result = await searchMarkets(filters, {
        limit: pageSize,
        offset: page * pageSize,
        includeInactive: filters.showClosed,
      });

      if (resetPage) {
        setSearchResult(result);
        setCurrentPage(0);
      } else {
        // Append results for load more
        setSearchResult(prev => prev ? {
          ...result,
          markets: [...prev.markets, ...result.markets],
          totalCount: Math.max(prev.totalCount, result.totalCount),
        } : result);
        setCurrentPage(page);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && searchResult?.hasMore) {
      performSearch(false);
    }
  };

  const handleRetry = () => {
    performSearch(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <SearchLoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Search Error</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          {error}
        </p>
        <Button onClick={handleRetry} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // No results state
  if (searchResult && searchResult.markets.length === 0) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Markets Found</h3>
        <div className="text-muted-foreground mb-4 max-w-md mx-auto space-y-2">
          {filters.query ? (
            <>
              <p>No markets found for "{filters.query}"</p>
              <div className="text-sm">
                <p>Try:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Checking your spelling</li>
                  <li>Using different keywords</li>
                  <li>Removing filters</li>
                  <li>Searching for broader terms</li>
                </ul>
              </div>
            </>
          ) : (
            <p>No markets found in this category.</p>
          )}
        </div>
        {searchResult.suggestions && searchResult.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try searching for:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {searchResult.suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // This would need to be connected to the parent search component
                    // For now, we'll just show the suggestions
                  }}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results display
  return (
    <div className={cn("space-y-6", className)}>
      {/* Results Summary */}
      {searchResult && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              {searchResult.totalCount.toLocaleString()} market{searchResult.totalCount !== 1 ? 's' : ''} found
            </span>
            {filters.query && (
              <span>
                for "{filters.query}"
              </span>
            )}
            <span className="text-xs">
              ({searchResult.searchTime}ms)
            </span>
          </div>
          
          {/* Sort indicator */}
          <div className="text-xs">
            Sorted by {filters.sortBy} ({filters.sortOrder === 'asc' ? 'ascending' : 'descending'})
          </div>
        </div>
      )}

      {/* Market Grid */}
      <div 
        className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        role="grid"
        aria-label="Search results"
      >
        {searchResult?.markets.map((market) => (
          <div key={market.id} role="gridcell">
            <MarketCard
              id={market.id}
              title={highlightSearchQuery(market.title, filters.query)}
              image={market.image}
              volume={market.volumeFormatted}
              isNew={market.isNew}
              featured={false} // Search results don't show featured status
              trending={market.volume > 100000}
              outcomes={market.outcomes.map(outcome => ({
                ...outcome,
                color: outcome.color || 'neutral' as const
              }))}
              endDate={market.endDate}
              enableRealTimeUpdates={true}
              showAIInsights={false}
            />
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && searchResult?.hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              <>
                Load More Markets
                <span className="text-xs text-muted-foreground ml-1">
                  ({searchResult.markets.length} of {searchResult.totalCount})
                </span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Highlight search query in text
 * Implements Requirements 8.2
 */
function highlightSearchQuery(text: string, query: string): string {
  if (!query || query.trim().length === 0) {
    return text;
  }

  // Create a safe regex pattern
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">$1</mark>');
}

/**
 * Loading skeleton for search results
 */
function SearchLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Results summary skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 bg-muted-foreground/20 rounded w-32 animate-pulse" />
        <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse" />
      </div>

      {/* Market grid skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg overflow-hidden">
              {/* Image skeleton */}
              <div className="aspect-[1.91/1] bg-muted-foreground/10" />
              {/* Content skeleton */}
              <div className="p-3 sm:p-4 space-y-3">
                {/* Title skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
                </div>
                {/* Outcomes skeleton */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-8" />
                  </div>
                  <div className="h-2 bg-muted-foreground/10 rounded" />
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted-foreground/20 rounded w-10" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-8" />
                  </div>
                  <div className="h-2 bg-muted-foreground/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}