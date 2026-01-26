/**
 * Data Transformation Utilities for Enhanced Polymarket Types
 * 
 * This file provides utilities to transform data between legacy and enhanced types,
 * ensuring backward compatibility while enabling new features.
 * 
 * Requirements: 4.2, 4.4, 4.5, 13.1, 13.2
 */

import type {
  ProcessedMarket,
  ProcessedSeries,
  MarketTag,
  PoliticsTag,
  MarketEvent,
  SeriesInfo,
  AIMarketInsights,
  MarketOutcome,
} from './enhanced-polymarket-types';

import type {
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  ProcessedEvent,
  ProcessedOutcome,
} from './polymarket-types';

import type {
  ProcessedMarket as LegacyProcessedMarket,
  MarketOutcome as LegacyMarketOutcome,
} from './polymarket-api-types';

// ============================================================================
// Market Transformation Functions
// ============================================================================

/**
 * Transform legacy ProcessedMarket to enhanced ProcessedMarket
 * Adds series support and enhanced trading fields
 */
export function transformLegacyMarket(
  legacyMarket: LegacyProcessedMarket,
  seriesInfo?: SeriesInfo,
  groupItemTitle?: string
): ProcessedMarket {
  // Extract series information from provided parameters
  const hasSeriesInfo = !!(groupItemTitle || seriesInfo);
  
  return {
    // Core market information (unchanged)
    id: legacyMarket.id,
    conditionId: legacyMarket.conditionId,
    title: legacyMarket.title,
    description: legacyMarket.description,
    image: legacyMarket.image,
    category: legacyMarket.category,
    slug: legacyMarket.slug,
    endDate: legacyMarket.endDate,
    startDate: legacyMarket.startDate,
    active: legacyMarket.active,
    closed: legacyMarket.closed,
    resolved: legacyMarket.resolved,
    isNew: legacyMarket.isNew,
    featured: legacyMarket.featured,
    
    // Series support (Requirements 13.1, 13.2)
    groupItemTitle: groupItemTitle,
    groupItemThreshold: undefined, // Not available in legacy type
    seriesId: seriesInfo?.id,
    seriesTitle: seriesInfo?.title,
    
    // Enhanced outcomes
    outcomes: legacyMarket.outcomes.map(transformLegacyOutcome),
    
    // Volume and liquidity (unchanged)
    volume24h: legacyMarket.volume24h,
    volumeFormatted: legacyMarket.volumeFormatted,
    liquidity: legacyMarket.liquidity,
    liquidityFormatted: legacyMarket.liquidityFormatted,
    
    // Trading fields (Requirements 4.2, 4.4, 4.5)
    orderBook: legacyMarket.orderBook,
    spread: legacyMarket.spread,
    spreadFormatted: legacyMarket.spreadFormatted,
    lastTradePrice: legacyMarket.lastTradePrice,
    priceChange24h: legacyMarket.priceChange24h,
    priceChangeFormatted: legacyMarket.priceChangeFormatted,
    marketDepth: legacyMarket.marketDepth,
    tradingEnabled: legacyMarket.tradingEnabled,
    acceptingOrders: legacyMarket.acceptingOrders,
    minOrderSize: legacyMarket.minOrderSize,
    maxOrderSize: undefined, // New field, set default
    tickSize: legacyMarket.tickSize,
    
    // Market quality metrics
    competitiveScore: legacyMarket.competitiveScore,
    liquidityScore: legacyMarket.liquidityScore,
    volatilityRegime: legacyMarket.volatilityRegime,
    
    // Resolution information
    resolutionSource: legacyMarket.resolutionSource,
    resolutionCriteria: legacyMarket.resolutionCriteria,
    resolutionResult: legacyMarket.resolutionResult,
    payoutInfo: legacyMarket.payoutInfo,
    
    // Enhanced tag system
    tags: transformLegacyTags(legacyMarket.tags || []),
    politicsTags: [], // Will be populated by tag transformation
    
    // AI enhancement fields
    aiInsights: legacyMarket.aiInsights,
    riskLevel: legacyMarket.riskLevel,
    confidence: legacyMarket.confidence,
    
    // Real-time status
    lastUpdated: legacyMarket.lastUpdated,
    connectionStatus: legacyMarket.connectionStatus,
    
    // Navigation (placeholder for now)
    events: [], // Will be populated separately
  };
}

/**
 * Transform legacy MarketOutcome to enhanced MarketOutcome
 */
export function transformLegacyOutcome(
  legacyOutcome: LegacyMarketOutcome
): MarketOutcome {
  return {
    // Core outcome information (unchanged)
    name: legacyOutcome.name,
    tokenId: legacyOutcome.tokenId,
    probability: legacyOutcome.probability,
    price: legacyOutcome.price,
    volume24h: legacyOutcome.volume24h,
    color: legacyOutcome.color,
    
    // Enhanced trading fields
    lastPrice: legacyOutcome.lastPrice,
    priceChange24h: legacyOutcome.priceChange24h,
    priceChangePercent: legacyOutcome.priceChangePercent,
    bestBid: legacyOutcome.bestBid,
    bestAsk: legacyOutcome.bestAsk,
    bidSize: legacyOutcome.bidSize,
    askSize: legacyOutcome.askSize,
    spread: legacyOutcome.spread,
    spreadPercent: legacyOutcome.spreadPercent,
    
    // Market depth
    totalBidSize: legacyOutcome.totalBidSize,
    totalAskSize: legacyOutcome.totalAskSize,
    marketDepth: legacyOutcome.marketDepth,
    
    // Price history
    high24h: legacyOutcome.high24h,
    low24h: legacyOutcome.low24h,
    open24h: legacyOutcome.open24h,
    
    // Volume metrics
    volumeChange24h: legacyOutcome.volumeChange24h,
    volumeChangePercent: legacyOutcome.volumeChangePercent,
    tradeCount24h: legacyOutcome.tradeCount24h,
    
    // Real-time status
    lastTradeTime: legacyOutcome.lastTradeTime,
    lastUpdateTime: legacyOutcome.lastUpdateTime,
    
    // Trading configuration
    minOrderSize: legacyOutcome.minOrderSize,
    maxOrderSize: legacyOutcome.maxOrderSize,
    tickSize: legacyOutcome.tickSize,
    
    // Series support (new field)
    category: undefined, // Will be set based on groupItemTitle
  };
}

/**
 * Transform legacy tags array to enhanced MarketTag array
 */
export function transformLegacyTags(legacyTags: string[]): MarketTag[] {
  return legacyTags.map((tagSlug, index) => ({
    id: `tag-${index}`,
    label: formatTagLabel(tagSlug),
    slug: tagSlug,
    forceShow: false,
    forceHide: false,
    isPolitics: isPoliticsTagSlug(tagSlug),
    category: getPoliticsCategory(tagSlug),
    priority: getPoliticsTagPriority(tagSlug),
    marketCount: 0, // Will be populated separately
  }));
}

/**
 * Transform PolymarketEvent to enhanced MarketEvent
 */
export function transformPolymarketEvent(
  polymarketEvent: PolymarketEvent
): MarketEvent {
  // Check if this event has series information
  const seriesInfo = extractSeriesInfo(polymarketEvent);
  
  return {
    id: polymarketEvent.id,
    title: polymarketEvent.title,
    description: polymarketEvent.description,
    slug: polymarketEvent.slug,
    image: polymarketEvent.image || polymarketEvent.icon || '',
    
    // Series information (Requirements 13.1, 13.2)
    series: seriesInfo,
    
    // Event timeline
    startDate: polymarketEvent.startDate,
    endDate: polymarketEvent.endDate,
    active: polymarketEvent.active,
    
    // Event status
    marketCount: polymarketEvent.markets?.length || 0,
    totalVolume: polymarketEvent.volume || 0,
    
    // Enhanced tag system
    tags: polymarketEvent.tags?.map(transformPolymarketTag) || [],
  };
}

/**
 * Transform PolymarketTag to enhanced MarketTag
 */
export function transformPolymarketTag(polymarketTag: PolymarketTag): MarketTag {
  return {
    id: polymarketTag.id.toString(),
    label: polymarketTag.label,
    slug: polymarketTag.slug,
    forceShow: polymarketTag.forceShow || false,
    forceHide: polymarketTag.forceHide || false,
    isPolitics: isPoliticsTagSlug(polymarketTag.slug),
    category: getPoliticsCategory(polymarketTag.slug),
    priority: getPoliticsTagPriority(polymarketTag.slug),
    marketCount: 0, // Will be populated separately
    createdAt: polymarketTag.createdAt,
    updatedAt: polymarketTag.updatedAt,
  };
}

// ============================================================================
// Series Creation Functions
// ============================================================================

/**
 * Create ProcessedSeries from grouped markets
 * Groups markets that share the same series information
 */
export function createSeriesFromMarkets(
  markets: ProcessedMarket[],
  seriesInfo: SeriesInfo
): ProcessedSeries {
  // Filter markets that belong to this series
  const seriesMarkets = markets.filter(
    market => market.seriesId === seriesInfo.id || 
              (market.groupItemTitle && !market.seriesId)
  );
  
  // Calculate aggregate metrics
  const totalVolume = seriesMarkets.reduce((sum, market) => sum + market.volume24h, 0);
  const totalLiquidity = seriesMarkets.reduce((sum, market) => sum + market.liquidity, 0);
  
  // Determine series timeline
  const endDates = seriesMarkets.map(m => new Date(m.endDate).getTime());
  const startDates = seriesMarkets.map(m => new Date(m.startDate).getTime());
  const earliestEnd = new Date(Math.min(...endDates)).toISOString();
  const latestStart = new Date(Math.max(...startDates)).toISOString();
  
  // Count market statuses
  const activeMarkets = seriesMarkets.filter(m => m.active).length;
  const completedMarkets = seriesMarkets.filter(m => m.closed || m.resolved).length;
  const upcomingMarkets = seriesMarkets.filter(m => 
    !m.active && !m.closed && new Date(m.startDate) > new Date()
  ).length;
  
  // Aggregate tags
  const allTags = seriesMarkets.flatMap(m => m.tags);
  const uniqueTags = deduplicateTags(allTags);
  const politicsTags = uniqueTags.filter(tag => tag.isPolitics) as PoliticsTag[];
  
  return {
    id: seriesInfo.id,
    title: seriesInfo.title,
    description: seriesInfo.description,
    image: seriesInfo.image,
    slug: seriesInfo.slug,
    seriesType: seriesInfo.seriesType,
    recurrence: seriesInfo.recurrence,
    
    // Related markets
    markets: seriesMarkets,
    marketCount: seriesMarkets.length,
    
    // Aggregate metrics
    totalVolume,
    totalVolumeFormatted: formatVolume(totalVolume),
    totalLiquidity,
    totalLiquidityFormatted: formatVolume(totalLiquidity),
    
    // Series timeline
    endDate: earliestEnd,
    startDate: latestStart,
    active: activeMarkets > 0,
    
    // Enhanced tag system
    tags: uniqueTags,
    politicsTags,
    
    // Series status
    completedMarkets,
    activeMarkets,
    upcomingMarkets,
    
    // AI enhancement fields (placeholder)
    seriesInsights: undefined,
    
    // Real-time status
    lastUpdated: Date.now(),
  };
}

/**
 * Group markets by series information
 * Returns both series-grouped markets and individual markets
 */
export function groupMarketsBySeries(
  markets: ProcessedMarket[]
): { series: ProcessedSeries[]; individualMarkets: ProcessedMarket[] } {
  const seriesMap = new Map<string, ProcessedMarket[]>();
  const individualMarkets: ProcessedMarket[] = [];
  
  // Group markets by series
  for (const market of markets) {
    if (market.seriesId || market.groupItemTitle) {
      const seriesKey = market.seriesId || `group-${market.groupItemTitle}`;
      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, []);
      }
      seriesMap.get(seriesKey)!.push(market);
    } else {
      individualMarkets.push(market);
    }
  }
  
  // Create ProcessedSeries from grouped markets
  const series: ProcessedSeries[] = [];
  for (const [seriesKey, seriesMarkets] of seriesMap) {
    // Extract series info from the first market
    const firstMarket = seriesMarkets[0];
    const seriesInfo: SeriesInfo = {
      id: firstMarket.seriesId || seriesKey,
      title: firstMarket.seriesTitle || extractSeriesTitle(seriesMarkets),
      slug: generateSeriesSlug(firstMarket.seriesTitle || extractSeriesTitle(seriesMarkets)),
      seriesType: 'grouped', // Default type
      recurrence: 'none', // Default recurrence
      image: firstMarket.image, // Use first market's image
      description: `Series containing ${seriesMarkets.length} related markets`,
    };
    
    series.push(createSeriesFromMarkets(seriesMarkets, seriesInfo));
  }
  
  return { series, individualMarkets };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a tag slug represents a politics-related tag
 */
function isPoliticsTagSlug(slug: string): boolean {
  const politicsKeywords = [
    'politics', 'trump', 'biden', 'election', 'congress', 'senate', 'house',
    'supreme-court', 'president', 'governor', 'mayor', 'democrat', 'republican',
    'vote', 'voting', 'campaign', 'primary', 'general-election', 'midterm',
    'immigration', 'foreign-policy', 'domestic-policy', 'legislation',
    'u-s-politics', 'world', 'france', 'macron', 'uk', 'germany', 'china',
    'russia', 'ukraine', 'israel', 'palestine', 'nato', 'eu', 'brexit'
  ];
  
  return politicsKeywords.some(keyword => 
    slug.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Get politics category for a tag slug
 */
function getPoliticsCategory(slug: string): string | undefined {
  if (!isPoliticsTagSlug(slug)) return undefined;
  
  if (slug.includes('trump') || slug.includes('biden')) return 'Presidential';
  if (slug.includes('congress') || slug.includes('senate') || slug.includes('house')) return 'Legislative';
  if (slug.includes('supreme-court')) return 'Judicial';
  if (slug.includes('election') || slug.includes('vote')) return 'Elections';
  if (slug.includes('immigration') || slug.includes('foreign-policy')) return 'Policy';
  if (slug.includes('world') || slug.includes('international')) return 'International';
  
  return 'General Politics';
}

/**
 * Get priority for politics tags (higher number = higher priority)
 */
function getPoliticsTagPriority(slug: string): number {
  if (slug.includes('trump')) return 100;
  if (slug.includes('biden')) return 95;
  if (slug.includes('election')) return 90;
  if (slug.includes('congress')) return 85;
  if (slug.includes('u-s-politics')) return 80;
  if (slug.includes('immigration')) return 75;
  if (slug.includes('world')) return 70;
  
  return 50; // Default priority
}

/**
 * Format tag label from slug
 */
function formatTagLabel(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract series information from PolymarketEvent
 */
function extractSeriesInfo(event: PolymarketEvent): SeriesInfo | undefined {
  // Check if the event has series-like characteristics
  const hasMultipleMarkets = event.markets && event.markets.length > 1;
  const hasGroupedMarkets = event.markets?.some(m => m.groupItemTitle);
  
  if (!hasMultipleMarkets || !hasGroupedMarkets) {
    return undefined;
  }
  
  return {
    id: `series-${event.id}`,
    title: event.title,
    slug: event.slug,
    seriesType: 'event-based',
    recurrence: 'none',
    image: event.image || event.icon || '',
    description: event.description,
  };
}

/**
 * Extract series title from grouped markets
 */
function extractSeriesTitle(markets: ProcessedMarket[]): string {
  // Try to find common title pattern
  const titles = markets.map(m => m.title);
  const commonWords = findCommonWords(titles);
  
  if (commonWords.length > 0) {
    return commonWords.join(' ');
  }
  
  // Fallback to first market's title
  return markets[0]?.title || 'Market Series';
}

/**
 * Generate series slug from title
 */
function generateSeriesSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Find common words in an array of titles
 */
function findCommonWords(titles: string[]): string[] {
  if (titles.length === 0) return [];
  if (titles.length === 1) return titles[0].split(' ').slice(0, 3);
  
  const wordSets = titles.map(title => 
    new Set(title.toLowerCase().split(' ').filter(word => word.length > 2))
  );
  
  const firstSet = wordSets[0];
  const commonWords: string[] = [];
  
  for (const word of firstSet) {
    if (wordSets.every(set => set.has(word))) {
      commonWords.push(word);
    }
  }
  
  return commonWords.slice(0, 3); // Limit to 3 words
}

/**
 * Deduplicate tags by slug
 */
function deduplicateTags(tags: MarketTag[]): MarketTag[] {
  const seen = new Set<string>();
  return tags.filter(tag => {
    if (seen.has(tag.slug)) {
      return false;
    }
    seen.add(tag.slug);
    return true;
  });
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

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate ProcessedMarket data integrity
 */
export function validateProcessedMarket(market: ProcessedMarket): boolean {
  try {
    // Required fields
    if (!market.id || !market.title || !market.conditionId) {
      return false;
    }
    
    // Outcomes validation
    if (!market.outcomes || market.outcomes.length === 0) {
      return false;
    }
    
    // Probability validation
    const totalProbability = market.outcomes.reduce((sum, outcome) => sum + outcome.probability, 0);
    if (Math.abs(totalProbability - 100) > 1) { // Allow 1% tolerance
      console.warn(`Market ${market.id} has invalid total probability: ${totalProbability}%`);
    }
    
    // Date validation
    if (market.endDate && market.startDate) {
      const endDate = new Date(market.endDate);
      const startDate = new Date(market.startDate);
      if (endDate <= startDate) {
        console.warn(`Market ${market.id} has invalid date range`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error validating market ${market.id}:`, error);
    return false;
  }
}

/**
 * Validate ProcessedSeries data integrity
 */
export function validateProcessedSeries(series: ProcessedSeries): boolean {
  try {
    // Required fields
    if (!series.id || !series.title || !series.slug) {
      return false;
    }
    
    // Markets validation
    if (!series.markets || series.markets.length === 0) {
      return false;
    }
    
    // Validate all markets in the series
    const allMarketsValid = series.markets.every(validateProcessedMarket);
    if (!allMarketsValid) {
      return false;
    }
    
    // Aggregate metrics validation
    const calculatedVolume = series.markets.reduce((sum, market) => sum + market.volume24h, 0);
    if (Math.abs(calculatedVolume - series.totalVolume) > 0.01) {
      console.warn(`Series ${series.id} has inconsistent volume calculation`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error validating series ${series.id}:`, error);
    return false;
  }
}

// ============================================================================
// Note: All functions are already exported inline above
// ============================================================================