/**
 * Application Integration Utilities
 * Centralizes the wiring of all components, real-time data flows, and navigation
 * Implements Requirements 1.1, 2.1, 4.1, 4.8, 4.9, 13.1, 13.6
 */

import { 
  ProcessedMarket, 
  ProcessedSeries, 
  isSeriesMarket,
  MarketEvent,
  SeriesInfo 
} from './enhanced-polymarket-types';
import { processMarket, processSeriesForDetail } from './polymarket-data-processor';
import type { PolymarketEvent, PolymarketMarket } from './polymarket-api-types';

// ============================================================================
// Series Detection and Processing
// ============================================================================

/**
 * Detect if an event should be treated as a series
 * Implements Requirements 13.1, 13.2
 */
export function detectSeriesFromEvent(event: PolymarketEvent): boolean {
  // Check if event has multiple markets with groupItemTitle
  const hasGroupedMarkets = event.markets.some(market => 
    market.groupItemTitle && market.groupItemTitle.trim() !== ''
  );

  // Check if event has series information in metadata
  const hasSeriesMetadata = event.markets.some(market => 
    market.groupItemTitle || market.groupItemThreshold
  );

  // Must have multiple markets to be considered a series
  const hasMultipleMarkets = event.markets.length > 1;

  return hasMultipleMarkets && (hasGroupedMarkets || hasSeriesMetadata);
}

/**
 * Process events into series and individual markets
 * Implements Requirements 13.1, 13.6
 */
export interface ProcessedEventData {
  series: ProcessedSeries[];
  individualMarkets: ProcessedMarket[];
  allMarkets: ProcessedMarket[];
}

export function processEventsWithSeriesDetection(events: PolymarketEvent[]): ProcessedEventData {
  const series: ProcessedSeries[] = [];
  const individualMarkets: ProcessedMarket[] = [];

  events.forEach(event => {
    if (detectSeriesFromEvent(event)) {
      // Process as series
      const processedSeries = processSeriesForDetail(event);
      series.push(processedSeries);
    } else {
      // Process as individual market(s)
      event.markets.forEach(market => {
        const processedMarket = processMarket(market, event);
        individualMarkets.push(processedMarket);
      });
    }
  });

  // Combine all markets for aggregate calculations
  const allMarkets = [
    ...individualMarkets,
    ...series.flatMap(s => s.markets)
  ];

  return {
    series,
    individualMarkets,
    allMarkets,
  };
}

// ============================================================================
// Navigation and Routing Integration
// ============================================================================

/**
 * Generate proper navigation URLs based on market/series type
 * Implements Requirements 4.8, 4.9
 */
export function generateNavigationUrl(
  item: ProcessedMarket | ProcessedSeries,
  type: 'market' | 'series'
): string {
  if (type === 'series') {
    return `/series/${item.slug}`;
  } else {
    const market = item as ProcessedMarket;
    // Check if this market is part of a series
    if (isSeriesMarket(market) && market.seriesId) {
      return `/series/${market.seriesId}`;
    }
    return `/market/${market.slug}`;
  }
}

/**
 * Determine the correct navigation type for a market
 */
export function determineNavigationType(market: ProcessedMarket): 'market' | 'series' {
  return isSeriesMarket(market) ? 'series' : 'market';
}

// ============================================================================
// Real-time Data Integration
// ============================================================================

/**
 * Extract all token IDs for real-time subscriptions
 */
export function extractTokenIds(data: ProcessedEventData): string[] {
  const tokenIds: string[] = [];

  // Extract from individual markets
  data.individualMarkets.forEach(market => {
    market.outcomes.forEach(outcome => {
      if (outcome.tokenId) {
        tokenIds.push(outcome.tokenId);
      }
    });
  });

  // Extract from series markets
  data.series.forEach(series => {
    series.markets.forEach(market => {
      market.outcomes.forEach(outcome => {
        if (outcome.tokenId) {
          tokenIds.push(outcome.tokenId);
        }
      });
    });
  });

  return [...new Set(tokenIds)]; // Remove duplicates
}

/**
 * Extract market IDs for market-level subscriptions
 */
export function extractMarketIds(data: ProcessedEventData): string[] {
  const marketIds: string[] = [];

  // Extract from individual markets
  data.individualMarkets.forEach(market => {
    marketIds.push(market.id);
  });

  // Extract from series markets
  data.series.forEach(series => {
    series.markets.forEach(market => {
      marketIds.push(market.id);
    });
  });

  return [...new Set(marketIds)]; // Remove duplicates
}

/**
 * Extract series IDs for series-level subscriptions
 */
export function extractSeriesIds(data: ProcessedEventData): string[] {
  return data.series.map(series => series.id);
}

// ============================================================================
// Component Integration Helpers
// ============================================================================

/**
 * Prepare data for MarketCard component
 */
export function prepareMarketCardData(market: ProcessedMarket) {
  return {
    market,
    showAIInsights: true,
    enableRealTimeUpdates: true,
    featured: market.featured || market.volume24h > 500000,
    trending: market.volume24h > 100000,
  };
}

/**
 * Prepare data for SeriesCard component
 */
export function prepareSeriesCardData(series: ProcessedSeries) {
  return {
    series,
    showAIInsights: true,
    enableRealTimeUpdates: true,
    showMarketPreviews: true,
    maxMarketPreviews: 3,
    featured: series.totalVolume > 500000,
    trending: series.totalVolume > 1000000,
  };
}

// ============================================================================
// State Management Integration
// ============================================================================

/**
 * Calculate aggregate statistics for display
 */
export interface AggregateStats {
  totalMarkets: number;
  totalSeries: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  activeMarkets: number;
  activeSeries: number;
}

export function calculateAggregateStats(data: ProcessedEventData): AggregateStats {
  const totalVolume = data.allMarkets.reduce((sum, market) => sum + market.volume24h, 0);
  const activeMarkets = data.individualMarkets.filter(m => m.active && !m.closed).length;
  const activeSeries = data.series.filter(s => s.active).length;

  return {
    totalMarkets: data.individualMarkets.length,
    totalSeries: data.series.length,
    totalVolume,
    totalVolumeFormatted: formatVolume(totalVolume),
    activeMarkets,
    activeSeries,
  };
}

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}

// ============================================================================
// Error Handling and Fallbacks
// ============================================================================

/**
 * Validate processed data and provide fallbacks
 */
export function validateProcessedData(data: ProcessedEventData): ProcessedEventData {
  // Ensure all markets have required fields
  const validatedIndividualMarkets = data.individualMarkets.filter(market => 
    market.id && market.title && market.outcomes.length > 0
  );

  const validatedSeries = data.series.filter(series => 
    series.id && series.title && series.markets.length > 0
  );

  // Recalculate allMarkets with validated data
  const allMarkets = [
    ...validatedIndividualMarkets,
    ...validatedSeries.flatMap(s => s.markets)
  ];

  return {
    series: validatedSeries,
    individualMarkets: validatedIndividualMarkets,
    allMarkets,
  };
}

/**
 * Handle empty state scenarios
 */
export function handleEmptyState(tag: string): {
  message: string;
  suggestion: string;
} {
  return {
    message: `No active markets found for ${tag === 'all' ? 'all categories' : tag}.`,
    suggestion: 'Try selecting a different category or check back later.',
  };
}

// ============================================================================
// Performance Optimization Helpers
// ============================================================================

/**
 * Prioritize content for preloading
 */
export function prioritizeContentForPreloading(data: ProcessedEventData): {
  criticalImages: string[];
  preloadTokenIds: string[];
} {
  const criticalImages: string[] = [];
  const preloadTokenIds: string[] = [];

  // Prioritize first 2 series images
  data.series.slice(0, 2).forEach(series => {
    if (series.image) {
      criticalImages.push(series.image);
    }
    // Preload token IDs for first market in each series
    if (series.markets[0]) {
      series.markets[0].outcomes.forEach(outcome => {
        if (outcome.tokenId) {
          preloadTokenIds.push(outcome.tokenId);
        }
      });
    }
  });

  // Prioritize first 4 individual market images
  data.individualMarkets.slice(0, 4).forEach(market => {
    if (market.image) {
      criticalImages.push(market.image);
    }
    // Preload token IDs for high-volume markets
    if (market.volume24h > 50000) {
      market.outcomes.forEach(outcome => {
        if (outcome.tokenId) {
          preloadTokenIds.push(outcome.tokenId);
        }
      });
    }
  });

  return {
    criticalImages: [...new Set(criticalImages)],
    preloadTokenIds: [...new Set(preloadTokenIds)],
  };
}

// ============================================================================
// Integration Validation
// ============================================================================

/**
 * Validate that all required integrations are working
 */
export function validateIntegration(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if required components are available
  if (typeof window !== 'undefined') {
    // Client-side validations
    if (!window.fetch) {
      errors.push('Fetch API not available');
    }
  }

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_POLYMARKET_API_URL) {
    warnings.push('Polymarket API URL not configured');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Export Integration Interface
// ============================================================================

/**
 * Main integration interface for the application
 */
export interface AppIntegration {
  processEvents: (events: PolymarketEvent[]) => ProcessedEventData;
  generateNavigation: (item: ProcessedMarket | ProcessedSeries, type: 'market' | 'series') => string;
  extractSubscriptionIds: (data: ProcessedEventData) => {
    tokenIds: string[];
    marketIds: string[];
    seriesIds: string[];
  };
  calculateStats: (data: ProcessedEventData) => AggregateStats;
  validateData: (data: ProcessedEventData) => ProcessedEventData;
  prioritizeContent: (data: ProcessedEventData) => {
    criticalImages: string[];
    preloadTokenIds: string[];
  };
}

/**
 * Create the main application integration instance
 */
export function createAppIntegration(): AppIntegration {
  return {
    processEvents: processEventsWithSeriesDetection,
    generateNavigation: generateNavigationUrl,
    extractSubscriptionIds: (data: ProcessedEventData) => ({
      tokenIds: extractTokenIds(data),
      marketIds: extractMarketIds(data),
      seriesIds: extractSeriesIds(data),
    }),
    calculateStats: calculateAggregateStats,
    validateData: validateProcessedData,
    prioritizeContent: prioritizeContentForPreloading,
  };
}

/**
 * Default app integration instance
 */
export const appIntegration = createAppIntegration();