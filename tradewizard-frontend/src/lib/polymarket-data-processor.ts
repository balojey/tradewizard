/**
 * Data Processing Utilities for Polymarket API Responses
 * Transforms raw API data into UI-friendly formats
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  ProcessedMarket,
  DetailedMarket,
  MarketOutcome,
  OrderBook,
  RecentTrade,
  PriceHistoryPoint,
  VolumeHistoryPoint,
  AIMarketInsights,
  PayoutInfo,
} from './polymarket-api-types';

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
    totalTrades: 0, // Would come from analytics API
    uniqueTraders: 0, // Would come from analytics API
    averageTradeSize: 0,
    largestTrade: 0,
    
    // Liquidity Metrics
    bidAskSpread: market.spread || 0,
    marketDepth: market.liquidityNum || 0,
    liquidityProviders: 0, // Would come from analytics API
    
    // Market Health
    healthScore: calculateMarketHealthScore(market),
    riskWarnings: generateRiskWarnings(market),
    tradingRestrictions: generateTradingRestrictions(market),
  };

  return detailedMarket;
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
    outcomes,
    volume24h: market.volume24hr || market.volumeNum || 0,
    volumeFormatted,
    liquidity: market.liquidityNum || 0,
    liquidityFormatted,
    endDate: market.endDate,
    startDate: market.startDate,
    active: market.active,
    closed: market.closed,
    isNew: market.new,
    featured: market.featured,
    slug: market.slug,
    tags: event?.tags.map(tag => tag.slug) || [],
    
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
    tickSize: market.orderPriceMinTickSize,
    
    // Market Quality Metrics
    competitiveScore: market.competitive,
    liquidityScore: calculateLiquidityScore(market),
    volatilityRegime: determineVolatilityRegime(market),
    
    // Resolution Information
    resolutionSource: market.resolutionSource,
    resolutionCriteria: market.description,
    resolved: market.closed && !!market.resolvedBy,
    resolutionResult: market.closed ? determineResolutionResult(market) : undefined,
    payoutInfo: market.closed ? generatePayoutInfo(market) : undefined,
    
    // AI Enhancement fields (placeholder - would be populated by AI service)
    aiInsights: generateMockAIInsights(market),
    riskLevel: determineRiskLevel(market),
    confidence: calculateConfidenceScore(market),
    
    // Real-time Status
    lastUpdated: Date.now(),
    connectionStatus: 'connected',
  };
}

/**
 * Parse market outcomes from JSON strings
 */
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
      
      // Determine color based on outcome name and position
      let color: 'yes' | 'no' | 'neutral' = 'neutral';
      if (name.toLowerCase().includes('yes') || index === 0) {
        color = 'yes';
      } else if (name.toLowerCase().includes('no') || index === 1) {
        color = 'no';
      }
      
      return {
        name,
        tokenId: extractTokenId(market, index),
        probability,
        price,
        volume24h: (market.volume24hr || 0) * price, // Approximate volume for this outcome
        color,
        
        // Enhanced Trading Fields
        lastPrice: price,
        priceChange24h: market.oneDayPriceChange,
        priceChangePercent: market.oneDayPriceChange ? market.oneDayPriceChange * 100 : undefined,
        bestBid: market.bestBid,
        bestAsk: market.bestAsk,
        spread: market.spread,
        spreadPercent: market.spread ? market.spread * 100 : undefined,
        
        // Price History
        high24h: price * 1.1, // Mock data - would come from price history API
        low24h: price * 0.9,
        open24h: price,
        
        // Volume Metrics
        volumeChange24h: 0, // Would come from analytics API
        volumeChangePercent: 0,
        tradeCount24h: 0,
        
        // Real-time Status
        lastTradeTime: Date.now() - Math.random() * 3600000, // Mock recent trade
        lastUpdateTime: Date.now(),
        
        // Trading Configuration
        minOrderSize: market.orderMinSize || 0.01,
        maxOrderSize: 10000, // Default max
        tickSize: market.orderPriceMinTickSize || 0.01,
      };
    });
  } catch (error) {
    console.warn('Failed to parse market outcomes:', error);
    
    // Return default outcomes
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

/**
 * Extract token ID for outcome (simplified implementation)
 */
function extractTokenId(market: PolymarketMarket, outcomeIndex: number): string {
  if (market.clobTokenIds) {
    try {
      const tokenIds = JSON.parse(market.clobTokenIds);
      return tokenIds[outcomeIndex] || `${market.id}-${outcomeIndex}`;
    } catch {
      // Fall through to default
    }
  }
  
  return `${market.id}-${outcomeIndex}`;
}

/**
 * Determine market category from tags or market data
 */
function determineMarketCategory(market: PolymarketMarket, event?: PolymarketEvent): string {
  if (event?.tags && event.tags.length > 0) {
    // Use the first tag as primary category
    return event.tags[0].label;
  }
  
  // Fallback to analyzing market question
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

/**
 * Format volume for display
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  }
  
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  
  return `$${volume.toFixed(0)}`;
}

/**
 * Calculate bid-ask spread
 */
function calculateSpread(market: PolymarketMarket): number | undefined {
  if (market.bestBid && market.bestAsk) {
    return market.bestAsk - market.bestBid;
  }
  
  return market.spread;
}

/**
 * Calculate liquidity score (0-10 scale)
 */
function calculateLiquidityScore(market: PolymarketMarket): number {
  const volume = market.volumeNum || 0;
  const liquidity = market.liquidityNum || 0;
  
  // Simple scoring based on volume and liquidity
  let score = 0;
  
  // Volume component (0-5 points)
  if (volume > 1000000) score += 5;
  else if (volume > 100000) score += 4;
  else if (volume > 10000) score += 3;
  else if (volume > 1000) score += 2;
  else if (volume > 100) score += 1;
  
  // Liquidity component (0-5 points)
  if (liquidity > 100000) score += 5;
  else if (liquidity > 10000) score += 4;
  else if (liquidity > 1000) score += 3;
  else if (liquidity > 100) score += 2;
  else if (liquidity > 10) score += 1;
  
  return Math.min(score, 10);
}

/**
 * Determine volatility regime
 */
function determineVolatilityRegime(market: PolymarketMarket): 'low' | 'medium' | 'high' {
  const priceChange = Math.abs(market.oneDayPriceChange || 0);
  
  if (priceChange > 0.1) return 'high';
  if (priceChange > 0.05) return 'medium';
  return 'low';
}

/**
 * Determine risk level
 */
function determineRiskLevel(market: PolymarketMarket): 'low' | 'medium' | 'high' {
  const volatility = determineVolatilityRegime(market);
  const liquidity = market.liquidityNum || 0;
  
  if (volatility === 'high' || liquidity < 1000) return 'high';
  if (volatility === 'medium' || liquidity < 10000) return 'medium';
  return 'low';
}

/**
 * Calculate confidence score
 */
function calculateConfidenceScore(market: PolymarketMarket): number {
  const volume = market.volumeNum || 0;
  const liquidity = market.liquidityNum || 0;
  const age = Date.now() - new Date(market.startDate).getTime();
  const ageInDays = age / (1000 * 60 * 60 * 24);
  
  let confidence = 50; // Base confidence
  
  // Volume boost
  if (volume > 100000) confidence += 20;
  else if (volume > 10000) confidence += 10;
  else if (volume > 1000) confidence += 5;
  
  // Liquidity boost
  if (liquidity > 10000) confidence += 15;
  else if (liquidity > 1000) confidence += 10;
  else if (liquidity > 100) confidence += 5;
  
  // Age factor (more mature markets are more reliable)
  if (ageInDays > 7) confidence += 10;
  else if (ageInDays > 1) confidence += 5;
  
  return Math.min(Math.max(confidence, 0), 100);
}

/**
 * Calculate market health score
 */
function calculateMarketHealthScore(market: PolymarketMarket): number {
  let score = 100; // Start with perfect health
  
  // Deduct for issues
  if (!market.active) score -= 30;
  if (market.closed) score -= 20;
  if (!market.acceptingOrders) score -= 25;
  if ((market.liquidityNum || 0) < 1000) score -= 15;
  if ((market.volumeNum || 0) < 100) score -= 10;
  
  return Math.max(score, 0);
}

/**
 * Generate risk warnings
 */
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
  
  if (market.restricted) {
    warnings.push('Market has trading restrictions');
  }
  
  const timeToEnd = new Date(market.endDate).getTime() - Date.now();
  if (timeToEnd < 24 * 60 * 60 * 1000) { // Less than 24 hours
    warnings.push('Market closes within 24 hours');
  }
  
  return warnings;
}

/**
 * Generate trading restrictions
 */
function generateTradingRestrictions(market: PolymarketMarket): string[] {
  const restrictions: string[] = [];
  
  if (market.orderMinSize) {
    restrictions.push(`Minimum order size: $${market.orderMinSize}`);
  }
  
  if (market.orderPriceMinTickSize) {
    restrictions.push(`Minimum price increment: $${market.orderPriceMinTickSize}`);
  }
  
  if (market.rewardsMinSize) {
    restrictions.push(`Minimum size for rewards: $${market.rewardsMinSize}`);
  }
  
  if (market.rewardsMaxSpread) {
    restrictions.push(`Maximum spread for rewards: ${(market.rewardsMaxSpread * 100).toFixed(2)}%`);
  }
  
  return restrictions;
}

/**
 * Determine resolution result
 */
function determineResolutionResult(market: PolymarketMarket): string | undefined {
  if (!market.closed) return undefined;
  
  try {
    const outcomes = JSON.parse(market.outcomes);
    const prices = JSON.parse(market.outcomePrices);
    
    // Find the outcome with price closest to 1 (winning outcome)
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

/**
 * Generate payout information
 */
function generatePayoutInfo(market: PolymarketMarket): PayoutInfo | undefined {
  if (!market.closed) return undefined;
  
  const resolutionResult = determineResolutionResult(market);
  
  return {
    resolved: true,
    winningOutcome: resolutionResult,
    payoutRatio: 1.0, // Simplified - would be calculated based on final prices
    resolutionDate: market.closedTime ? new Date(market.closedTime).getTime() : Date.now(),
    payoutDate: market.closedTime ? new Date(market.closedTime).getTime() + 24 * 60 * 60 * 1000 : undefined,
    totalPayout: market.volumeNum || 0,
  };
}

/**
 * Generate mock AI insights (placeholder)
 */
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
    
    // Enhanced AI Fields
    sentiment: confidence > 60 ? 'bullish' : confidence < 40 ? 'bearish' : 'neutral',
    volatilityPrediction: determineVolatilityRegime(market),
    liquidityAssessment: (market.liquidityNum || 0) > 10000 ? 'good' : 
                        (market.liquidityNum || 0) > 1000 ? 'fair' : 'poor',
    
    // Trading Insights
    positionSizing: riskLevel === 'low' ? 'medium' : 'small',
  };
}

/**
 * Create empty order book for initialization
 */
function createEmptyOrderBook(marketId: string): OrderBook {
  return {
    market: marketId,
    asset_id: marketId,
    tokenId: marketId,
    bids: [],
    asks: [],
    timestamp: Date.now(),
    
    // Calculated Fields
    spread: 0,
    spreadPercent: 0,
    midPrice: 0.5,
    bestBid: 0,
    bestAsk: 1,
    bidDepth: 0,
    askDepth: 0,
    totalBidSize: 0,
    totalAskSize: 0,
    
    // Market Quality Metrics
    liquidityScore: 0,
    depthScore: 0,
    tightness: 0,
    
    // Real-time Status
    lastUpdated: Date.now(),
    updateCount: 0,
  };
}