"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Filter, SortAsc, SortDesc, TrendingUp, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export interface SearchFilters {
  query: string;
  sortBy: 'volume' | 'date' | 'probability' | 'relevance';
  sortOrder: 'asc' | 'desc';
  showClosed: boolean;
  category: string;
}

interface MarketSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
  placeholder?: string;
  showAdvancedFilters?: boolean;
  className?: string;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  sortBy: 'volume',
  sortOrder: 'desc',
  showClosed: false,
  category: 'all',
};

const SORT_OPTIONS = [
  { value: 'volume', label: 'Volume', icon: TrendingUp, description: 'Sort by trading volume' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Sort by end date' },
  { value: 'probability', label: 'Probability', icon: Percent, description: 'Sort by outcome probability' },
  { value: 'relevance', label: 'Relevance', icon: Search, description: 'Sort by search relevance' },
] as const;

/**
 * Market Search Component
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export function MarketSearch({
  onFiltersChange,
  initialFilters = {},
  placeholder = "Search markets...",
  showAdvancedFilters = true,
  className,
}: MarketSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...initialFilters,
    query: searchParams.get('q') || initialFilters.query || '',
    sortBy: (searchParams.get('sort') as SearchFilters['sortBy']) || initialFilters.sortBy || 'volume',
    sortOrder: (searchParams.get('order') as SearchFilters['sortOrder']) || initialFilters.sortOrder || 'desc',
    showClosed: searchParams.get('closed') === 'true' || initialFilters.showClosed || false,
    category: searchParams.get('category') || initialFilters.category || 'all',
  }));

  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);

  // Debounced search to avoid excessive API calls
  const [debouncedQuery, setDebouncedQuery] = useState(filters.query);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.query]);

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: SearchFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update search params
    if (newFilters.query) {
      params.set('q', newFilters.query);
    } else {
      params.delete('q');
    }
    
    if (newFilters.sortBy !== 'volume') {
      params.set('sort', newFilters.sortBy);
    } else {
      params.delete('sort');
    }
    
    if (newFilters.sortOrder !== 'desc') {
      params.set('order', newFilters.sortOrder);
    } else {
      params.delete('order');
    }
    
    if (newFilters.showClosed) {
      params.set('closed', 'true');
    } else {
      params.delete('closed');
    }
    
    if (newFilters.category !== 'all') {
      params.set('category', newFilters.category);
    } else {
      params.delete('category');
    }
    
    // Update URL without causing navigation
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
    updateUrl(newFilters);
  }, [onFiltersChange, updateUrl]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, query: value };
    handleFiltersChange(newFilters);
    
    // Generate search suggestions (Requirements 8.2)
    if (value.length > 2) {
      generateSearchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };

  // Generate search suggestions based on common market terms
  const generateSearchSuggestions = (query: string) => {
    const commonTerms = [
      'Trump', 'Biden', 'Harris', 'Election', 'Politics', 'Bitcoin', 'Ethereum',
      'NFL', 'NBA', 'Premier League', 'World Cup', 'Olympics', 'Oscars',
      'Interest rates', 'Recession', 'Inflation', 'Stock market', 'AI',
      'Climate change', 'Ukraine', 'China', 'Fed', 'Supreme Court'
    ];
    
    const suggestions = commonTerms
      .filter(term => term.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
    
    setSearchSuggestions(suggestions);
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || searchSuggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedSuggestion(prev => 
          prev < searchSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedSuggestion(prev => 
          prev > 0 ? prev - 1 : searchSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedSuggestion >= 0) {
          handleSearchChange(searchSuggestions[highlightedSuggestion]);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedSuggestion(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSearchChange(suggestion);
    setShowSuggestions(false);
    setHighlightedSuggestion(-1);
  };

  // Clear search
  const clearSearch = () => {
    handleSearchChange('');
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  // Handle sort change
  const handleSortChange = (sortBy: SearchFilters['sortBy']) => {
    const newOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    handleFiltersChange({ ...filters, sortBy, sortOrder: newOrder });
  };

  // Get current sort option
  const currentSortOption = SORT_OPTIONS.find(option => option.value === filters.sortBy);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={placeholder}
            value={filters.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (filters.query.length > 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay hiding suggestions to allow clicks
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className="w-full pl-10 pr-20 py-3 text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            aria-label="Search markets"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            role="combobox"
          />
          
          {/* Clear button */}
          {filters.query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Filter toggle */}
          {showAdvancedFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0",
                showFilters && "bg-muted"
              )}
              aria-label="Toggle filters"
              aria-expanded={showFilters}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
            <ul role="listbox" aria-label="Search suggestions">
              {searchSuggestions.map((suggestion, index) => (
                <li key={suggestion} role="option" aria-selected={index === highlightedSuggestion}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors duration-150 flex items-center gap-2",
                      index === highlightedSuggestion && "bg-muted"
                    )}
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {suggestion.split(new RegExp(`(${filters.query})`, 'gi')).map((part, i) => (
                        <span
                          key={i}
                          className={part.toLowerCase() === filters.query.toLowerCase() ? 'font-semibold text-primary' : ''}
                        >
                          {part}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && showFilters && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-4">
          {/* Sort Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Sort by</label>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => {
                const isActive = filters.sortBy === option.value;
                const Icon = option.icon;
                const SortIcon = filters.sortOrder === 'asc' ? SortAsc : SortDesc;
                
                return (
                  <Button
                    key={option.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange(option.value)}
                    className="flex items-center gap-2"
                    title={option.description}
                  >
                    <Icon className="h-3 w-3" />
                    {option.label}
                    {isActive && <SortIcon className="h-3 w-3" />}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.showClosed}
                onChange={(e) => handleFiltersChange({ ...filters, showClosed: e.target.checked })}
                className="rounded border-input"
              />
              Show closed markets
            </label>
          </div>

          {/* Active Filters Summary */}
          {(filters.query || filters.sortBy !== 'volume' || filters.showClosed) && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFiltersChange(DEFAULT_FILTERS)}
                  className="text-xs h-6 px-2"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {filters.query && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                    Search: "{filters.query}"
                    <button onClick={() => handleSearchChange('')} className="hover:bg-primary/20 rounded">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.sortBy !== 'volume' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                    Sort: {currentSortOption?.label} ({filters.sortOrder})
                  </span>
                )}
                {filters.showClosed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">
                    Including closed
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}