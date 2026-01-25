/**
 * Market Search Service
 * Handles search, filtering, and sorting of markets
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import type { ProcessedEvent } from '@/lib/polymarket-types';
import { marketDiscoveryService } from '@/lib/polymarket-api';
import type { SearchFilters } from '@/components/market-search';

export interface SearchResult {
  markets: ProcessedEvent[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
  suggestions?: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

/**
 * Search markets with comprehensive filtering and sorting
 * Implements Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export async function searchMarkets(
  filters: SearchFilters,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const startTime = Date.now();
  const { limit = 20, offset = 0, includeInactive = false } = options;

  try {
    let markets: ProcessedEvent[] = [];
    let totalCount = 0;

    // Determine search strategy based on filters
    if (filters.query && filters.query.trim().length > 0) {
      // Text search with API
      const searchResult = await performTextSearch(filters.query, {
        limit,
        offset,
        includeInactive: includeInactive || filters.showClosed,
      });
      markets = searchResult.markets;
      totalCount = searchResult.totalCount;
    } else {
      // Category-based filtering
      const categoryResult = await performCategorySearch(filters.category, {
        limit,
        offset,
        includeInactive: includeInactive || filters.showClosed,
      });
      markets = categoryResult.markets;
      totalCount = categoryResult.totalCount;
    }

    // Apply client-side filtering
    markets = applyClientSideFilters(markets, filters);

    // Apply sorting
    markets = applySorting(markets, filters.sortBy, filters.sortOrder);

    // Generate search suggestions if query is provided
    const suggestions = filters.query ? generateSearchSuggestions(filters.query, markets) : undefined;

    return {
      markets,
      totalCount,
      hasMore: markets.length === limit,
      searchTime: Date.now() - startTime,
      suggestions,
    };
  } catch (error) {
    console.error('Market search failed:', error);
    
    // Return empty result with error handling
    return {
      markets: [],
      totalCount: 0,
      hasMore: false,
      searchTime: Date.now() - startTime,
      suggestions: [],
    };
  }
}

/**
 * Perform text-based search using Polymarket API
 * Implements Requirements 8.1, 8.2
 */
async function performTextSearch(
  query: string,
  options: { limit: number; offset: number; includeInactive: boolean }
): Promise<{ markets: ProcessedEvent[]; totalCount: number }> {
  try {
    // Use Polymarket search API
    const response = await marketDiscoveryService.searchMarkets(query, {
      limit: options.limit,
      offset: options.offset,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Search API failed');
    }

    // Convert API response to ProcessedEvent format
    const markets = response.data.map(market => convertToProcessedEvent(market));
    
    return {
      markets,
      totalCount: markets.length, // API doesn't provide total count
    };
  } catch (error) {
    console.error('Text search failed:', error);
    return { markets: [], totalCount: 0 };
  }
}

/**
 * Perform category-based search
 * Implements Requirements 8.3, 8.4
 */
async function performCategorySearch(
  category: string,
  options: { limit: number; offset: number; includeInactive: boolean }
): Promise<{ markets: ProcessedEvent[]; totalCount: number }> {
  try {
    // Map category to API parameters
    const apiParams: any = {
      limit: options.limit,
      offset: options.offset,
      active: !options.includeInactive,
    };

    // Add category-specific filtering
    if (category !== 'all') {
      // Map category to tag ID (simplified mapping)
      const categoryTagMap: Record<string, number> = {
        politics: 2,
        sports: 3,
        crypto: 4,
        finance: 5,
      };
      
      if (categoryTagMap[category]) {
        apiParams.tagId = categoryTagMap[category];
      }
    }

    const response = await marketDiscoveryService.getEvents(apiParams);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Category search failed');
    }

    // Convert API response to ProcessedEvent format
    const markets = response.data.map(event => convertEventToProcessedEvent(event));
    
    return {
      markets,
      totalCount: markets.length,
    };
  } catch (error) {
    console.error('Category search failed:', error);
    return { markets: [], totalCount: 0 };
  }
}

/**
 * Apply client-side filters that can't be handled by the API
 * Implements Requirements 8.3, 8.4
 */
function applyClientSideFilters(markets: ProcessedEvent[], filters: SearchFilters): ProcessedEvent[] {
  return markets.filter(market => {
    // Filter by closed status
    if (!filters.showClosed && market.closed) {
      return false;
    }

    // Additional text filtering for better relevance
    if (filters.query && filters.query.trim().length > 0) {
      const query = filters.query.toLowerCase();
      const searchableText = [
        market.title,
        market.description,
        ...market.tagLabels,
        ...market.outcomes.map(o => o.name),
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Apply sorting to markets
 * Implements Requirements 8.3, 8.5, 8.6
 */
function applySorting(
  markets: ProcessedEvent[],
  sortBy: SearchFilters['sortBy'],
  sortOrder: SearchFilters['sortOrder']
): ProcessedEvent[] {
  const sorted = [...markets].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'volume':
        comparison = a.volume - b.volume;
        break;
      
      case 'date':
        comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        break;
      
      case 'probability':
        // Sort by highest probability outcome
        const aMaxProb = Math.max(...a.outcomes.map(o => o.probability));
        const bMaxProb = Math.max(...b.outcomes.map(o => o.probability));
        comparison = aMaxProb - bMaxProb;
        break;
      
      case 'relevance':
        // For relevance, prioritize new markets, then volume
        if (a.isNew !== b.isNew) {
          comparison = a.isNew ? -1 : 1;
        } else {
          comparison = a.volume - b.volume;
        }
        break;
      
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Generate search suggestions based on query and results
 * Implements Requirements 8.2
 */
function generateSearchSuggestions(query: string, markets: ProcessedEvent[]): string[] {
  const suggestions = new Set<string>();
  const queryLower = query.toLowerCase();

  // Extract relevant terms from market titles and tags
  markets.forEach(market => {
    // Add matching tag labels
    market.tagLabels.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower) && tag.toLowerCase() !== queryLower) {
        suggestions.add(tag);
      }
    });

    // Add matching words from titles
    const titleWords = market.title.split(/\s+/);
    titleWords.forEach(word => {
      if (word.length > 3 && word.toLowerCase().includes(queryLower) && word.toLowerCase() !== queryLower) {
        suggestions.add(word);
      }
    });
  });

  // Add common market terms that match the query
  const commonTerms = [
    'Trump', 'Biden', 'Harris', 'Election', 'Politics', 'Bitcoin', 'Ethereum',
    'NFL', 'NBA', 'Premier League', 'World Cup', 'Olympics', 'Oscars',
    'Interest rates', 'Recession', 'Inflation', 'Stock market', 'AI',
    'Climate change', 'Ukraine', 'China', 'Fed', 'Supreme Court'
  ];

  commonTerms.forEach(term => {
    if (term.toLowerCase().includes(queryLower) && term.toLowerCase() !== queryLower) {
      suggestions.add(term);
    }
  });

  return Array.from(suggestions).slice(0, 5);
}

/**
 * Convert Polymarket API market to ProcessedEvent
 * Helper function for API response processing
 */
function convertToProcessedEvent(market: any): ProcessedEvent {
  // This is a simplified conversion - in a real implementation,
  // you would use the existing conversion logic from polymarket-data-processor.ts
  return {
    id: market.id,
    title: market.question || market.title,
    description: market.description || '',
    image: market.image || '',
    volume: parseFloat(market.volume || '0'),
    volumeFormatted: formatVolume(parseFloat(market.volume || '0')),
    isNew: market.new || false,
    active: market.active || false,
    closed: market.closed || false,
    marketType: 'simple',
    outcomes: parseOutcomes(market.outcomes, market.outcomePrices),
    tags: [],
    tagLabels: [],
    endDate: market.endDate,
    startDate: market.startDate,
    slug: market.slug,
    ticker: market.ticker || market.id,
  };
}

/**
 * Convert Polymarket API event to ProcessedEvent
 * Helper function for API response processing
 */
function convertEventToProcessedEvent(event: any): ProcessedEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    image: event.image || '',
    volume: event.volume || 0,
    volumeFormatted: formatVolume(event.volume || 0),
    isNew: event.new || false,
    active: event.active || false,
    closed: event.closed || false,
    marketType: event.markets?.length > 1 ? 'complex' : 'simple',
    outcomes: event.markets?.[0] ? parseOutcomes(event.markets[0].outcomes, event.markets[0].outcomePrices) : [],
    tags: event.tags?.map((t: any) => t.slug) || [],
    tagLabels: event.tags?.map((t: any) => t.label) || [],
    endDate: event.endDate,
    startDate: event.startDate,
    slug: event.slug,
    ticker: event.ticker,
  };
}

/**
 * Parse outcomes from API response
 */
function parseOutcomes(outcomes: string, prices: string): Array<{ name: string; probability: number; color: 'yes' | 'no' | 'neutral' }> {
  try {
    const outcomeNames = JSON.parse(outcomes || '[]');
    const outcomePrices = JSON.parse(prices || '[]');
    
    return outcomeNames.map((name: string, index: number) => ({
      name,
      probability: Math.round((parseFloat(outcomePrices[index]) || 0.5) * 100),
      color: index === 0 ? 'yes' as const : 'no' as const,
    }));
  } catch {
    return [
      { name: 'Yes', probability: 50, color: 'yes' as const },
      { name: 'No', probability: 50, color: 'no' as const },
    ];
  }
}

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  } else {
    return `$${volume.toFixed(0)}`;
  }
}

/**
 * Get search result highlights for a query
 * Implements Requirements 8.2
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || query.trim().length === 0) {
    return text;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
}

/**
 * Validate search filters
 * Implements Requirements 8.4
 */
export function validateSearchFilters(filters: Partial<SearchFilters>): SearchFilters {
  return {
    query: (filters.query || '').trim(),
    sortBy: ['volume', 'date', 'probability', 'relevance'].includes(filters.sortBy || '') 
      ? (filters.sortBy as SearchFilters['sortBy']) 
      : 'volume',
    sortOrder: ['asc', 'desc'].includes(filters.sortOrder || '') 
      ? (filters.sortOrder as SearchFilters['sortOrder']) 
      : 'desc',
    showClosed: Boolean(filters.showClosed),
    category: filters.category || 'all',
  };
}