"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketSearch, type SearchFilters } from "@/components/market-search";
import { MarketSearchResults } from "@/components/market-search-results";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, TrendingUp, Calendar, Percent, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateSearchFilters } from "@/lib/services/market-search";

interface MarketSearchPageProps {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    order?: string;
    closed?: string;
    category?: string;
  }>;
}

/**
 * Market Search Page Component
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function MarketSearchPage({ searchParams }: MarketSearchPageProps) {
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [resolvedParams, setResolvedParams] = useState<{
    q?: string;
    sort?: string;
    order?: string;
    closed?: string;
    category?: string;
  }>({});
  const [resultsCount, setResultsCount] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Resolve search params
  useEffect(() => {
    searchParams.then(setResolvedParams);
  }, [searchParams]);

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<SearchFilters>(() => 
    validateSearchFilters({
      query: resolvedParams.q || '',
      sortBy: (resolvedParams.sort as SearchFilters['sortBy']) || 'volume',
      sortOrder: (resolvedParams.order as SearchFilters['sortOrder']) || 'desc',
      showClosed: resolvedParams.closed === 'true',
      category: resolvedParams.category || 'all',
    })
  );

  // Update filters when URL params change
  useEffect(() => {
    const newFilters = validateSearchFilters({
      query: resolvedParams.q || '',
      sortBy: (resolvedParams.sort as SearchFilters['sortBy']) || 'volume',
      sortOrder: (resolvedParams.order as SearchFilters['sortOrder']) || 'desc',
      showClosed: resolvedParams.closed === 'true',
      category: resolvedParams.category || 'all',
    });
    setFilters(newFilters);
  }, [resolvedParams]);

  // Handle filter changes from search component
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle results count change
  const handleResultsChange = useCallback((count: number) => {
    setResultsCount(count);
  }, []);

  // Navigate back to home
  const handleBackToHome = () => {
    router.push('/');
  };

  // Get page title based on search state
  const getPageTitle = () => {
    if (filters.query) {
      return `Search results for "${filters.query}"`;
    } else if (filters.category !== 'all') {
      return `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} Markets`;
    } else {
      return 'Search Markets';
    }
  };

  // Get page description
  const getPageDescription = () => {
    const parts = [];
    
    if (resultsCount > 0) {
      parts.push(`${resultsCount.toLocaleString()} market${resultsCount !== 1 ? 's' : ''} found`);
    }
    
    if (filters.sortBy !== 'volume') {
      parts.push(`sorted by ${filters.sortBy}`);
    }
    
    if (filters.showClosed) {
      parts.push('including closed markets');
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Find prediction markets with advanced search and filtering';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToHome}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Markets</span>
            </Button>
            
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getPageDescription()}
              </p>
            </div>

            {/* Mobile filter toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="space-y-6">
          {/* Search Interface */}
          <div className={cn(
            "space-y-4",
            showMobileFilters ? "block" : "hidden sm:block"
          )}>
            <MarketSearch
              onFiltersChange={handleFiltersChange}
              initialFilters={filters}
              placeholder="Search markets by title, description, or tags..."
              showAdvancedFilters={true}
              className="max-w-4xl"
            />
          </div>

          {/* Quick Sort Buttons (Mobile) */}
          <div className="sm:hidden flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'volume', label: 'Volume', icon: TrendingUp },
              { key: 'date', label: 'Date', icon: Calendar },
              { key: 'probability', label: 'Probability', icon: Percent },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={filters.sortBy === key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newOrder: SearchFilters['sortOrder'] = filters.sortBy === key && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                  const newFilters: SearchFilters = { ...filters, sortBy: key as SearchFilters['sortBy'], sortOrder: newOrder };
                  handleFiltersChange(newFilters);
                }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Icon className="h-3 w-3" />
                {label}
                {filters.sortBy === key && (
                  <span className="text-xs">
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Search Results */}
          <MarketSearchResults
            filters={filters}
            onResultsChange={handleResultsChange}
            showLoadMore={true}
            pageSize={20}
          />
        </div>
      </div>

      {/* Search Tips (when no query) */}
      {!filters.query && resultsCount === 0 && (
        <div className="container max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="p-8 bg-muted/30 rounded-lg border border-border/50">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Discover Markets
              </h3>
              <p className="text-muted-foreground mb-6">
                Use the search bar above to find specific markets, or browse by category using the filters.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Popular searches:</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Trump', 'Bitcoin', 'Election', 'NFL', 'AI', 'Fed'].map((term) => (
                      <Button
                        key={term}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFilters = { ...filters, query: term };
                          handleFiltersChange(newFilters);
                        }}
                        className="text-xs"
                      >
                        {term}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Pro tip:</strong> Use quotes for exact phrases, like "interest rates"</p>
                  <p><strong>Sort by:</strong> Volume (most traded), Date (ending soon), or Probability (most certain)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}