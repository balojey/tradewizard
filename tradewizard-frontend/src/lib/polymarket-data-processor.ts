/**
 * Data Processing Utilities for Polymarket API Responses
 * Transforms raw API data into UI-friendly formats
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  MarketOutcome,
  OrderBook,
  RecentTrade,
  PriceHistoryPoint,
  VolumeHistoryPoint,
  AIMarketInsights,
  PayoutInfo,
} from './polymarket-api-types';

import type {
  ProcessedMarket,
  ProcessedSeries,
  SeriesAIInsights,
  DetailedMarket,
} from './enhanced-polymarket-types';

/**
 * Process a market for detailed view
 * Implements Requirements 4.2, 4.4, 4.5, 4.6
 */
export function processMarketForDetail(
  market: PolymarketMarket,
  event?: PolymarketEvent
): DetailedMarket {
  const processedMarket = processMarket(market, event);
  
  // Enhanced fields for detailed view
  const detailedMarket: DetailedMarket = {
    ...processedMarket,
    
    // Extended Market Information
    resolutionDetails: market.description || 'No resolution details available',
    marketMakerAddress: market.marketMakerAddress,
    createdBy: market.submitted_by,
    resolvedBy: market.resolvedBy,
    
    // Enhanced Trading Data (will be populated by real-time services)
    orderBook: createEmptyOrderBook(market.id),
    recentTrades: [],
    priceHistory: [],
    volumeHistory: [],
    
    // Market Statistics
    totalTrades: 0,
    uniqueTraders: 0,
    averageTradeSize: 0,
    largestTrade: 0,
    
    // Liquidity Metrics
    bidAskSpread: market.spread || 0,
    marketDepth: market.liquidityNum || 0,
    liquidityProviders: 0,
    
    // Market Health
    healthScore: calculateMarketHealthScore(market),
    riskWarnings: generateRiskWarnings(market),
    tradingRestrictions: generateTradingRestrictions(market),
  };

  return detailedMarket;
}

/**
 * Process an event as a series for detailed view
 * Implements Requirements 13.5, 13.6, 13.7, 13.8
 */
export function processSeriesForDetail(event: PolymarketEvent): ProcessedSeries {
  // Process all markets in the series
  const processedMarkets = event.markets.map(market => processMarket(market, event));
  
  // Calculate aggregate statistics
  const totalVolume = processedMarkets.reduce((sum, market) => sum + market.volume24h, 0);
  const totalLiquidity = processedMarkets.reduce((sum, market) => sum + market.liquidity, 0);
  
  // Count market states
  const activeMarkets = processedMarkets.filter(m => m.active && !m.closed).length;
  const completedMarkets = processedMarkets.filter(m => m.closed).length;
  const upcomingMarkets = processedMarkets.filter(m => !m.active && new Date(m.startDate) > new Date()).length;
  
  // Find earliest end date
  const endDates = processedMarkets.map(m => new Date(m.endDate).getTime());
  const earliestEndDate = new Date(Math.min(...endDates)).toISOString();
  
  // Determine series type and recurrence from market patterns
  const seriesType = determineSeriesType(event, event.markets);
  const recurrence = determineSeriesRecurrence(event, processedMarkets);
  
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    image: event.image || '',
    slug: event.slug,
    seriesType,
    recurrence,
    markets: processedMarkets,
    marketCount: processedMarkets.length,
    activeMarkets,
    completedMarkets,
    upcomingMarkets,
    totalVolume,
    totalVolumeFormatted: formatVolume(totalVolume),
    totalLiquidity,
    totalLiquidityFormatted: formatVolume(totalLiquidity),
    endDate: earliestEndDate,
    startDate: event.startDate,
    active: activeMarkets > 0,
    tags: event.tags.map(tag => ({
      id: tag.id.toString(),
      label: tag.label,
      slug: tag.slug,
      forceShow: tag.forceShow || false,
      forceHide: tag.forceHide || false,
      isPolitics: isPoliticsTag(tag.label),
    })),
    politicsTags: event.tags.filter(tag => isPoliticsTag(tag.label)).map(tag => ({
      id: tag.id.toString(),
      label: tag.label,
      slug: tag.slug,
      forceShow: tag.forceShow || false,
      forceHide: tag.forceHide || false,
      isPolitics: true as const,
      marketCount: 1,
    })),
    
    // AI Enhancement fields (placeholder)
    seriesInsights: generateMockSeriesInsights(event, processedMarkets),
    lastUpdated: Date.now(),
  };
}
/**
 * Process a basic market for card display
 */
export function processMarket(
  market: PolymarketMarket,
  event?: PolymarketEvent
): ProcessedMarket {
  // Parse outcomes and prices
  const outcomes = parseMarketOutcomes(market);
  
  // Determine category from event tags or market data
  const category = determineMarketCategory(market, event);
  
  // Format volume and liquidity
  const volumeFormatted = formatVolume(market.volumeNum || 0);
  const liquidityFormatted = formatVolume(market.liquidityNum || 0);
  
  // Calculate derived fields
  const spread = calculateSpread(market);
  const spreadFormatted = spread ? `${(spread * 100).toFixed(2)}%` : undefined;
  const priceChangeFormatted = market.oneDayPriceChange 
    ? `${market.oneDayPriceChange > 0 ? '+' : ''}${(market.oneDayPriceChange * 100).toFixed(1)}%`
    : undefined;

  return {
    id: market.id,
    conditionId: market.conditionId,
    title: market.question,
    description: market.description || '',
    image: market.image || event?.image || '',
    category,
    slug: market.slug,
    
    // Market Metadata
    endDate: market.endDate,
    startDate: market.startDate,
    active: market.active,
    closed: market.closed,
    resolved: market.closed && !!market.resolvedBy,
    isNew: market.new,
    featured: market.featured,
    
    // Series Support
    groupItemTitle: market.groupItemTitle,
    groupItemThreshold: market.groupItemThreshold,
    
    // Market Outcomes
    outcomes,
    
    // Volume and Liquidity Metrics
    volume24h: market.volume24hr || market.volumeNum || 0,
    volumeFormatted,
    liquidity: market.liquidityNum || 0,
    liquidityFormatted,
    
    // Trading Enhancement fields
    spread,
    spreadFormatted,
    lastTradePrice: market.lastTradePrice,
    priceChange24h: market.oneDayPriceChange,
    priceChangeFormatted,
    marketDepth: market.liquidityNum || 0,
    tradingEnabled: market.acceptingOrders !== false && market.active && !market.closed,
    acceptingOrders: market.acceptingOrders !== false,
    minOrderSize: market.orderMinSize,
    maxOrderSize: 10000,
    tickSize: market.orderPriceMinTickSize,
    
    // Market Quality Metrics
    competitiveScore: market.competitive,
    liquidityScore: calculateLiquidityScore(market),
    volatilityRegime: determineVolatilityRegime(market),
    
    // Resolution Information
    resolutionSource: market.resolutionSource,
    resolutionCriteria: market.description,
    resolutionResult: market.closed ? determineResolutionResult(market) : undefined,
    payoutInfo: market.closed ? generatePayoutInfo(market) : undefined,
    
    // Enhanced Tag System
    tags: event?.tags.map(tag => ({
      id: tag.id.toString(),
      label: tag.label,
      slug: tag.slug,
      forceShow: tag.forceShow || false,
      forceHide: tag.forceHide || false,
      isPolitics: isPoliticsTag(tag.label),
    })) || [],
    politicsTags: event?.tags.filter(tag => isPoliticsTag(tag.label)).map(tag => ({
      id: tag.id.toString(),
      label: tag.label,
      slug: tag.slug,
      forceShow: tag.forceShow || false,
      forceHide: tag.forceHide || false,
      isPolitics: true as const,
      marketCount: 1,
    })) || [],
    
    // AI Enhancement fields
    aiInsights: generateMockAIInsights(market),
    riskLevel: determineRiskLevel(market),
    confidence: calculateConfidenceScore(market),
    
    // Real-time Status
    lastUpdated: Date.now(),
    connectionStatus: 'connected',
    
    // Navigation and Routing
    events: [{
      id: event?.id || market.id,
      title: event?.title || market.question,
      description: event?.description || market.description || '',
      slug: event?.slug || market.slug,
      image: event?.image || market.image || '',
      startDate: event?.startDate || market.startDate,
      endDate: event?.endDate || market.endDate,
      active: event?.active ?? market.active,
      marketCount: event?.markets.length || 1,
      totalVolume: market.volumeNum || 0,
      tags: event?.tags.map(tag => ({
        id: tag.id.toString(),
        label: tag.label,
        slug: tag.slug,
        forceShow: tag.forceShow || false,
        forceHide: tag.forceHide || false,
        isPolitics: isPoliticsTag(tag.label),
      })) || [],
    }],
  };
}
// Helper functions

function determineSeriesType(event: PolymarketEvent, markets: PolymarketMarket[]): string {
  const title = event.title.toLowerCase();
  
  if (title.includes('election') || title.includes('primary')) {
    return 'Election';
  }
  
  if (title.includes('season') || title.includes('championship')) {
    return 'Sports Season';
  }
  
  if (title.includes('quarter') || title.includes('earnings')) {
    return 'Financial';
  }
  
  if (markets.some(m => m.groupItemTitle)) {
    return 'Multi-Outcome';
  }
  
  return 'Event Series';
}

function determineSeriesRecurrence(event: PolymarketEvent, markets: ProcessedMarket[]): string {
  const title = event.title.toLowerCase();
  
  if (title.includes('daily')) return 'Daily';
  if (title.includes('weekly')) return 'Weekly';
  if (title.includes('monthly')) return 'Monthly';
  if (title.includes('quarterly')) return 'Quarterly';
  if (title.includes('annual') || title.includes('yearly')) return 'Annual';
  
  return 'One-time';
}

function isPoliticsTag(tagLabel: string): boolean {
  const politicsKeywords = [
    'politics', 'election', 'president', 'congress', 'senate', 'house',
    'democrat', 'republican', 'vote', 'campaign', 'primary', 'ballot',
    'government', 'policy', 'legislation', 'political'
  ];
  
  const label = tagLabel.toLowerCase();
  return politicsKeywords.some(keyword => label.includes(keyword));
}

function generateMockSeriesInsights(event: PolymarketEvent, markets: ProcessedMarket[]): SeriesAIInsights {
  const avgConfidence = markets.reduce((sum, m) => sum + (m.confidence || 50), 0) / markets.length;
  
  let seriesRisk: 'low' | 'medium' | 'high' = 'medium';
  let seriesTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  return {
    seriesSummary: `Series contains ${markets.length} markets with average confidence of ${avgConfidence.toFixed(1)}%`,
    seriesTrend,
    correlationAnalysis: [`${markets.filter(m => m.active).length} active markets`],
    marketCorrelations: {},
    leadingIndicators: ['Volume trends', 'Price momentum'],
    seriesStrategy: 'Monitor for opportunities',
    optimalAllocation: {},
    seriesRisk,
    diversificationBenefit: 0.5,
    confidence: Math.round(avgConfidence),
    lastUpdated: Date.now(),
  };
}

function parseMarketOutcomes(market: PolymarketMarket): MarketOutcome[] {
  try {
    const outcomeNames = JSON.parse(market.outcomes);
    const outcomePrices = JSON.parse(market.outcomePrices);
    
    if (!Array.isArray(outcomeNames) || !Array.isArray(outcomePrices)) {
      throw new Error('Invalid outcomes format');
    }
    
    return outcomeNames.map((name: string, index: number): MarketOutcome => {
      const price = parseFloat(outcomePrices[index] || '0');
      const probability = price * 100;
      
      let color: 'yes' | 'no' | 'neutral' = 'neutral';
      if (name.toLowerCase().includes('yes') || index === 0) {
        color = 'yes';
      } else if (name.toLowerCase().includes('no') || index === 1) {
        color = 'no';
      }
      
      return {
        name,
        tokenId: `${market.id}-${index}`,
        probability,
        price,
        volume24h: (market.volume24hr || 0) * price,
        color,
        lastPrice: price,
        minOrderSize: market.orderMinSize || 0.01,
        maxOrderSize: 10000,
        tickSize: market.orderPriceMinTickSize || 0.01,
        lastUpdateTime: Date.now(),
      };
    });
  } catch (error) {
    return [
      {
        name: 'Yes',
        tokenId: `${market.id}-yes`,
        probability: 50,
        price: 0.5,
        volume24h: market.volume24hr || 0,
        color: 'yes',
        lastPrice: 0.5,
        minOrderSize: 0.01,
        maxOrderSize: 10000,
        tickSize: 0.01,
        lastUpdateTime: Date.now(),
      },
      {
        name: 'No',
        tokenId: `${market.id}-no`,
        probability: 50,
        price: 0.5,
        volume24h: market.volume24hr || 0,
        color: 'no',
        lastPrice: 0.5,
        minOrderSize: 0.01,
        maxOrderSize: 10000,
        tickSize: 0.01,
        lastUpdateTime: Date.now(),
      },
    ];
  }
}
function determineMarketCategory(market: PolymarketMarket, event?: PolymarketEvent): string {
  if (event?.tags && event.tags.length > 0) {
    return event.tags[0].label;
  }
  
  const question = market.question.toLowerCase();
  
  if (question.includes('election') || question.includes('president') || question.includes('vote')) {
    return 'Politics';
  }
  
  if (question.includes('crypto') || question.includes('bitcoin') || question.includes('ethereum')) {
    return 'Crypto';
  }
  
  if (question.includes('sport') || question.includes('nfl') || question.includes('nba')) {
    return 'Sports';
  }
  
  return 'Other';
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  }
  
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  
  return `$${volume.toFixed(0)}`;
}

function calculateSpread(market: PolymarketMarket): number | undefined {
  if (market.bestBid && market.bestAsk) {
    return market.bestAsk - market.bestBid;
  }
  
  return market.spread;
}

function calculateLiquidityScore(market: PolymarketMarket): number {
  const volume = market.volumeNum || 0;
  const liquidity = market.liquidityNum || 0;
  
  let score = 0;
  
  if (volume > 1000000) score += 5;
  else if (volume > 100000) score += 4;
  else if (volume > 10000) score += 3;
  else if (volume > 1000) score += 2;
  else if (volume > 100) score += 1;
  
  if (liquidity > 100000) score += 5;
  else if (liquidity > 10000) score += 4;
  else if (liquidity > 1000) score += 3;
  else if (liquidity > 100) score += 2;
  else if (liquidity > 10) score += 1;
  
  return Math.min(score, 10);
}

function determineVolatilityRegime(market: PolymarketMarket): 'low' | 'medium' | 'high' {
  const priceChange = Math.abs(market.oneDayPriceChange || 0);
  
  if (priceChange > 0.1) return 'high';
  if (priceChange > 0.05) return 'medium';
  return 'low';
}

function determineRiskLevel(market: PolymarketMarket): 'low' | 'medium' | 'high' {
  const volatility = determineVolatilityRegime(market);
  const liquidity = market.liquidityNum || 0;
  
  if (volatility === 'high' || liquidity < 1000) return 'high';
  if (volatility === 'medium' || liquidity < 10000) return 'medium';
  return 'low';
}

function calculateConfidenceScore(market: PolymarketMarket): number {
  const volume = market.volumeNum || 0;
  const liquidity = market.liquidityNum || 0;
  
  let confidence = 50;
  
  if (volume > 100000) confidence += 20;
  else if (volume > 10000) confidence += 10;
  else if (volume > 1000) confidence += 5;
  
  if (liquidity > 10000) confidence += 15;
  else if (liquidity > 1000) confidence += 10;
  else if (liquidity > 100) confidence += 5;
  
  return Math.min(Math.max(confidence, 0), 100);
}

function calculateMarketHealthScore(market: PolymarketMarket): number {
  let score = 100;
  
  if (!market.active) score -= 30;
  if (market.closed) score -= 20;
  if (!market.acceptingOrders) score -= 25;
  if ((market.liquidityNum || 0) < 1000) score -= 15;
  if ((market.volumeNum || 0) < 100) score -= 10;
  
  return Math.max(score, 0);
}

function generateRiskWarnings(market: PolymarketMarket): string[] {
  const warnings: string[] = [];
  
  if (!market.active) {
    warnings.push('Market is not currently active');
  }
  
  if (market.closed) {
    warnings.push('Market has closed for trading');
  }
  
  if (!market.acceptingOrders) {
    warnings.push('Market is not accepting new orders');
  }
  
  if ((market.liquidityNum || 0) < 1000) {
    warnings.push('Low liquidity - trades may have high slippage');
  }
  
  return warnings;
}

function generateTradingRestrictions(market: PolymarketMarket): string[] {
  const restrictions: string[] = [];
  
  if (market.orderMinSize) {
    restrictions.push(`Minimum order size: ${market.orderMinSize}`);
  }
  
  if (market.orderPriceMinTickSize) {
    restrictions.push(`Minimum price increment: ${market.orderPriceMinTickSize}`);
  }
  
  return restrictions;
}

function determineResolutionResult(market: PolymarketMarket): string | undefined {
  if (!market.closed) return undefined;
  
  try {
    const outcomes = JSON.parse(market.outcomes);
    const prices = JSON.parse(market.outcomePrices);
    
    let winningIndex = 0;
    let maxPrice = 0;
    
    prices.forEach((price: string, index: number) => {
      const numPrice = parseFloat(price);
      if (numPrice > maxPrice) {
        maxPrice = numPrice;
        winningIndex = index;
      }
    });
    
    return outcomes[winningIndex];
  } catch {
    return 'Resolution pending';
  }
}

function generatePayoutInfo(market: PolymarketMarket): PayoutInfo | undefined {
  if (!market.closed) return undefined;
  
  const resolutionResult = determineResolutionResult(market);
  
  return {
    resolved: true,
    winningOutcome: resolutionResult,
    payoutRatio: 1.0,
    resolutionDate: market.closedTime ? new Date(market.closedTime).getTime() : Date.now(),
    payoutDate: market.closedTime ? new Date(market.closedTime).getTime() + 24 * 60 * 60 * 1000 : undefined,
    totalPayout: market.volumeNum || 0,
  };
}

function generateMockAIInsights(market: PolymarketMarket): AIMarketInsights {
  const confidence = calculateConfidenceScore(market);
  const riskLevel = determineRiskLevel(market);
  
  return {
    summary: `AI analysis suggests ${confidence > 70 ? 'high' : confidence > 50 ? 'moderate' : 'low'} confidence in current market pricing.`,
    keyFactors: [
      'Historical trading patterns',
      'Market liquidity levels',
      'Recent price movements',
    ],
    riskFactors: [
      riskLevel === 'high' ? 'High volatility detected' : 'Standard market risks',
      'Liquidity constraints may affect large orders',
    ],
    confidence,
    lastUpdated: Date.now(),
    
    sentiment: confidence > 60 ? 'bullish' : confidence < 40 ? 'bearish' : 'neutral',
    volatilityPrediction: determineVolatilityRegime(market),
    liquidityAssessment: (market.liquidityNum || 0) > 10000 ? 'good' : 
                        (market.liquidityNum || 0) > 1000 ? 'fair' : 'poor',
    
    positionSizing: riskLevel === 'low' ? 'medium' : 'small',
  };
}

function createEmptyOrderBook(marketId: string): OrderBook {
  return {
    market: marketId,
    asset_id: marketId,
    tokenId: marketId,
    bids: [],
    asks: [],
    timestamp: Date.now(),
    
    spread: 0,
    spreadPercent: 0,
    midPrice: 0.5,
    bestBid: 0,
    bestAsk: 1,
    bidDepth: 0,
    askDepth: 0,
    totalBidSize: 0,
    totalAskSize: 0,
    
    liquidityScore: 0,
    depthScore: 0,
    tightness: 0,
    
    lastUpdated: Date.now(),
    updateCount: 0,
  };
}