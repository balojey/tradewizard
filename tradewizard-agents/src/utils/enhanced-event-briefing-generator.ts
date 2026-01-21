/**
 * Enhanced Event Briefing Generator
 *
 * This module generates enhanced MarketBriefingDocument instances from Polymarket events
 * with comprehensive event-level analysis, multi-market integration, and cross-market
 * correlation detection. It implements Requirements 5.1, 5.2, 5.3 for event-based
 * market intelligence processing.
 * 
 * Features:
 * - Event-based MarketBriefingDocument generation with nested markets
 * - Comprehensive volume trend analysis across all markets within events
 * - Competitive scores and market quality metrics aggregated at event level
 * - Cross-market correlation and opportunity detection
 * - Enhanced metadata with event-level intelligence
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  MarketBriefingDocument,
  EventMetrics,
  MarketRelationship,
  CrossMarketOpportunity,
  EnhancedEventMetadata,
  EventCatalyst,
  MarketCatalyst,
  EventType,
  VolatilityRegime,
  MarketId,
  MarketGroup,
  EventIntelligence,
  MarketInteraction,
} from '../models/types.js';
import { EventMultiMarketKeywordExtractor } from './event-multi-market-keyword-extractor.js';
import { getLogger } from './logger.js';

const logger = getLogger();

/**
 * Volume trend analysis across multiple time periods
 */
export interface VolumeTrendAnalysis {
  trend24hr: 'increasing' | 'decreasing' | 'stable';
  trend1wk: 'increasing' | 'decreasing' | 'stable';
  trend1mo: 'increasing' | 'decreasing' | 'stable';
  trend1yr: 'increasing' | 'decreasing' | 'stable';
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  momentumScore: number; // 0-1, higher = stronger momentum
  consistencyScore: number; // 0-1, higher = more consistent
  volatilityScore: number; // 0-1, higher = more volatile
}

/**
 * Market quality metrics aggregated at event level
 */
export interface EventMarketQuality {
  averageCompetitive: number;
  competitiveConsistency: number;
  liquidityDistribution: number; // Gini coefficient (inverted)
  marketMaturity: number;
  tradingActivity: number;
  resolutionReliability: number;
  overallQuality: number;
}

/**
 * Configuration for briefing generation
 */
export interface BriefingGenerationConfig {
  includeAllMarkets: boolean;
  maxMarketsToAnalyze: number;
  enableCrossMarketAnalysis: boolean;
  enableArbitrageDetection: boolean;
  keywordExtractionMode: 'event_priority' | 'market_priority' | 'balanced';
  volumeTrendPeriods: ('24hr' | '1wk' | '1mo' | '1yr')[];
  qualityThresholds: {
    minLiquidity: number;
    minCompetitive: number;
    minVolume: number;
  };
}

/**
 * Enhanced Event Briefing Generator
 * 
 * Transforms Polymarket events with multiple markets into enhanced MarketBriefingDocument
 * instances with comprehensive event-level analysis and cross-market intelligence.
 */
export class EnhancedEventBriefingGenerator {
  private readonly keywordExtractor: EventMultiMarketKeywordExtractor;
  private readonly config: BriefingGenerationConfig;

  constructor(config: Partial<BriefingGenerationConfig> = {}) {
    this.config = {
      includeAllMarkets: true,
      maxMarketsToAnalyze: 50,
      enableCrossMarketAnalysis: true,
      enableArbitrageDetection: true,
      keywordExtractionMode: 'event_priority',
      volumeTrendPeriods: ['24hr', '1wk', '1mo', '1yr'],
      qualityThresholds: {
        minLiquidity: 100,
        minCompetitive: 0.1,
        minVolume: 10,
      },
      ...config,
    };

    this.keywordExtractor = new EventMultiMarketKeywordExtractor(this.config.keywordExtractionMode);
    
    logger.info('EnhancedEventBriefingGenerator initialized');
  }

  /**
   * Generate enhanced MarketBriefingDocument from Polymarket event
   * Implements Requirements 5.1, 5.2, 5.3
   */
  async generateEventBriefing(event: PolymarketEvent, primaryMarketId?: string): Promise<MarketBriefingDocument> {
    logger.info(`Generating enhanced event briefing for event: ${event.id} (${event.title})`);

    // Determine primary market (dominant by volume or specified)
    const primaryMarket = this.determinePrimaryMarket(event, primaryMarketId);
    
    // Extract event-based keywords with multi-market analysis
    const keywords = this.keywordExtractor.extractKeywordsFromEvent(event);
    
    // Calculate event-level metrics
    const eventMetrics = this.calculateEventMetrics(event);
    
    // Analyze market relationships within the event
    const marketRelationships = this.config.enableCrossMarketAnalysis 
      ? this.analyzeMarketRelationships(event.markets)
      : [];
    
    // Detect cross-market opportunities
    const crossMarketOpportunities = this.config.enableArbitrageDetection
      ? this.detectCrossMarketOpportunities(event.markets, eventMetrics)
      : [];
    
    // Perform comprehensive volume trend analysis
    const volumeTrendAnalysis = this.analyzeVolumeTrends(event);
    
    // Calculate event-level market quality metrics
    const eventMarketQuality = this.calculateEventMarketQuality(event);
    
    // Log quality metrics for debugging
    logger.debug(`Event quality metrics: overall=${eventMarketQuality.overallQuality.toFixed(2)}, competitive=${eventMarketQuality.averageCompetitive.toFixed(2)}`);
    
    // Generate enhanced metadata with event-level intelligence
    const enhancedMetadata = this.generateEnhancedMetadata(
      event,
      eventMetrics,
      marketRelationships,
      crossMarketOpportunities
    );

    // Create the enhanced MarketBriefingDocument
    const briefing: MarketBriefingDocument = {
      // Core market data from primary market
      marketId: primaryMarket.id as MarketId,
      conditionId: primaryMarket.conditionId,
      eventType: this.classifyEventType(event),
      question: primaryMarket.question,
      resolutionCriteria: primaryMarket.description || event.description,
      expiryTimestamp: new Date(primaryMarket.endDate).getTime(),
      currentProbability: this.calculateCurrentProbability(primaryMarket),
      liquidityScore: this.calculateLiquidityScore(primaryMarket, eventMetrics),
      bidAskSpread: this.estimateBidAskSpread(primaryMarket),
      volatilityRegime: this.determineVolatilityRegime(volumeTrendAnalysis),
      volume24h: primaryMarket.volume24hr || 0,
      
      // Event-based enhancement
      eventData: {
        event,
        markets: event.markets,
        eventMetrics,
        marketRelationships,
        crossMarketOpportunities,
      },
      
      // Enhanced keywords from event and all markets
      keywords,
      
      // Enhanced metadata with event-level intelligence
      metadata: enhancedMetadata,
    };

    logger.info(`Generated enhanced event briefing with ${event.markets.length} markets, ${marketRelationships.length} relationships, ${crossMarketOpportunities.length} opportunities`);
    
    return briefing;
  }

  /**
   * Generate multiple briefings for all significant markets in an event
   */
  async generateMultiMarketBriefings(event: PolymarketEvent): Promise<MarketBriefingDocument[]> {
    logger.info(`Generating multi-market briefings for event: ${event.id}`);

    const briefings: MarketBriefingDocument[] = [];
    
    // Filter markets based on quality thresholds
    const qualifiedMarkets = this.filterQualifiedMarkets(event.markets);
    
    // Limit number of markets to analyze
    const marketsToAnalyze = qualifiedMarkets.slice(0, this.config.maxMarketsToAnalyze);
    
    for (const market of marketsToAnalyze) {
      try {
        const briefing = await this.generateEventBriefing(event, market.id);
        briefings.push(briefing);
      } catch (error) {
        logger.warn(`Failed to generate briefing for market ${market.id}: ${(error as Error).message}`);
      }
    }

    logger.info(`Generated ${briefings.length} multi-market briefings from ${marketsToAnalyze.length} qualified markets`);
    
    return briefings;
  }

  // ==========================================================================
  // Event Metrics Calculation - Requirement 5.1
  // ==========================================================================

  /**
   * Calculate comprehensive event-level metrics from constituent markets
   * Implements Requirement 5.1: Event metrics aggregation
   */
  private calculateEventMetrics(event: PolymarketEvent): EventMetrics {
    const markets = event.markets;
    
    // Calculate totals
    const totalVolume = markets.reduce((sum, market) => sum + (market.volumeNum || 0), 0);
    const totalLiquidity = markets.reduce((sum, market) => sum + (market.liquidityNum || 0), 0);
    
    // Calculate average competitive score
    const competitiveScores = markets.filter(m => m.competitive !== undefined).map(m => m.competitive!);
    const averageCompetitive = competitiveScores.length > 0 
      ? competitiveScores.reduce((sum, score) => sum + score, 0) / competitiveScores.length 
      : 0;
    
    // Count markets
    const marketCount = markets.length;
    const activeMarketCount = markets.filter(m => m.active).length;
    
    // Calculate volume distribution
    const volumeDistribution = markets.map(market => ({
      marketId: market.id,
      volumePercentage: totalVolume > 0 ? ((market.volumeNum || 0) / totalVolume) * 100 : 0,
      liquidityPercentage: totalLiquidity > 0 ? ((market.liquidityNum || 0) / totalLiquidity) * 100 : 0,
    }));
    
    // Calculate price correlations (simplified)
    const priceCorrelations = this.calculatePriceCorrelations(markets);

    return {
      totalVolume,
      totalLiquidity,
      averageCompetitive,
      marketCount,
      activeMarketCount,
      volumeDistribution,
      priceCorrelations,
    };
  }

  // ==========================================================================
  // Volume Trend Analysis - Requirement 5.2
  // ==========================================================================

  /**
   * Perform comprehensive volume trend analysis across all markets within events
   * Implements Requirement 5.2: Multiple time period analysis (24hr, 1wk, 1mo, 1yr)
   */
  private analyzeVolumeTrends(event: PolymarketEvent): VolumeTrendAnalysis {
    const markets = event.markets;
    
    // Aggregate volume data across all time periods
    const volumeData = {
      volume24hr: markets.reduce((sum, m) => sum + (m.volume24hr || 0), 0),
      volume1wk: markets.reduce((sum, m) => sum + (m.volume1wk || 0), 0),
      volume1mo: markets.reduce((sum, m) => sum + (m.volume1mo || 0), 0),
      volume1yr: markets.reduce((sum, m) => sum + (m.volume1yr || 0), 0),
    };

    // Calculate trends for each period
    const trend24hr = this.calculatePeriodTrend(volumeData.volume24hr, volumeData.volume1wk / 7);
    const trend1wk = this.calculatePeriodTrend(volumeData.volume1wk / 7, volumeData.volume1mo / 30);
    const trend1mo = this.calculatePeriodTrend(volumeData.volume1mo / 30, volumeData.volume1yr / 365);
    const trend1yr = this.calculateLongTermTrend(volumeData.volume1yr, event.createdAt);

    // Determine overall trend
    const overallTrend = this.determineOverallTrend([trend24hr, trend1wk, trend1mo, trend1yr]);

    // Calculate momentum score (recent activity vs historical)
    const momentumScore = this.calculateMomentumScore(volumeData);

    // Calculate consistency score (how consistent volume is across periods)
    const consistencyScore = this.calculateConsistencyScore([
      volumeData.volume24hr,
      volumeData.volume1wk / 7,
      volumeData.volume1mo / 30,
      volumeData.volume1yr / 365,
    ]);

    // Calculate volatility score
    const volatilityScore = this.calculateVolatilityScore(volumeData);

    return {
      trend24hr,
      trend1wk,
      trend1mo,
      trend1yr,
      overallTrend,
      momentumScore,
      consistencyScore,
      volatilityScore,
    };
  }

  /**
   * Calculate trend between two periods
   */
  private calculatePeriodTrend(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
    if (previous === 0) return 'stable';
    
    const changeRatio = (current - previous) / previous;
    
    if (changeRatio > 0.1) return 'increasing';
    if (changeRatio < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate long-term trend based on event age
   */
  private calculateLongTermTrend(volume1yr: number, createdAt: string): 'increasing' | 'decreasing' | 'stable' {
    try {
      const eventAge = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24); // days
      
      if (eventAge < 30) return 'stable'; // Too new to determine trend
      
      const expectedVolume = volume1yr * (eventAge / 365);
      const actualVolume = volume1yr;
      
      if (actualVolume > expectedVolume * 1.2) return 'increasing';
      if (actualVolume < expectedVolume * 0.8) return 'decreasing';
      return 'stable';
    } catch {
      return 'stable';
    }
  }

  /**
   * Determine overall trend from individual period trends
   */
  private determineOverallTrend(trends: ('increasing' | 'decreasing' | 'stable')[]): 'increasing' | 'decreasing' | 'stable' {
    const increasing = trends.filter(t => t === 'increasing').length;
    const decreasing = trends.filter(t => t === 'decreasing').length;
    
    if (increasing > decreasing) return 'increasing';
    if (decreasing > increasing) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate momentum score based on recent vs historical activity
   */
  private calculateMomentumScore(volumeData: {
    volume24hr: number;
    volume1wk: number;
    volume1mo: number;
    volume1yr: number;
  }): number {
    const recent = volumeData.volume24hr;
    const weeklyAvg = volumeData.volume1wk / 7;
    const monthlyAvg = volumeData.volume1mo / 30;
    
    if (weeklyAvg === 0 && monthlyAvg === 0) return 0.5; // Neutral if no historical data
    
    const weeklyMomentum = weeklyAvg > 0 ? Math.min(2, recent / weeklyAvg) : 1;
    const monthlyMomentum = monthlyAvg > 0 ? Math.min(2, recent / monthlyAvg) : 1;
    
    // Combine and normalize to 0-1
    return Math.min(1, (weeklyMomentum + monthlyMomentum) / 4);
  }

  /**
   * Calculate consistency score across time periods
   */
  private calculateConsistencyScore(volumes: number[]): number {
    if (volumes.length < 2) return 1;
    
    const mean = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
    if (mean === 0) return 1; // Perfect consistency if all zeros
    
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / volumes.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Convert to 0-1 score (lower variation = higher consistency)
    return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
  }

  /**
   * Calculate volatility score from volume data
   */
  private calculateVolatilityScore(volumeData: {
    volume24hr: number;
    volume1wk: number;
    volume1mo: number;
    volume1yr: number;
  }): number {
    const volumes = [
      volumeData.volume24hr,
      volumeData.volume1wk / 7,
      volumeData.volume1mo / 30,
      volumeData.volume1yr / 365,
    ];

    return 1 - this.calculateConsistencyScore(volumes); // Invert consistency for volatility
  }

  // ==========================================================================
  // Market Quality Metrics - Requirement 5.3
  // ==========================================================================

  /**
   * Calculate event-level market quality metrics aggregated from all constituent markets
   * Implements Requirement 5.3: Competitive scores and market quality metrics at event level
   */
  private calculateEventMarketQuality(event: PolymarketEvent): EventMarketQuality {
    const markets = event.markets;
    
    // Calculate average competitive score
    const competitiveScores = markets.filter(m => m.competitive !== undefined).map(m => m.competitive!);
    const averageCompetitive = competitiveScores.length > 0 
      ? competitiveScores.reduce((sum, score) => sum + score, 0) / competitiveScores.length 
      : 0;

    // Calculate competitive consistency
    const competitiveConsistency = this.calculateConsistencyScore(competitiveScores);

    // Calculate liquidity distribution (Gini coefficient inverted for better distribution)
    const liquidities = markets.map(m => m.liquidityNum || 0);
    const liquidityDistribution = 1 - this.calculateGiniCoefficient(liquidities);

    // Calculate market maturity based on age and activity
    const marketMaturity = this.calculateMarketMaturity(event);

    // Calculate trading activity (recent volume vs total volume)
    const tradingActivity = this.calculateTradingActivity(event);

    // Calculate resolution reliability
    const resolutionReliability = this.assessResolutionReliability(event.resolutionSource);

    // Calculate overall quality score
    const overallQuality = this.calculateOverallQualityScore({
      averageCompetitive,
      competitiveConsistency,
      liquidityDistribution,
      marketMaturity,
      tradingActivity,
      resolutionReliability,
    });

    return {
      averageCompetitive,
      competitiveConsistency,
      liquidityDistribution,
      marketMaturity,
      tradingActivity,
      resolutionReliability,
      overallQuality,
    };
  }

  /**
   * Calculate Gini coefficient for distribution analysis
   */
  private calculateGiniCoefficient(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const sum = sortedValues.reduce((acc, val) => acc + val, 0);
    
    if (sum === 0) return 0; // Perfect equality if all zeros
    
    let gini = 0;
    for (let i = 0; i < n; i++) {
      gini += (2 * (i + 1) - n - 1) * sortedValues[i];
    }
    
    return gini / (n * sum);
  }

  /**
   * Calculate market maturity based on event age and activity
   */
  private calculateMarketMaturity(event: PolymarketEvent): number {
    try {
      const eventAge = (Date.now() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24); // days
      const ageScore = Math.min(1, eventAge / 30); // Normalize to 30 days
      
      const activityScore = event.volume > 0 ? Math.min(1, event.volume24hr / event.volume) : 0;
      
      return (ageScore * 0.6 + activityScore * 0.4);
    } catch {
      return 0.5; // Default if calculation fails
    }
  }

  /**
   * Calculate trading activity level
   */
  private calculateTradingActivity(event: PolymarketEvent): number {
    if (event.volume === 0) return 0;
    
    const recentActivity = event.volume24hr / event.volume;
    return Math.min(1, recentActivity * 10); // Scale up for better distribution
  }

  /**
   * Assess resolution source reliability
   */
  private assessResolutionReliability(resolutionSource: string): number {
    const source = resolutionSource.toLowerCase();
    
    // High reliability sources
    if (source.includes('official') || source.includes('government') || 
        source.includes('reuters') || source.includes('ap news') ||
        source.includes('associated press')) {
      return 0.9;
    }
    
    // Medium reliability sources
    if (source.includes('news') || source.includes('media') || 
        source.includes('press') || source.includes('bloomberg') ||
        source.includes('cnn') || source.includes('bbc')) {
      return 0.7;
    }
    
    // Lower reliability or unknown sources
    return 0.5;
  }

  /**
   * Calculate overall quality score from individual metrics
   */
  private calculateOverallQualityScore(metrics: {
    averageCompetitive: number;
    competitiveConsistency: number;
    liquidityDistribution: number;
    marketMaturity: number;
    tradingActivity: number;
    resolutionReliability: number;
  }): number {
    return (
      metrics.averageCompetitive * 0.25 +
      metrics.competitiveConsistency * 0.15 +
      metrics.liquidityDistribution * 0.20 +
      metrics.marketMaturity * 0.15 +
      metrics.tradingActivity * 0.15 +
      metrics.resolutionReliability * 0.10
    );
  }

  // ==========================================================================
  // Cross-Market Analysis - Enhanced Implementation for Requirements 5.4, 2.5, 3.1, 3.2, 3.3
  // ==========================================================================

  /**
   * Analyze relationships between markets within an event
   * Enhanced implementation with comprehensive market relationship parsing
   * Implements Requirements 5.4, 2.5: Market relationship parsing and analysis
   */
  private analyzeMarketRelationships(markets: PolymarketMarket[]): MarketRelationship[] {
    const relationships: MarketRelationship[] = [];
    
    // Enhanced relationship analysis with multiple correlation methods
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const market1 = markets[i];
        const market2 = markets[j];
        
        const relationship = this.analyzeMarketPairEnhanced(market1, market2);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    // Add event-level relationship analysis
    const eventLevelRelationships = this.analyzeEventLevelRelationships(markets);
    relationships.push(...eventLevelRelationships);
    
    // Sort relationships by strength for prioritization
    relationships.sort((a, b) => b.strength - a.strength);
    
    logger.debug(`Analyzed ${relationships.length} market relationships from ${markets.length} markets`);
    
    return relationships;
  }

  /**
   * Enhanced market pair analysis with multiple correlation methods
   * Implements comprehensive relationship detection beyond simple volume correlation
   */
  private analyzeMarketPairEnhanced(market1: PolymarketMarket, market2: PolymarketMarket): MarketRelationship | null {
    // Multi-dimensional correlation analysis
    const volumeCorrelation = this.calculateVolumeCorrelation(market1, market2);
    const questionSimilarity = this.calculateQuestionSimilarity(market1.question, market2.question);
    const temporalCorrelation = this.calculateTemporalCorrelation(market1, market2);
    const liquidityCorrelation = this.calculateLiquidityCorrelation(market1, market2);
    const priceMovementCorrelation = this.calculatePriceMovementCorrelation(market1, market2);
    
    // Weighted correlation score combining multiple factors
    const compositeCorrelation = this.calculateCompositeCorrelation({
      volume: volumeCorrelation,
      question: questionSimilarity,
      temporal: temporalCorrelation,
      liquidity: liquidityCorrelation,
      priceMovement: priceMovementCorrelation,
    });
    
    // Enhanced relationship type determination
    const relationshipType = this.determineRelationshipType(compositeCorrelation, {
      questionSimilarity,
      volumeCorrelation,
      temporalCorrelation,
      priceMovementCorrelation,
    });
    
    const strength = Math.abs(compositeCorrelation);
    
    // Only return relationships with meaningful strength (enhanced threshold)
    if (strength < 0.15) return null;
    
    return {
      market1,
      market2,
      relationshipType,
      strength,
      description: this.generateEnhancedRelationshipDescription(
        relationshipType, 
        strength, 
        market1, 
        market2,
        { questionSimilarity, volumeCorrelation, temporalCorrelation, priceMovementCorrelation }
      ),
    };
  }

  /**
   * Analyze event-level relationships that span multiple markets
   * Implements Requirements 3.1, 3.2: Event-level intelligence considering all constituent markets
   */
  private analyzeEventLevelRelationships(markets: PolymarketMarket[]): MarketRelationship[] {
    const eventRelationships: MarketRelationship[] = [];
    
    // Group markets by similar themes or outcomes
    const marketGroups = this.groupMarketsByTheme(markets);
    
    // Analyze relationships within each group
    for (const group of marketGroups) {
      if (group.markets.length > 1) {
        const groupRelationship = this.analyzeMarketGroup(group);
        if (groupRelationship) {
          eventRelationships.push(groupRelationship);
        }
      }
    }
    
    // Analyze cross-group relationships
    for (let i = 0; i < marketGroups.length; i++) {
      for (let j = i + 1; j < marketGroups.length; j++) {
        const crossGroupRelationship = this.analyzeCrossGroupRelationship(marketGroups[i], marketGroups[j]);
        if (crossGroupRelationship) {
          eventRelationships.push(crossGroupRelationship);
        }
      }
    }
    
    return eventRelationships;
  }



  /**
   * Calculate temporal correlation between two markets
   * Analyzes timing patterns in market activity and lifecycle
   */
  private calculateTemporalCorrelation(market1: PolymarketMarket, market2: PolymarketMarket): number {
    try {
      const start1 = new Date(market1.startDate).getTime();
      const start2 = new Date(market2.startDate).getTime();
      const end1 = new Date(market1.endDate).getTime();
      const end2 = new Date(market2.endDate).getTime();
      
      // Calculate overlap ratio
      const overlapStart = Math.max(start1, start2);
      const overlapEnd = Math.min(end1, end2);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      
      const duration1 = end1 - start1;
      const duration2 = end2 - start2;
      const maxDuration = Math.max(duration1, duration2);
      
      if (maxDuration === 0) return 0;
      
      return overlap / maxDuration;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate liquidity correlation between two markets
   * Analyzes similar liquidity patterns and market depth
   */
  private calculateLiquidityCorrelation(market1: PolymarketMarket, market2: PolymarketMarket): number {
    const liquidity1 = market1.liquidityNum || 0;
    const liquidity2 = market2.liquidityNum || 0;
    
    if (liquidity1 === 0 && liquidity2 === 0) return 1; // Both have no liquidity
    if (liquidity1 === 0 || liquidity2 === 0) return 0; // One has no liquidity
    
    // Calculate liquidity ratio similarity
    const ratio = Math.min(liquidity1, liquidity2) / Math.max(liquidity1, liquidity2);
    
    // Factor in absolute liquidity levels
    const avgLiquidity = (liquidity1 + liquidity2) / 2;
    const liquidityBonus = Math.min(1, avgLiquidity / 1000); // Bonus for higher absolute liquidity
    
    return ratio * (0.7 + 0.3 * liquidityBonus);
  }

  /**
   * Calculate price movement correlation between two markets
   * Analyzes similar price change patterns across time periods
   */
  private calculatePriceMovementCorrelation(market1: PolymarketMarket, market2: PolymarketMarket): number {
    const changes1 = [
      market1.oneDayPriceChange || 0,
      market1.oneWeekPriceChange || 0,
      market1.oneMonthPriceChange || 0,
      market1.oneYearPriceChange || 0,
    ];
    
    const changes2 = [
      market2.oneDayPriceChange || 0,
      market2.oneWeekPriceChange || 0,
      market2.oneMonthPriceChange || 0,
      market2.oneYearPriceChange || 0,
    ];
    
    // Calculate Pearson correlation coefficient
    return this.calculatePearsonCorrelation(changes1, changes2);
  }

  /**
   * Calculate volume correlation between two markets
   * Enhanced implementation with multiple volume metrics
   */
  private calculateVolumeCorrelation(market1: PolymarketMarket, market2: PolymarketMarket): number {
    // Multi-period volume correlation analysis
    const volumes1 = [
      market1.volume24hr || 0,
      market1.volume1wk || 0,
      market1.volume1mo || 0,
      market1.volume1yr || 0,
    ];
    
    const volumes2 = [
      market2.volume24hr || 0,
      market2.volume1wk || 0,
      market2.volume1mo || 0,
      market2.volume1yr || 0,
    ];
    
    // Calculate Pearson correlation for volume patterns
    const correlation = this.calculatePearsonCorrelation(volumes1, volumes2);
    
    // Fallback to simple ratio-based correlation if Pearson fails
    if (isNaN(correlation) || correlation === 0) {
      const vol1 = market1.volumeNum || 0;
      const vol2 = market2.volumeNum || 0;
      
      if (vol1 === 0 && vol2 === 0) return 1; // Both have no volume
      if (vol1 === 0 || vol2 === 0) return 0; // One has no volume
      
      const ratio = Math.min(vol1, vol2) / Math.max(vol1, vol2);
      return ratio; // Simple correlation proxy
    }
    
    return correlation;
  }
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * Calculate composite correlation score from multiple correlation factors
   * Implements weighted combination of different correlation types
   */
  private calculateCompositeCorrelation(correlations: {
    volume: number;
    question: number;
    temporal: number;
    liquidity: number;
    priceMovement: number;
  }): number {
    // Weighted combination based on importance and reliability
    const weights = {
      volume: 0.25,        // Trading activity correlation
      question: 0.30,      // Semantic similarity (most important)
      temporal: 0.15,      // Timing overlap
      liquidity: 0.15,     // Market depth similarity
      priceMovement: 0.15, // Price pattern correlation
    };
    
    return (
      correlations.volume * weights.volume +
      correlations.question * weights.question +
      correlations.temporal * weights.temporal +
      correlations.liquidity * weights.liquidity +
      correlations.priceMovement * weights.priceMovement
    );
  }

  /**
   * Determine relationship type based on enhanced correlation analysis
   */
  private determineRelationshipType(
    compositeCorrelation: number,
    factors: {
      questionSimilarity: number;
      volumeCorrelation: number;
      temporalCorrelation: number;
      priceMovementCorrelation: number;
    }
  ): MarketRelationship['relationshipType'] {
    // High semantic similarity indicates correlated markets
    if (factors.questionSimilarity > 0.6) {
      return 'correlated';
    }
    
    // Strong positive price movement correlation indicates complementary markets
    if (factors.priceMovementCorrelation > 0.5 && compositeCorrelation > 0.4) {
      return 'complementary';
    }
    
    // Strong negative price movement correlation indicates competitive markets
    if (factors.priceMovementCorrelation < -0.3 && Math.abs(compositeCorrelation) > 0.3) {
      return 'competitive';
    }
    
    // High volume correlation with low semantic similarity indicates complementary
    if (factors.volumeCorrelation > 0.6 && factors.questionSimilarity < 0.3) {
      return 'complementary';
    }
    
    // Default to independent if no strong patterns
    return 'independent';
  }

  /**
   * Calculate question similarity between two markets
   */
  private calculateQuestionSimilarity(question1: string, question2: string): number {
    const words1 = new Set(question1.toLowerCase().split(/\s+/));
    const words2 = new Set(question2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Generate enhanced description for market relationship
   * Provides detailed explanation of relationship factors
   */
  private generateEnhancedRelationshipDescription(
    type: MarketRelationship['relationshipType'],
    strength: number,
    market1: PolymarketMarket,
    market2: PolymarketMarket,
    factors: {
      questionSimilarity: number;
      volumeCorrelation: number;
      temporalCorrelation: number;
      priceMovementCorrelation: number;
    }
  ): string {
    const strengthDesc = strength > 0.7 ? 'strong' : strength > 0.4 ? 'moderate' : 'weak';
    
    // Build detailed description based on dominant factors
    const dominantFactors = [];
    if (factors.questionSimilarity > 0.5) dominantFactors.push('semantic similarity');
    if (factors.volumeCorrelation > 0.5) dominantFactors.push('volume patterns');
    if (factors.temporalCorrelation > 0.7) dominantFactors.push('temporal overlap');
    if (Math.abs(factors.priceMovementCorrelation) > 0.4) {
      dominantFactors.push(factors.priceMovementCorrelation > 0 ? 'synchronized price movements' : 'inverse price movements');
    }
    
    const factorDesc = dominantFactors.length > 0 ? ` driven by ${dominantFactors.join(', ')}` : '';
    
    switch (type) {
      case 'correlated':
        return `${strengthDesc} correlation between "${this.truncateQuestion(market1.question)}" and "${this.truncateQuestion(market2.question)}"${factorDesc}`;
      case 'complementary':
        return `${strengthDesc} complementary relationship - markets support each other${factorDesc}`;
      case 'competitive':
        return `${strengthDesc} competitive relationship - markets compete for attention${factorDesc}`;
      case 'independent':
        return `Markets operate independently with minimal interaction${factorDesc}`;
      default:
        return `${strengthDesc} relationship between markets${factorDesc}`;
    }
  }

  /**
   * Truncate question text for display
   */
  private truncateQuestion(question: string, maxLength: number = 50): string {
    return question.length > maxLength ? question.substring(0, maxLength) + '...' : question;
  }

  /**
   * Group markets by theme for event-level analysis
   * Implements Requirements 3.1, 3.2: Multi-market theme identification
   */
  private groupMarketsByTheme(markets: PolymarketMarket[]): MarketGroup[] {
    const groups: MarketGroup[] = [];
    const processedMarkets = new Set<string>();
    
    for (const market of markets) {
      if (processedMarkets.has(market.id)) continue;
      
      const group: MarketGroup = {
        theme: this.extractMarketTheme(market),
        markets: [market],
        dominantKeywords: this.extractKeywordsFromMarket(market),
      };
      
      processedMarkets.add(market.id);
      
      // Find similar markets for this group
      for (const otherMarket of markets) {
        if (processedMarkets.has(otherMarket.id)) continue;
        
        const similarity = this.calculateQuestionSimilarity(market.question, otherMarket.question);
        if (similarity > 0.4) { // Threshold for grouping
          group.markets.push(otherMarket);
          processedMarkets.add(otherMarket.id);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * Extract theme from market question and metadata
   */
  private extractMarketTheme(market: PolymarketMarket): string {
    const question = market.question.toLowerCase();
    
    // Theme extraction patterns
    const themePatterns = [
      { pattern: /election|vote|voting|candidate/, theme: 'Electoral' },
      { pattern: /president|presidential/, theme: 'Presidential' },
      { pattern: /congress|senate|house|legislative/, theme: 'Legislative' },
      { pattern: /court|justice|ruling|judicial/, theme: 'Judicial' },
      { pattern: /policy|legislation|bill|law/, theme: 'Policy' },
      { pattern: /economy|economic|gdp|inflation/, theme: 'Economic' },
      { pattern: /war|conflict|military|foreign/, theme: 'Foreign Policy' },
      { pattern: /crypto|bitcoin|ethereum|blockchain/, theme: 'Cryptocurrency' },
      { pattern: /stock|market|price|trading/, theme: 'Financial Markets' },
    ];
    
    for (const { pattern, theme } of themePatterns) {
      if (pattern.test(question)) {
        return theme;
      }
    }
    
    return 'General';
  }

  /**
   * Extract keywords from individual market
   */
  private extractKeywordsFromMarket(market: PolymarketMarket): string[] {
    const keywords = new Set<string>();
    
    // Extract from question
    const questionWords = market.question.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    questionWords.forEach(word => keywords.add(word));
    
    // Extract from description if available
    if (market.description) {
      const descWords = market.description.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isStopWord(word))
        .slice(0, 10); // Limit description keywords
      
      descWords.forEach(word => keywords.add(word));
    }
    
    return Array.from(keywords).slice(0, 15); // Limit total keywords
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'will', 'be', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
      'this', 'that', 'these', 'those', 'a', 'an', 'as', 'if', 'then', 'than',
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Analyze market group for internal relationships
   */
  private analyzeMarketGroup(group: MarketGroup): MarketRelationship | null {
    if (group.markets.length < 2) return null;
    
    // Create a representative relationship for the group
    const market1 = group.markets[0];
    const market2 = group.markets[1]; // Use first two as representatives
    
    const avgVolume = group.markets.reduce((sum, m) => sum + (m.volumeNum || 0), 0) / group.markets.length;
    const avgLiquidity = group.markets.reduce((sum, m) => sum + (m.liquidityNum || 0), 0) / group.markets.length;
    
    return {
      market1,
      market2,
      relationshipType: 'correlated',
      strength: 0.8, // High strength for grouped markets
      description: `${group.theme} theme group with ${group.markets.length} markets (avg volume: ${avgVolume.toFixed(0)}, avg liquidity: ${avgLiquidity.toFixed(0)})`,
    };
  }

  /**
   * Analyze cross-group relationships
   */
  private analyzeCrossGroupRelationship(group1: MarketGroup, group2: MarketGroup): MarketRelationship | null {
    // Calculate theme similarity
    const themeSimilarity = this.calculateThemeSimilarity(group1.theme, group2.theme);
    
    if (themeSimilarity < 0.3) return null; // Not similar enough
    
    const market1 = group1.markets[0];
    const market2 = group2.markets[0];
    
    return {
      market1,
      market2,
      relationshipType: themeSimilarity > 0.7 ? 'correlated' : 'complementary',
      strength: themeSimilarity,
      description: `Cross-theme relationship between ${group1.theme} and ${group2.theme} groups`,
    };
  }

  /**
   * Calculate similarity between two themes
   */
  private calculateThemeSimilarity(theme1: string, theme2: string): number {
    if (theme1 === theme2) return 1.0;
    
    // Define theme relationships
    const themeRelations: Record<string, string[]> = {
      'Electoral': ['Presidential', 'Legislative', 'Policy'],
      'Presidential': ['Electoral', 'Policy', 'Foreign Policy'],
      'Legislative': ['Electoral', 'Policy', 'Judicial'],
      'Judicial': ['Legislative', 'Policy'],
      'Policy': ['Electoral', 'Presidential', 'Legislative', 'Judicial', 'Economic'],
      'Economic': ['Policy', 'Financial Markets'],
      'Financial Markets': ['Economic', 'Cryptocurrency'],
      'Cryptocurrency': ['Financial Markets'],
      'Foreign Policy': ['Presidential', 'Policy'],
    };
    
    const related = themeRelations[theme1] || [];
    return related.includes(theme2) ? 0.6 : 0.1;
  }

  /**
   * Detect cross-market opportunities within an event
   * Enhanced implementation with comprehensive opportunity analysis
   * Implements Requirements 5.4, 3.3: Cross-market arbitrage and correlation opportunity detection
   */
  private detectCrossMarketOpportunities(
    markets: PolymarketMarket[],
    eventMetrics: EventMetrics
  ): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    // Enhanced arbitrage detection with detailed analysis
    opportunities.push(...this.detectEnhancedArbitrageOpportunities(markets));
    
    // Enhanced hedging opportunities with risk analysis
    opportunities.push(...this.detectEnhancedHedgingOpportunities(markets));
    
    // Enhanced correlation plays with market interaction analysis
    opportunities.push(...this.detectEnhancedCorrelationPlays(markets, eventMetrics));
    
    // New: Detect substitution opportunities
    opportunities.push(...this.detectSubstitutionOpportunities(markets));
    
    // New: Detect complementarity opportunities
    opportunities.push(...this.detectComplementarityOpportunities(markets));
    
    // Sort opportunities by expected return and filter by minimum threshold
    const filteredOpportunities = opportunities
      .filter(opp => opp.expectedReturn > 0.01) // Minimum 1% expected return
      .sort((a, b) => b.expectedReturn - a.expectedReturn)
      .slice(0, 10); // Limit to top 10 opportunities
    
    logger.debug(`Detected ${filteredOpportunities.length} cross-market opportunities from ${opportunities.length} candidates`);
    
    return filteredOpportunities;
  }

  /**
   * Enhanced arbitrage detection with detailed analysis
   * Implements sophisticated price discrepancy analysis
   */
  private detectEnhancedArbitrageOpportunities(markets: PolymarketMarket[]): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    // Look for price discrepancies in related markets
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const market1 = markets[i];
        const market2 = markets[j];
        
        const arbitrageAnalysis = this.analyzeArbitrageOpportunityEnhanced(market1, market2);
        if (arbitrageAnalysis) {
          opportunities.push(arbitrageAnalysis);
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Enhanced arbitrage analysis with risk assessment
   */
  private analyzeArbitrageOpportunityEnhanced(
    market1: PolymarketMarket,
    market2: PolymarketMarket
  ): CrossMarketOpportunity | null {
    try {
      const prices1 = JSON.parse(market1.outcomePrices || '[]') as number[];
      const prices2 = JSON.parse(market2.outcomePrices || '[]') as number[];
      
      if (prices1.length !== 2 || prices2.length !== 2) return null;
      
      const priceDiff = Math.abs(prices1[0] - prices2[0]);
      const avgPrice = (prices1[0] + prices2[0]) / 2;
      
      // Enhanced threshold based on relative price difference
      const relativeThreshold = Math.max(0.03, avgPrice * 0.05); // Minimum 3 cents or 5% of average price
      
      if (priceDiff > relativeThreshold) {
        // Calculate liquidity-adjusted expected return
        const liquidity1 = market1.liquidityNum || 0;
        const liquidity2 = market2.liquidityNum || 0;
        const minLiquidity = Math.min(liquidity1, liquidity2);
        
        // Adjust return based on liquidity constraints
        const liquidityAdjustment = Math.min(1, minLiquidity / 1000); // Reduce return for low liquidity
        const adjustedReturn = priceDiff * 0.7 * liquidityAdjustment; // Conservative estimate with liquidity adjustment
        
        // Assess risk level based on multiple factors
        const riskLevel = this.assessArbitrageRisk(market1, market2, priceDiff, minLiquidity);
        
        return {
          type: 'arbitrage',
          markets: [market1, market2],
          expectedReturn: adjustedReturn,
          riskLevel,
          description: `Price discrepancy of ${(priceDiff * 100).toFixed(1)} cents (${((priceDiff / avgPrice) * 100).toFixed(1)}%) between related markets with ${minLiquidity.toFixed(0)} min liquidity`,
        };
      }
    } catch (error) {
      logger.debug(`Failed to analyze arbitrage opportunity: ${(error as Error).message}`);
    }
    
    return null;
  }

  /**
   * Assess arbitrage risk level based on multiple factors
   */
  private assessArbitrageRisk(
    market1: PolymarketMarket,
    market2: PolymarketMarket,
    priceDiff: number,
    minLiquidity: number
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    // Liquidity risk
    if (minLiquidity < 500) riskScore += 2;
    else if (minLiquidity < 1000) riskScore += 1;
    
    // Price difference risk (very large differences may indicate fundamental differences)
    if (priceDiff > 0.15) riskScore += 2;
    else if (priceDiff > 0.08) riskScore += 1;
    
    // Time to expiry risk
    const timeToExpiry1 = new Date(market1.endDate).getTime() - Date.now();
    const timeToExpiry2 = new Date(market2.endDate).getTime() - Date.now();
    const minTimeToExpiry = Math.min(timeToExpiry1, timeToExpiry2);
    
    if (minTimeToExpiry < 7 * 24 * 60 * 60 * 1000) riskScore += 2; // Less than 7 days
    else if (minTimeToExpiry < 30 * 24 * 60 * 60 * 1000) riskScore += 1; // Less than 30 days
    
    // Competitive score risk (low competitive scores indicate less reliable pricing)
    const avgCompetitive = ((market1.competitive || 0) + (market2.competitive || 0)) / 2;
    if (avgCompetitive < 0.3) riskScore += 2;
    else if (avgCompetitive < 0.5) riskScore += 1;
    
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Enhanced hedging opportunities with comprehensive risk analysis
   */
  private detectEnhancedHedgingOpportunities(markets: PolymarketMarket[]): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    // Group markets by correlation for hedging analysis
    const correlatedGroups = this.findCorrelatedMarketGroups(markets);
    
    for (const group of correlatedGroups) {
      if (group.length >= 2) {
        const hedgeOpportunity = this.analyzeHedgingOpportunity(group);
        if (hedgeOpportunity) {
          opportunities.push(hedgeOpportunity);
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Find groups of correlated markets for hedging analysis
   */
  private findCorrelatedMarketGroups(markets: PolymarketMarket[]): PolymarketMarket[][] {
    const groups: PolymarketMarket[][] = [];
    const processed = new Set<string>();
    
    for (const market of markets) {
      if (processed.has(market.id)) continue;
      
      const correlatedMarkets = [market];
      processed.add(market.id);
      
      for (const otherMarket of markets) {
        if (processed.has(otherMarket.id)) continue;
        
        const correlation = this.calculateQuestionSimilarity(market.question, otherMarket.question);
        if (correlation > 0.4) { // Correlation threshold for hedging
          correlatedMarkets.push(otherMarket);
          processed.add(otherMarket.id);
        }
      }
      
      if (correlatedMarkets.length >= 2) {
        groups.push(correlatedMarkets);
      }
    }
    
    return groups;
  }

  /**
   * Analyze hedging opportunity within a group of correlated markets
   */
  private analyzeHedgingOpportunity(markets: PolymarketMarket[]): CrossMarketOpportunity | null {
    if (markets.length < 2) return null;
    
    // Calculate portfolio diversification benefit
    const avgLiquidity = markets.reduce((sum, m) => sum + (m.liquidityNum || 0), 0) / markets.length;
    
    // Estimate hedging effectiveness based on correlation and liquidity
    const hedgingEffectiveness = Math.min(1, avgLiquidity / 1000) * 0.8; // Max 80% effectiveness
    const expectedReturn = hedgingEffectiveness * 0.02; // Conservative hedging return
    
    // Assess risk level based on market characteristics
    const riskLevel = this.assessHedgingRisk(markets);
    
    return {
      type: 'hedge',
      markets: markets.slice(0, 3), // Limit to 3 markets for practical hedging
      expectedReturn,
      riskLevel,
      description: `Hedging portfolio with ${markets.length} correlated markets (${hedgingEffectiveness.toFixed(1)}% effectiveness, avg liquidity: ${avgLiquidity.toFixed(0)})`,
    };
  }

  /**
   * Assess hedging risk level
   */
  private assessHedgingRisk(markets: PolymarketMarket[]): 'low' | 'medium' | 'high' {
    const avgLiquidity = markets.reduce((sum, m) => sum + (m.liquidityNum || 0), 0) / markets.length;
    const avgCompetitive = markets.reduce((sum, m) => sum + (m.competitive || 0), 0) / markets.length;
    
    if (avgLiquidity > 1000 && avgCompetitive > 0.6) return 'low';
    if (avgLiquidity > 500 && avgCompetitive > 0.4) return 'medium';
    return 'high';
  }

  /**
   * Enhanced correlation plays with market interaction analysis
   */
  private detectEnhancedCorrelationPlays(
    markets: PolymarketMarket[],
    eventMetrics: EventMetrics
  ): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    // Analyze each correlation for trading opportunities
    for (const correlation of eventMetrics.priceCorrelations) {
      if (Math.abs(correlation.correlationCoefficient) > 0.5) {
        const market1 = markets.find(m => m.id === correlation.market1Id);
        const market2 = markets.find(m => m.id === correlation.market2Id);
        
        if (market1 && market2) {
          const correlationPlay = this.analyzeCorrelationPlay(market1, market2, correlation);
          if (correlationPlay) {
            opportunities.push(correlationPlay);
          }
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Analyze correlation play opportunity
   */
  private analyzeCorrelationPlay(
    market1: PolymarketMarket,
    market2: PolymarketMarket,
    correlation: { correlationCoefficient: number; correlationType: 'positive' | 'negative' | 'neutral' }
  ): CrossMarketOpportunity | null {
    const volumeRatio = (market1.volumeNum || 0) / (market2.volumeNum || 1);
    const liquidityRatio = (market1.liquidityNum || 0) / (market2.liquidityNum || 1);
    
    // Look for significant imbalances that could be exploited
    const volumeImbalance = Math.abs(Math.log(volumeRatio));
    const liquidityImbalance = Math.abs(Math.log(liquidityRatio));
    
    if (volumeImbalance > 0.5 || liquidityImbalance > 0.5) { // Significant imbalance
      const expectedReturn = Math.abs(correlation.correlationCoefficient) * Math.min(volumeImbalance, liquidityImbalance) * 0.02;
      
      return {
        type: 'correlation_play',
        markets: [market1, market2],
        expectedReturn,
        riskLevel: 'medium',
        description: `${correlation.correlationType} correlation play (${(correlation.correlationCoefficient * 100).toFixed(0)}%) with volume imbalance (${volumeRatio.toFixed(1)}x)`,
      };
    }
    
    return null;
  }

  /**
   * Detect substitution opportunities between similar markets
   * New opportunity type for markets that serve similar functions
   */
  private detectSubstitutionOpportunities(markets: PolymarketMarket[]): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const market1 = markets[i];
        const market2 = markets[j];
        
        const substitutionOpportunity = this.analyzeSubstitutionOpportunity(market1, market2);
        if (substitutionOpportunity) {
          opportunities.push(substitutionOpportunity);
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Analyze substitution opportunity between two similar markets
   */
  private analyzeSubstitutionOpportunity(
    market1: PolymarketMarket,
    market2: PolymarketMarket
  ): CrossMarketOpportunity | null {
    const questionSimilarity = this.calculateQuestionSimilarity(market1.question, market2.question);
    
    // High similarity suggests substitution potential
    if (questionSimilarity > 0.7) {
      try {
        const prices1 = JSON.parse(market1.outcomePrices || '[]') as number[];
        const prices2 = JSON.parse(market2.outcomePrices || '[]') as number[];
        
        if (prices1.length >= 2 && prices2.length >= 2) {
          const priceDiff = Math.abs(prices1[0] - prices2[0]);
          const liquidityDiff = Math.abs((market1.liquidityNum || 0) - (market2.liquidityNum || 0));
          
          // Substitution opportunity exists if similar markets have different pricing or liquidity
          if (priceDiff > 0.05 || liquidityDiff > 500) {
            return {
              type: 'arbitrage', // Classify as arbitrage since it's price-based
              markets: [market1, market2],
              expectedReturn: priceDiff * 0.5, // Conservative estimate for substitution
              riskLevel: 'medium',
              description: `Substitution opportunity between highly similar markets (${(questionSimilarity * 100).toFixed(0)}% similarity, ${(priceDiff * 100).toFixed(1)}¢ price diff)`,
            };
          }
        }
      } catch {
        // Skip if price parsing fails
      }
    }
    
    return null;
  }

  /**
   * Detect complementarity opportunities between markets that enhance each other
   */
  private detectComplementarityOpportunities(markets: PolymarketMarket[]): CrossMarketOpportunity[] {
    const opportunities: CrossMarketOpportunity[] = [];
    
    // Look for markets that could be combined for enhanced returns
    const marketGroups = this.groupMarketsByTheme(markets);
    
    for (const group of marketGroups) {
      if (group.markets.length >= 2) {
        const complementarityOpportunity = this.analyzeComplementarityOpportunity(group);
        if (complementarityOpportunity) {
          opportunities.push(complementarityOpportunity);
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Analyze complementarity opportunity within a market group
   */
  private analyzeComplementarityOpportunity(group: MarketGroup): CrossMarketOpportunity | null {
    const markets = group.markets;
    
    // Calculate potential for portfolio enhancement
    const avgCompetitive = markets.reduce((sum, m) => sum + (m.competitive || 0), 0) / markets.length;
    
    // Complementarity works best with diverse but related markets
    if (markets.length >= 2 && markets.length <= 4 && avgCompetitive > 0.4) {
      const diversificationBenefit = Math.min(0.03, markets.length * 0.008); // Up to 3% benefit
      
      return {
        type: 'hedge', // Classify as hedge since it's diversification-based
        markets: markets.slice(0, 4), // Limit to 4 markets
        expectedReturn: diversificationBenefit,
        riskLevel: 'low',
        description: `Complementarity portfolio in ${group.theme} theme with ${markets.length} markets (diversification benefit: ${(diversificationBenefit * 100).toFixed(1)}%)`,
      };
    }
    
    return null;
  }



  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Determine the primary market for the event
   */
  private determinePrimaryMarket(event: PolymarketEvent, primaryMarketId?: string): PolymarketMarket {
    if (primaryMarketId) {
      const specifiedMarket = event.markets.find(m => m.id === primaryMarketId);
      if (specifiedMarket) return specifiedMarket;
    }
    
    // Default to market with highest volume
    return event.markets.reduce((max, market) => 
      (market.volumeNum || 0) > (max.volumeNum || 0) ? market : max
    );
  }

  /**
   * Filter markets based on quality thresholds
   */
  private filterQualifiedMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
    return markets.filter(market => 
      (market.liquidityNum || 0) >= this.config.qualityThresholds.minLiquidity &&
      (market.competitive || 0) >= this.config.qualityThresholds.minCompetitive &&
      (market.volumeNum || 0) >= this.config.qualityThresholds.minVolume
    );
  }

  /**
   * Calculate price correlations between markets
   */
  private calculatePriceCorrelations(markets: PolymarketMarket[]) {
    const correlations = [];
    
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const correlation = this.calculateVolumeCorrelation(markets[i], markets[j]);
        
        correlations.push({
          market1Id: markets[i].id,
          market2Id: markets[j].id,
          correlationCoefficient: correlation,
          correlationType: (correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
        });
      }
    }
    
    return correlations;
  }

  /**
   * Classify event type based on event data
   */
  private classifyEventType(event: PolymarketEvent): EventType {
    const title = event.title.toLowerCase();
    const description = event.description.toLowerCase();
    const text = `${title} ${description}`;

    if (text.includes('election') || text.includes('vote') || text.includes('presidential')) {
      return 'election';
    }
    if (text.includes('policy') || text.includes('law') || text.includes('legislation')) {
      return 'policy';
    }
    if (text.includes('court') || text.includes('ruling') || text.includes('supreme')) {
      return 'court';
    }
    if (text.includes('war') || text.includes('conflict') || text.includes('treaty')) {
      return 'geopolitical';
    }
    if (text.includes('gdp') || text.includes('inflation') || text.includes('economy') || 
        text.includes('bitcoin') || text.includes('stock') || text.includes('price')) {
      return 'economic';
    }

    return 'other';
  }

  /**
   * Calculate current probability from market data
   */
  private calculateCurrentProbability(market: PolymarketMarket): number {
    try {
      const prices = JSON.parse(market.outcomePrices || '[]') as number[];
      if (prices.length >= 2) {
        return prices[0]; // Assume first outcome is "YES"
      }
    } catch {
      // Fall back to last trade price or default
    }
    
    return market.lastTradePrice || 0.5;
  }

  /**
   * Calculate liquidity score for the market
   */
  private calculateLiquidityScore(market: PolymarketMarket, eventMetrics: EventMetrics): number {
    const liquidity = market.liquidityNum || 0;
    const eventAvgLiquidity = eventMetrics.totalLiquidity / eventMetrics.marketCount;
    
    // Score relative to event average, normalized to 0-10 scale
    const relativeScore = eventAvgLiquidity > 0 ? (liquidity / eventAvgLiquidity) : 1;
    return Math.min(10, Math.log10(liquidity + 1) * 2 * relativeScore);
  }

  /**
   * Estimate bid-ask spread from market data
   */
  private estimateBidAskSpread(market: PolymarketMarket): number {
    if (market.bestBid && market.bestAsk) {
      return (market.bestAsk - market.bestBid) * 100; // in cents
    }
    
    // Estimate based on competitive score
    const competitive = market.competitive || 0.5;
    return (1 - competitive) * 10; // Higher competitive = lower spread
  }

  /**
   * Determine volatility regime from volume trend analysis
   */
  private determineVolatilityRegime(volumeTrend: VolumeTrendAnalysis): VolatilityRegime {
    if (volumeTrend.volatilityScore > 0.7) return 'high';
    if (volumeTrend.volatilityScore > 0.3) return 'medium';
    return 'low';
  }

  /**
   * Generate enhanced metadata with event-level intelligence
   * Implements Requirements 3.1, 3.2, 3.3: Event-level intelligence integration
   */
  private generateEnhancedMetadata(
    event: PolymarketEvent,
    eventMetrics: EventMetrics,
    marketRelationships: MarketRelationship[],
    crossMarketOpportunities: CrossMarketOpportunity[]
  ): EnhancedEventMetadata {
    // Extract catalysts from event and market data
    const eventCatalysts = this.extractEventCatalysts(event);
    const marketCatalysts = this.extractMarketCatalysts(event.markets);
    
    // Determine political category and themes
    const politicalCategory = this.determinePoliticalCategory(event);
    const subCategories = this.extractSubCategories(event);
    const eventThemes = this.extractEventThemes(event);
    
    // Find dominant market and opportunities
    const dominantMarketId = eventMetrics.volumeDistribution
      .reduce((max, dist) => dist.volumePercentage > max.volumePercentage ? dist : max)
      .marketId;
    
    const opportunityMarkets = crossMarketOpportunities
      .flatMap(opp => opp.markets.map(m => m.id))
      .filter((id, index, arr) => arr.indexOf(id) === index); // Deduplicate

    // Generate event-level intelligence insights
    const eventIntelligence = this.generateEventIntelligence(
      event,
      eventMetrics,
      marketRelationships,
      crossMarketOpportunities
    );

    return {
      // Original metadata structure
      ambiguityFlags: this.detectAmbiguityFlags(event.description),
      keyCatalysts: eventCatalysts.map(catalyst => ({
        event: catalyst.event,
        timestamp: catalyst.timestamp,
      })),
      
      // Event-specific metadata
      eventId: event.id,
      eventTitle: event.title,
      eventDescription: event.description,
      marketIds: event.markets.map(m => m.id),
      
      // Enhanced catalysts from event analysis
      eventCatalysts,
      marketCatalysts,
      
      // Tag-derived information
      politicalCategory,
      subCategories,
      eventThemes,
      
      // Cross-market information
      marketRelationships,
      dominantMarketId,
      opportunityMarkets,
      
      // Event-level intelligence integration
      eventIntelligence,
    };
  }

  /**
   * Generate comprehensive event-level intelligence
   * Implements Requirements 3.1, 3.2, 3.3: Event-level intelligence considering all constituent markets
   */
  private generateEventIntelligence(
    event: PolymarketEvent,
    eventMetrics: EventMetrics,
    marketRelationships: MarketRelationship[],
    crossMarketOpportunities: CrossMarketOpportunity[]
  ): EventIntelligence {
    // Generate event-level insights
    const eventLevelInsights = this.generateEventLevelInsights(event, eventMetrics);
    
    // Identify cross-market patterns
    const crossMarketPatterns = this.identifyCrossMarketPatterns(marketRelationships, eventMetrics);
    
    // Assess event-level risk factors
    const riskFactors = this.assessEventLevelRiskFactors(event, eventMetrics, marketRelationships);
    
    // Identify opportunity areas
    const opportunityAreas = this.identifyOpportunityAreas(crossMarketOpportunities);
    
    // Analyze market interactions
    const marketInteractions = this.analyzeMarketInteractions(marketRelationships);
    
    return {
      eventLevelInsights,
      crossMarketPatterns,
      riskFactors,
      opportunityAreas,
      marketInteractions,
    };
  }

  /**
   * Generate event-level insights from comprehensive analysis
   */
  private generateEventLevelInsights(event: PolymarketEvent, eventMetrics: EventMetrics): string[] {
    const insights: string[] = [];
    
    // Volume concentration insights
    const volumeConcentration = this.calculateVolumeConcentration(eventMetrics.volumeDistribution);
    if (volumeConcentration > 0.7) {
      insights.push(`High volume concentration (${(volumeConcentration * 100).toFixed(0)}%) indicates dominant market within event`);
    } else if (volumeConcentration < 0.3) {
      insights.push(`Low volume concentration (${(volumeConcentration * 100).toFixed(0)}%) indicates balanced market participation`);
    }
    
    // Market count insights
    if (eventMetrics.marketCount > 10) {
      insights.push(`Large event with ${eventMetrics.marketCount} markets suggests complex multi-faceted outcome space`);
    } else if (eventMetrics.marketCount <= 3) {
      insights.push(`Focused event with ${eventMetrics.marketCount} markets suggests clear outcome alternatives`);
    }
    
    // Activity level insights
    const activityRatio = eventMetrics.activeMarketCount / eventMetrics.marketCount;
    if (activityRatio < 0.5) {
      insights.push(`Low activity ratio (${(activityRatio * 100).toFixed(0)}%) suggests selective market engagement`);
    } else if (activityRatio > 0.9) {
      insights.push(`High activity ratio (${(activityRatio * 100).toFixed(0)}%) suggests broad market engagement`);
    }
    
    // Competitive landscape insights
    if (eventMetrics.averageCompetitive > 0.7) {
      insights.push(`High average competitive score (${eventMetrics.averageCompetitive.toFixed(2)}) indicates efficient price discovery`);
    } else if (eventMetrics.averageCompetitive < 0.4) {
      insights.push(`Low average competitive score (${eventMetrics.averageCompetitive.toFixed(2)}) suggests potential pricing inefficiencies`);
    }
    
    return insights.slice(0, 5); // Limit to top 5 insights
  }

  /**
   * Calculate volume concentration using Herfindahl-Hirschman Index
   */
  private calculateVolumeConcentration(volumeDistribution: { volumePercentage: number }[]): number {
    return volumeDistribution.reduce((sum, dist) => {
      const share = dist.volumePercentage / 100;
      return sum + (share * share);
    }, 0);
  }

  /**
   * Identify cross-market patterns from relationship analysis
   */
  private identifyCrossMarketPatterns(
    marketRelationships: MarketRelationship[],
    eventMetrics: EventMetrics
  ): string[] {
    const patterns: string[] = [];
    
    // Relationship type distribution
    const relationshipTypes = marketRelationships.reduce((acc, rel) => {
      acc[rel.relationshipType] = (acc[rel.relationshipType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalRelationships = marketRelationships.length;
    
    for (const [type, count] of Object.entries(relationshipTypes)) {
      const percentage = (count / totalRelationships) * 100;
      if (percentage > 30) {
        patterns.push(`Dominant ${type} relationships (${percentage.toFixed(0)}%) suggest ${this.getRelationshipImplication(type)}`);
      }
    }
    
    // Correlation strength patterns
    const strongCorrelations = eventMetrics.priceCorrelations.filter(corr => Math.abs(corr.correlationCoefficient) > 0.6);
    if (strongCorrelations.length > eventMetrics.marketCount * 0.3) {
      patterns.push(`High correlation density (${strongCorrelations.length} strong correlations) indicates interconnected market dynamics`);
    }
    
    return patterns;
  }

  /**
   * Get implication text for relationship type
   */
  private getRelationshipImplication(relationshipType: string): string {
    switch (relationshipType) {
      case 'correlated': return 'synchronized market movements and shared risk factors';
      case 'complementary': return 'markets that enhance each other and provide diversification benefits';
      case 'competitive': return 'markets competing for attention and capital allocation';
      case 'independent': return 'isolated market dynamics with minimal cross-impact';
      default: return 'complex market interdependencies';
    }
  }

  /**
   * Assess event-level risk factors
   */
  private assessEventLevelRiskFactors(
    event: PolymarketEvent,
    eventMetrics: EventMetrics,
    marketRelationships: MarketRelationship[]
  ): string[] {
    const riskFactors: string[] = [];
    
    // Liquidity concentration risk
    const liquidityConcentration = this.calculateLiquidityConcentration(eventMetrics);
    if (liquidityConcentration > 0.8) {
      riskFactors.push('High liquidity concentration creates single-point-of-failure risk');
    }
    
    // Time horizon risk
    const avgTimeToExpiry = this.calculateAverageTimeToExpiry(event.markets);
    if (avgTimeToExpiry < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
      riskFactors.push('Short time horizon increases execution and timing risks');
    }
    
    // Correlation risk
    const highCorrelationCount = marketRelationships.filter(rel => rel.strength > 0.7).length;
    if (highCorrelationCount > eventMetrics.marketCount * 0.5) {
      riskFactors.push('High correlation between markets increases systemic risk exposure');
    }
    
    // Resolution source risk
    if (event.resolutionSource.toLowerCase().includes('subjective') || 
        event.resolutionSource.toLowerCase().includes('opinion')) {
      riskFactors.push('Subjective resolution criteria increase interpretation and dispute risks');
    }
    
    return riskFactors;
  }

  /**
   * Calculate liquidity concentration
   */
  private calculateLiquidityConcentration(eventMetrics: EventMetrics): number {
    return eventMetrics.volumeDistribution.reduce((sum, dist) => {
      const share = dist.liquidityPercentage / 100;
      return sum + (share * share);
    }, 0);
  }

  /**
   * Calculate average time to expiry across markets
   */
  private calculateAverageTimeToExpiry(markets: PolymarketMarket[]): number {
    const now = Date.now();
    const timeToExpiries = markets.map(market => {
      try {
        return new Date(market.endDate).getTime() - now;
      } catch {
        return 0;
      }
    });
    
    return timeToExpiries.reduce((sum, time) => sum + time, 0) / timeToExpiries.length;
  }

  /**
   * Identify opportunity areas from cross-market analysis
   */
  private identifyOpportunityAreas(
    crossMarketOpportunities: CrossMarketOpportunity[]
  ): string[] {
    const opportunityAreas: string[] = [];
    
    // Arbitrage opportunities
    const arbitrageOpps = crossMarketOpportunities.filter(opp => opp.type === 'arbitrage');
    if (arbitrageOpps.length > 0) {
      const avgReturn = arbitrageOpps.reduce((sum, opp) => sum + opp.expectedReturn, 0) / arbitrageOpps.length;
      opportunityAreas.push(`${arbitrageOpps.length} arbitrage opportunities with ${(avgReturn * 100).toFixed(1)}% average expected return`);
    }
    
    // Hedging opportunities
    const hedgeOpps = crossMarketOpportunities.filter(opp => opp.type === 'hedge');
    if (hedgeOpps.length > 0) {
      opportunityAreas.push(`${hedgeOpps.length} hedging opportunities for risk management and portfolio diversification`);
    }
    
    // Correlation plays
    const correlationOpps = crossMarketOpportunities.filter(opp => opp.type === 'correlation_play');
    if (correlationOpps.length > 0) {
      opportunityAreas.push(`${correlationOpps.length} correlation plays leveraging market relationship patterns`);
    }
    
    return opportunityAreas;
  }

  /**
   * Analyze market interactions within the event
   */
  private analyzeMarketInteractions(
    marketRelationships: MarketRelationship[]
  ): MarketInteraction[] {
    const interactions: MarketInteraction[] = [];
    
    // Convert relationships to interactions
    for (const relationship of marketRelationships) {
      const interaction: MarketInteraction = {
        markets: [relationship.market1.id, relationship.market2.id],
        interactionType: this.mapRelationshipToInteraction(relationship.relationshipType),
        strength: relationship.strength,
        description: relationship.description,
        implications: this.generateInteractionImplications(relationship),
      };
      
      interactions.push(interaction);
    }
    
    return interactions.slice(0, 10); // Limit to top 10 interactions
  }

  /**
   * Map relationship type to interaction type
   */
  private mapRelationshipToInteraction(
    relationshipType: MarketRelationship['relationshipType']
  ): MarketInteraction['interactionType'] {
    switch (relationshipType) {
      case 'correlated': return 'causality';
      case 'complementary': return 'complementarity';
      case 'competitive': return 'substitution';
      case 'independent': return 'independence';
      default: return 'independence';
    }
  }

  /**
   * Generate implications for market interaction
   */
  private generateInteractionImplications(relationship: MarketRelationship): string[] {
    const implications: string[] = [];
    
    switch (relationship.relationshipType) {
      case 'correlated':
        implications.push('Price movements likely to be synchronized');
        implications.push('Shared risk factors and catalysts');
        implications.push('Portfolio concentration risk if both positions taken');
        break;
      case 'complementary':
        implications.push('Markets enhance each other\'s value proposition');
        implications.push('Diversification benefits in portfolio construction');
        implications.push('Cross-market hedging opportunities');
        break;
      case 'competitive':
        implications.push('Markets compete for trader attention and capital');
        implications.push('Inverse relationship in volume and interest');
        implications.push('Potential for relative value trades');
        break;
      case 'independent':
        implications.push('Markets operate with minimal cross-impact');
        implications.push('Independent risk and return profiles');
        implications.push('True diversification benefits');
        break;
    }
    
    return implications;
  }

  /**
   * Extract event-level catalysts
   */
  private extractEventCatalysts(event: PolymarketEvent): EventCatalyst[] {
    const catalysts: EventCatalyst[] = [];
    
    // Add event creation as catalyst
    catalysts.push({
      event: 'Event created',
      timestamp: new Date(event.createdAt).getTime(),
      source: 'polymarket_event',
      impact: 'medium',
      affectedMarkets: event.markets.map(m => m.id),
      eventId: event.id,
    });
    
    // Add event end date as catalyst
    catalysts.push({
      event: 'Event resolution deadline',
      timestamp: new Date(event.endDate).getTime(),
      source: 'polymarket_event',
      impact: 'high',
      affectedMarkets: event.markets.map(m => m.id),
      eventId: event.id,
    });
    
    return catalysts;
  }

  /**
   * Extract market-specific catalysts
   */
  private extractMarketCatalysts(markets: PolymarketMarket[]): MarketCatalyst[] {
    const catalysts: MarketCatalyst[] = [];
    
    for (const market of markets) {
      // Add market end date as catalyst
      catalysts.push({
        marketId: market.id,
        catalyst: 'Market resolution deadline',
        timestamp: new Date(market.endDate).getTime(),
        source: 'market_specific',
        impact: 'high',
      });
    }
    
    return catalysts;
  }

  /**
   * Determine political category from event data
   */
  private determinePoliticalCategory(event: PolymarketEvent): string {
    const politicalTags = event.tags.filter(tag => 
      tag.label.toLowerCase().includes('politic') ||
      tag.label.toLowerCase().includes('election') ||
      tag.label.toLowerCase().includes('government')
    );
    
    if (politicalTags.length > 0) {
      return politicalTags[0].label;
    }
    
    return 'General Political';
  }

  /**
   * Extract subcategories from event tags and content
   */
  private extractSubCategories(event: PolymarketEvent): string[] {
    return event.tags.map(tag => tag.label).slice(0, 5); // Limit to 5 subcategories
  }

  /**
   * Extract event themes from title and description
   */
  private extractEventThemes(event: PolymarketEvent): string[] {
    const themes: string[] = [];
    const text = `${event.title} ${event.description}`.toLowerCase();
    
    const themePatterns = [
      { pattern: /election|vote|voting/, theme: 'Electoral Process' },
      { pattern: /president|presidential/, theme: 'Presidential Politics' },
      { pattern: /congress|senate|house/, theme: 'Legislative Politics' },
      { pattern: /court|justice|ruling/, theme: 'Judicial Politics' },
      { pattern: /policy|legislation|bill/, theme: 'Policy Making' },
      { pattern: /economy|economic|gdp/, theme: 'Economic Policy' },
      { pattern: /war|conflict|military/, theme: 'Foreign Policy' },
    ];
    
    for (const { pattern, theme } of themePatterns) {
      if (pattern.test(text)) {
        themes.push(theme);
      }
    }
    
    return themes.slice(0, 3); // Limit to 3 themes
  }

  /**
   * Detect ambiguity flags in text
   */
  private detectAmbiguityFlags(text: string): string[] {
    const flags: string[] = [];
    const ambiguousTerms = ['may', 'might', 'could', 'possibly', 'unclear', 'ambiguous'];
    
    for (const term of ambiguousTerms) {
      if (text.toLowerCase().includes(term)) {
        flags.push(`Contains ambiguous term: "${term}"`);
      }
    }
    
    return flags;
  }
}