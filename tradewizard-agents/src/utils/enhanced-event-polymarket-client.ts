/**
 * Enhanced Event-Based Polymarket Client
 *
 * This module provides comprehensive Polymarket events API integration with proper
 * endpoint usage, multi-market data handling, and event-centric analysis capabilities.
 * It replaces the market-centric approach with event-based discovery that leverages
 * Polymarket's event structure containing multiple related markets.
 * 
 * Features:
 * - Comprehensive error handling with circuit breaker pattern
 * - Advanced rate limiting with token bucket algorithm
 * - Exponential backoff with jitter for retries
 * - Fallback mechanisms for API unavailability
 * - Graceful degradation and cached data fallback
 */

import type { EngineConfig } from '../config/index.js';
import { getLogger } from './logger.js';
import {
  validatePolymarketEvent,
  validatePolymarketEvents,
  validatePolymarketMarket,
  type EventValidationResult,
  type EventParsingOptions,
  type ValidatedPolymarketEvent,
  type ValidatedEventsApiResponse,
} from './enhanced-event-validation.js';

// ============================================================================
// Enhanced Event Data Models
// ============================================================================

/**
 * Polymarket Event with nested markets (matches actual API response structure)
 */
export interface PolymarketEvent {
  // Core Event Data
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  resolutionSource: string;
  
  // Event Status
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  
  // Temporal Data
  startDate: string;
  creationDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  
  // Event Metrics (aggregated from all markets)
  liquidity: number;
  volume: number;
  openInterest: number;
  competitive: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  
  // Event Configuration
  enableOrderBook: boolean;
  liquidityClob: number;
  negRisk: boolean;
  negRiskMarketID?: string;
  commentCount: number;
  
  // Visual Elements
  image?: string;
  icon?: string;
  
  // Nested Markets (key difference from individual market approach)
  markets: PolymarketMarket[];
  
  // Event Tags and Classification
  tags: PolymarketTag[];
  
  // Event-Specific Configuration
  cyom: boolean;
  showAllOutcomes: boolean;
  showMarketImages: boolean;
  enableNegRisk: boolean;
  automaticallyActive: boolean;
  gmpChartMode: string;
  negRiskAugmented: boolean;
  cumulativeMarkets: boolean;
  pendingDeployment: boolean;
  deploying: boolean;
  requiresTranslation: boolean;
}

/**
 * Polymarket Market within event context
 */
export interface PolymarketMarket {
  // Core Market Data
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  resolutionSource: string;
  
  // Market Status
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  
  // Financial Data
  liquidity?: string;
  liquidityNum?: number;
  volume: string;
  volumeNum: number;
  volume24hr?: number;
  volume1wk?: number;
  volume1mo?: number;
  volume1yr?: number;
  
  // Pricing Data
  outcomes: string;  // JSON array as string
  outcomePrices: string;  // JSON array as string
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  
  // Price Changes
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  oneMonthPriceChange?: number;
  oneYearPriceChange?: number;
  
  // Market Quality Metrics
  competitive?: number;
  
  // Temporal Data
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  closedTime?: string;
  
  // Market Maker and Trading
  marketMakerAddress: string;
  submitted_by: string;
  resolvedBy?: string;
  
  // Group/Series Information (for event context)
  groupItemTitle?: string;
  groupItemThreshold?: string;
  
  // UMA Resolution
  questionID?: string;
  umaEndDate?: string;
  umaResolutionStatus?: string;
  umaResolutionStatuses?: string;
  umaBond?: string;
  umaReward?: string;
  
  // Trading Configuration
  enableOrderBook: boolean;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  acceptingOrders?: boolean;
  acceptingOrdersTimestamp?: string;
  
  // CLOB Token Information
  clobTokenIds?: string;
  liquidityClob?: number;
  volumeClob?: number;
  volume24hrClob?: number;
  volume1wkClob?: number;
  volume1moClob?: number;
  volume1yrClob?: number;
  
  // Additional Configuration
  customLiveness?: number;
  negRisk: boolean;
  negRiskRequestID?: string;
  negRiskMarketID?: string;
  ready: boolean;
  funded: boolean;
  cyom: boolean;
  pagerDutyNotificationEnabled: boolean;
  approved: boolean;
  rewardsMinSize?: number;
  rewardsMaxSpread?: number;
  automaticallyResolved?: boolean;
  automaticallyActive: boolean;
  clearBookOnStart: boolean;
  seriesColor: string;
  showGmpSeries: boolean;
  showGmpOutcome: boolean;
  manualActivation: boolean;
  negRiskOther: boolean;
  pendingDeployment: boolean;
  deploying: boolean;
  deployingTimestamp?: string;
  rfqEnabled: boolean;
  holdingRewardsEnabled: boolean;
  feesEnabled: boolean;
  requiresTranslation: boolean;
  
  // Visual Elements
  image?: string;
  icon?: string;
  
  // Date Helpers
  endDateIso?: string;
  startDateIso?: string;
  hasReviewedDates?: boolean;
}

/**
 * Polymarket Tag for event classification
 */
export interface PolymarketTag {
  id: number;
  label: string;
  slug: string;
  forceShow?: boolean;
  forceHide?: boolean;
  publishedAt?: string;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
  isCarousel?: boolean;
  requiresTranslation: boolean;
}

/**
 * Event discovery options for API calls
 */
export interface EventDiscoveryOptions {
  tagId?: number;
  relatedTags?: boolean;
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  startDateMin?: string;
  startDateMax?: string;
  endDateMin?: string;
  endDateMax?: string;
  sortBy?: 'volume24hr' | 'liquidity' | 'competitive' | 'createdAt' | 'id';
  sortOrder?: 'asc' | 'desc';
  archived?: boolean;
  featured?: boolean;
  order?: string;
  ascending?: boolean;
}

/**
 * Tag filtering options
 */
export interface TagFilterOptions {
  relatedTags?: boolean;
  excludeTagId?: number;
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
}

/**
 * Event with enhanced market analysis
 */
export interface EventWithMarkets {
  event: PolymarketEvent;
  markets: PolymarketMarket[];
  crossMarketCorrelations: MarketCorrelation[];
  eventLevelMetrics: EventMetrics;
}

/**
 * Market correlation analysis
 */
export interface MarketCorrelation {
  market1Id: string;
  market2Id: string;
  correlationCoefficient: number;
  correlationType: 'positive' | 'negative' | 'neutral';
}

/**
 * Event-level aggregated metrics
 */
export interface EventMetrics {
  totalVolume: number;
  totalLiquidity: number;
  averageCompetitive: number;
  marketCount: number;
  activeMarketCount: number;
  volumeDistribution: MarketVolumeDistribution[];
  priceCorrelations: MarketCorrelation[];
}

/**
 * Market volume distribution within event
 */
export interface MarketVolumeDistribution {
  marketId: string;
  volumePercentage: number;
  liquidityPercentage: number;
}

/**
 * API health status
 */
export interface ApiHealthStatus {
  healthy: boolean;
  responseTime: number;
  timestamp: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  tokensRemaining: number;
  resetTime: number;
  requestsInWindow: number;
  windowSizeMs: number;
}

/**
 * Circuit breaker state
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  monitoringPeriod: number;
  successThreshold: number;
  volumeThreshold: number;
}

/**
 * Circuit breaker statistics
 */
interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  failureRate: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  halfOpenCalls: number;
  halfOpenSuccesses: number;
  stateChangeTime: number;
  timeSinceLastStateChange: number;
}

/**
 * Rate limiter state using token bucket algorithm
 */
interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

/**
 * Enhanced rate limiter configuration
 */
interface EnhancedRateLimiterConfig {
  capacity: number;
  refillRate: number;
  burstMultiplier: number;
  adaptiveRefill: boolean;
  throttleThreshold: number;
}

/**
 * Request execution result
 */
interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  fromFallback: boolean;
  circuitState: CircuitState;
  retryAfter?: number;
}

/**
 * Fallback data provider function type
 */
type FallbackProvider<T> = () => Promise<T>;

/**
 * Call history entry for failure rate calculation
 */
interface CallHistoryEntry {
  timestamp: number;
  success: boolean;
}

// ============================================================================
// Enhanced Event-Based Polymarket Client
// ============================================================================

export class EnhancedEventPolymarketClient {
  private readonly gammaApiUrl: string;
  private readonly clobApiUrl: string;
  private readonly rateLimitBuffer: number;
  private readonly politicsTagId: number;
  private readonly logger;

  // Enhanced circuit breaker state
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private lastFailureTime = 0;
  private stateChangeTime = Date.now();
  private halfOpenCalls = 0;
  private halfOpenSuccesses = 0;
  private callHistory: CallHistoryEntry[] = [];

  // Circuit breaker configuration
  private readonly circuitBreakerConfig: CircuitBreakerConfig;

  // Enhanced rate limiter state (token bucket algorithm)
  private rateLimiter: RateLimiterState;
  private readonly rateLimiterConfig: EnhancedRateLimiterConfig;
  private usageHistory: number[] = [];
  private adaptiveRefillRate: number;
  private burstCapacity: number;

  // Fallback cache for graceful degradation
  private fallbackCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly cacheTTL: number;

  constructor(config: EngineConfig['polymarket']) {
    this.gammaApiUrl = config.gammaApiUrl;
    this.clobApiUrl = config.clobApiUrl;
    this.rateLimitBuffer = config.rateLimitBuffer;
    this.politicsTagId = config.politicsTagId;
    this.cacheTTL = config.eventCacheTTL * 1000; // Convert to milliseconds
    this.logger = getLogger();

    // Initialize circuit breaker configuration
    this.circuitBreakerConfig = {
      failureThreshold: config.circuitBreakerThreshold,
      resetTimeoutMs: 60000, // 1 minute
      halfOpenMaxCalls: 3,
      monitoringPeriod: 60000, // 1 minute
      successThreshold: 2,
      volumeThreshold: 5,
    };

    // Initialize enhanced rate limiter configuration
    this.rateLimiterConfig = {
      capacity: config.eventsApiRateLimit,
      refillRate: config.eventsApiRateLimit / 10, // 10-second window
      burstMultiplier: 1.5,
      adaptiveRefill: true,
      throttleThreshold: 0.8,
    };

    // Initialize rate limiter state
    this.rateLimiter = {
      tokens: this.rateLimiterConfig.capacity,
      lastRefill: Date.now(),
      maxTokens: this.rateLimiterConfig.capacity,
      refillRate: this.rateLimiterConfig.refillRate,
    };

    this.adaptiveRefillRate = this.rateLimiterConfig.refillRate;
    this.burstCapacity = Math.floor(this.rateLimiterConfig.capacity * this.rateLimiterConfig.burstMultiplier);

    this.logger.info({
      circuitBreakerConfig: this.circuitBreakerConfig,
      rateLimiterConfig: this.rateLimiterConfig,
    }, '[EnhancedEventPolymarketClient] Initialized with comprehensive error handling');
  }

  // ==========================================================================
  // Event Discovery Methods
  // ==========================================================================

  /**
   * Discover political events using events endpoint with tag_id=2 and related_tags=true
   * Implements Requirements 1.1, 1.2, 1.3 with comprehensive error handling and validation
   */
  async discoverPoliticalEvents(options: EventDiscoveryOptions = {}): Promise<PolymarketEvent[]> {
    return this.executeWithErrorHandling(
      async () => {
        // Build query parameters for political event discovery
        const params = new URLSearchParams({
          tag_id: (options.tagId || this.politicsTagId).toString(),
          related_tags: (options.relatedTags !== false).toString(),
          active: (options.active !== false).toString(),
          closed: (options.closed === true).toString(),
          limit: (options.limit || 20).toString(),
          offset: (options.offset || 0).toString(),
        });

        // Add optional parameters
        if (options.startDateMin) params.append('start_date_min', options.startDateMin);
        if (options.startDateMax) params.append('start_date_max', options.startDateMax);
        if (options.endDateMin) params.append('end_date_min', options.endDateMin);
        if (options.endDateMax) params.append('end_date_max', options.endDateMax);
        if (options.archived !== undefined) params.append('archived', options.archived.toString());
        if (options.featured !== undefined) params.append('featured', options.featured.toString());
        
        // Handle sorting parameters
        if (options.order) {
          params.append('order', options.order);
          if (options.ascending !== undefined) {
            params.append('ascending', options.ascending.toString());
          }
        } else if (options.sortBy) {
          params.append('order', options.sortBy);
          params.append('ascending', (options.sortOrder === 'asc').toString());
        }

        const url = `${this.gammaApiUrl}/events?${params.toString()}`;
        const rawData = await this.fetchWithRetry<unknown>(url);
        
        // Validate and parse the response using enhanced validation
        const validationResult = validatePolymarketEvents(rawData, {
          strict: false,
          allowPartialData: true,
          skipMalformedMarkets: true,
          logWarnings: true,
        });

        if (!validationResult.success) {
          throw new Error(`Event validation failed: ${validationResult.error?.message}`);
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
          this.logger.warn({
            warnings: validationResult.warnings,
            url,
          }, '[EnhancedEventPolymarketClient] Event validation completed with warnings');
        }

        return validationResult.data || [];
      },
      () => this.getFallbackEvents('political'),
      'discoverPoliticalEvents'
    );
  }

  /**
   * Fetch events by tag with comprehensive filtering options and validation
   * Implements Requirements 1.1, 1.4 with enhanced error handling and validation
   */
  async fetchEventsByTag(tagId: number, options: TagFilterOptions = {}): Promise<PolymarketEvent[]> {
    return this.executeWithErrorHandling(
      async () => {
        // Build query parameters
        const params = new URLSearchParams({
          tag_id: tagId.toString(),
          related_tags: (options.relatedTags !== false).toString(),
          active: (options.active !== false).toString(),
          closed: (options.closed === true).toString(),
          limit: (options.limit || 50).toString(),
          offset: (options.offset || 0).toString(),
        });

        // Add exclude tag if specified
        if (options.excludeTagId) {
          params.append('exclude_tag_id', options.excludeTagId.toString());
        }

        const url = `${this.gammaApiUrl}/events?${params.toString()}`;
        const rawData = await this.fetchWithRetry<unknown>(url);
        
        // Validate and parse the response using enhanced validation
        const validationResult = validatePolymarketEvents(rawData, {
          strict: false,
          allowPartialData: true,
          skipMalformedMarkets: true,
          logWarnings: true,
        });

        if (!validationResult.success) {
          throw new Error(`Event validation failed for tag ${tagId}: ${validationResult.error?.message}`);
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
          this.logger.warn({
            warnings: validationResult.warnings,
            tagId,
            url,
          }, '[EnhancedEventPolymarketClient] Tag-based event validation completed with warnings');
        }

        return validationResult.data || [];
      },
      () => this.getFallbackEvents(`tag_${tagId}`),
      'fetchEventsByTag'
    );
  }

  /**
   * Fetch individual event details with all nested markets and validation
   * Implements Requirements 1.2, 1.4 with comprehensive error handling and validation
   */
  async fetchEventDetails(eventId: string): Promise<PolymarketEvent> {
    return this.executeWithErrorHandling(
      async () => {
        const url = `${this.gammaApiUrl}/events/${eventId}`;
        const rawData = await this.fetchWithRetry<unknown>(url);
        
        // Validate and parse the single event response
        const validationResult = validatePolymarketEvent(rawData, {
          strict: false,
          allowPartialData: true,
          skipMalformedMarkets: true,
          logWarnings: true,
        });

        if (!validationResult.success) {
          throw new Error(`Event validation failed for event ${eventId}: ${validationResult.error?.message}`);
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
          this.logger.warn({
            warnings: validationResult.warnings,
            eventId,
            url,
          }, '[EnhancedEventPolymarketClient] Single event validation completed with warnings');
        }

        if (!validationResult.data) {
          throw new Error(`No valid event data returned for event ${eventId}`);
        }

        return validationResult.data;
      },
      () => this.getFallbackEvent(eventId),
      'fetchEventDetails'
    );
  }

  /**
   * Fetch event with enhanced market analysis
   * Implements Requirements 1.2, 1.5
   */
  async fetchEventWithAllMarkets(eventId: string): Promise<EventWithMarkets> {
    const event = await this.fetchEventDetails(eventId);
    
    // Calculate cross-market correlations
    const crossMarketCorrelations = this.calculateCrossMarketCorrelations(event.markets);
    
    // Calculate event-level metrics
    const eventLevelMetrics = this.calculateEventMetrics(event);

    return {
      event,
      markets: event.markets,
      crossMarketCorrelations,
      eventLevelMetrics,
    };
  }

  /**
   * Fetch multiple events in batch with enhanced error handling
   * Implements Requirements 4.3, 4.4 with comprehensive resilience
   */
  async fetchEventsBatch(eventIds: string[]): Promise<PolymarketEvent[]> {
    const events: PolymarketEvent[] = [];
    
    // Process in batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      
      // Fetch batch with error handling for each event
      const batchPromises = batch.map(async (eventId) => {
        try {
          return await this.fetchEventDetails(eventId);
        } catch (error) {
          this.logger.warn({ eventId, error: (error as Error).message }, 
            '[EnhancedEventPolymarketClient] Failed to fetch event in batch');
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          events.push(result.value);
        }
      }
    }

    return events;
  }

  // ==========================================================================
  // Enhanced Health and Status Methods
  // ==========================================================================

  /**
   * Check events API health with comprehensive diagnostics
   * Implements Requirements 4.3, 4.4
   */
  async checkEventsApiHealth(): Promise<ApiHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simple health check using events endpoint with minimal parameters
      const response = await fetch(`${this.gammaApiUrl}/events?limit=1`, {
        method: 'GET',
        headers: {
          'User-Agent': 'TradeWizard-EventClient/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;
      const healthy = response.ok;
      
      if (healthy) {
        this.logger.debug(`[EnhancedEventPolymarketClient] Health check passed in ${responseTime}ms`);
      } else {
        this.logger.warn(`[EnhancedEventPolymarketClient] Health check failed: ${response.status} ${response.statusText}`);
      }
      
      return {
        healthy,
        responseTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error({ error: (error as Error).message, responseTime }, 
        '[EnhancedEventPolymarketClient] Health check failed with exception');
      
      return {
        healthy: false,
        responseTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get current rate limit status with enhanced metrics
   */
  getRateLimitStatus(): RateLimitStatus {
    // Refill tokens based on time elapsed
    this.refillTokens();

    const currentUsage = this.rateLimiter.maxTokens - this.rateLimiter.tokens;
    const usagePercentage = (currentUsage / this.rateLimiter.maxTokens) * 100;

    return {
      tokensRemaining: Math.floor(this.rateLimiter.tokens),
      resetTime: Date.now() + ((this.rateLimiter.maxTokens - this.rateLimiter.tokens) / this.adaptiveRefillRate) * 1000,
      requestsInWindow: Math.floor(currentUsage),
      windowSizeMs: 10000, // 10 seconds for events API
    };
  }

  /**
   * Get comprehensive client status including circuit breaker and rate limiter
   */
  getClientStatus(): {
    circuitBreaker: CircuitBreakerStats;
    rateLimiter: RateLimitStatus;
    cache: {
      size: number;
      entries: string[];
    };
    health: {
      isHealthy: boolean;
      lastHealthCheck?: number;
    };
    validation: {
      enabled: boolean;
      strictMode: boolean;
      partialDataSupport: boolean;
    };
  } {
    return {
      circuitBreaker: this.getCircuitBreakerStats(),
      rateLimiter: this.getRateLimitStatus(),
      cache: {
        size: this.fallbackCache.size,
        entries: Array.from(this.fallbackCache.keys()),
      },
      health: {
        isHealthy: this.circuitState === 'CLOSED',
        lastHealthCheck: Date.now(),
      },
      validation: {
        enabled: true,
        strictMode: false,
        partialDataSupport: true,
      },
    };
  }

  /**
   * Reset circuit breaker manually (for testing/recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.lastFailureTime = 0;
    this.stateChangeTime = Date.now();
    this.halfOpenCalls = 0;
    this.halfOpenSuccesses = 0;
    this.callHistory = [];
    
    this.logger.info('[EnhancedEventPolymarketClient] Circuit breaker manually reset');
  }

  /**
   * Reset rate limiter manually (for testing/recovery)
   */
  resetRateLimiter(): void {
    this.rateLimiter.tokens = this.rateLimiter.maxTokens;
    this.rateLimiter.lastRefill = Date.now();
    this.usageHistory = [];
    
    this.logger.info('[EnhancedEventPolymarketClient] Rate limiter manually reset');
  }

  /**
   * Clear fallback cache
   */
  clearCache(): void {
    this.fallbackCache.clear();
    this.logger.info('[EnhancedEventPolymarketClient] Fallback cache cleared');
  }

  // ==========================================================================
  // Event Validation Methods
  // ==========================================================================

  /**
   * Validate event data using enhanced validation schemas
   * Implements Requirements 2.1, 2.2, 2.3, 7.1, 7.2, 7.5
   */
  validateEventData(
    data: unknown,
    options: Partial<EventParsingOptions> = {}
  ): EventValidationResult<ValidatedPolymarketEvent> {
    return validatePolymarketEvent(data, {
      strict: false,
      allowPartialData: true,
      skipMalformedMarkets: true,
      logWarnings: true,
      ...options,
    });
  }

  /**
   * Validate multiple events data using enhanced validation schemas
   * Implements Requirements 2.1, 2.2, 2.4, 7.1, 7.2, 7.5
   */
  validateEventsData(
    data: unknown,
    options: Partial<EventParsingOptions> = {}
  ): EventValidationResult<ValidatedEventsApiResponse> {
    return validatePolymarketEvents(data, {
      strict: false,
      allowPartialData: true,
      skipMalformedMarkets: true,
      logWarnings: true,
      ...options,
    });
  }

  /**
   * Test event validation with sample data
   * Useful for debugging and monitoring validation health
   */
  async testEventValidation(): Promise<{
    success: boolean;
    message: string;
    details?: {
      sampleEventValid: boolean;
      sampleEventsValid: boolean;
      validationErrors?: string[];
    };
  }> {
    try {
      // Test with minimal valid event structure
      const sampleEvent = {
        id: 'test-event-1',
        ticker: 'TEST',
        slug: 'test-event',
        title: 'Test Event',
        description: 'Test event for validation',
        resolutionSource: 'Test source',
        active: true,
        closed: false,
        archived: false,
        new: false,
        featured: false,
        restricted: false,
        startDate: new Date().toISOString(),
        creationDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        liquidity: 1000,
        volume: 5000,
        openInterest: 2000,
        competitive: 0.8,
        volume24hr: 500,
        volume1wk: 2000,
        volume1mo: 8000,
        volume1yr: 50000,
        enableOrderBook: true,
        liquidityClob: 1000,
        negRisk: false,
        commentCount: 5,
        markets: [],
        tags: [],
        cyom: false,
        showAllOutcomes: true,
        showMarketImages: false,
        enableNegRisk: false,
        automaticallyActive: true,
        gmpChartMode: 'default',
        negRiskAugmented: false,
        cumulativeMarkets: false,
        pendingDeployment: false,
        deploying: false,
        requiresTranslation: false,
      };

      const sampleEvents = [sampleEvent];

      // Test single event validation
      const singleEventResult = this.validateEventData(sampleEvent);
      
      // Test multiple events validation
      const multipleEventsResult = this.validateEventsData(sampleEvents);

      const validationErrors: string[] = [];
      
      if (!singleEventResult.success) {
        validationErrors.push(`Single event validation failed: ${singleEventResult.error?.message}`);
      }
      
      if (!multipleEventsResult.success) {
        validationErrors.push(`Multiple events validation failed: ${multipleEventsResult.error?.message}`);
      }

      const allValid = singleEventResult.success && multipleEventsResult.success;

      return {
        success: allValid,
        message: allValid 
          ? 'Event validation is working correctly' 
          : 'Event validation has issues',
        details: {
          sampleEventValid: singleEventResult.success,
          sampleEventsValid: multipleEventsResult.success,
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        },
      };

    } catch (error) {
      return {
        success: false,
        message: `Event validation test failed: ${(error as Error).message}`,
      };
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Calculate cross-market correlations within an event
   */
  private calculateCrossMarketCorrelations(markets: PolymarketMarket[]): MarketCorrelation[] {
    const correlations: MarketCorrelation[] = [];
    
    // Calculate correlations between all market pairs
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const market1 = markets[i];
        const market2 = markets[j];
        
        // Simple correlation based on price movements (would need historical data for real correlation)
        const correlation = this.calculateSimpleCorrelation(market1, market2);
        
        correlations.push({
          market1Id: market1.id,
          market2Id: market2.id,
          correlationCoefficient: correlation,
          correlationType: correlation > 0.3 ? 'positive' : correlation < -0.3 ? 'negative' : 'neutral',
        });
      }
    }
    
    return correlations;
  }

  /**
   * Calculate simple correlation between two markets (placeholder implementation)
   */
  private calculateSimpleCorrelation(market1: PolymarketMarket, market2: PolymarketMarket): number {
    // This is a simplified correlation calculation
    // In a real implementation, this would use historical price data
    const price1 = parseFloat(market1.outcomePrices?.split(',')[0] || '0.5');
    const price2 = parseFloat(market2.outcomePrices?.split(',')[0] || '0.5');
    
    // Simple correlation based on price similarity
    return 1 - Math.abs(price1 - price2);
  }

  /**
   * Calculate event-level metrics from constituent markets
   */
  private calculateEventMetrics(event: PolymarketEvent): EventMetrics {
    const markets = event.markets;
    
    // Aggregate volume and liquidity
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
    const volumeDistribution: MarketVolumeDistribution[] = markets.map(market => ({
      marketId: market.id,
      volumePercentage: totalVolume > 0 ? ((market.volumeNum || 0) / totalVolume) * 100 : 0,
      liquidityPercentage: totalLiquidity > 0 ? ((market.liquidityNum || 0) / totalLiquidity) * 100 : 0,
    }));
    
    // Calculate price correlations
    const priceCorrelations = this.calculateCrossMarketCorrelations(markets);
    
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
  // Enhanced Error Handling and Resilience
  // ==========================================================================

  /**
   * Execute function with comprehensive error handling, circuit breaker, and fallback
   * Implements Requirements 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  private async executeWithErrorHandling<T>(
    fn: () => Promise<T>,
    fallbackFn?: FallbackProvider<T>,
    operationName?: string
  ): Promise<T> {
    const startTime = Date.now();
    
    // Check if circuit allows execution
    if (!this.canMakeRequest()) {
      this.logger.warn(`[EnhancedEventPolymarketClient] Circuit is ${this.circuitState}, execution blocked for ${operationName}`);
      
      // Try fallback if available
      if (fallbackFn) {
        try {
          const fallbackData = await fallbackFn();
          this.logger.info(`[EnhancedEventPolymarketClient] Using fallback data for ${operationName}`);
          return fallbackData;
        } catch (fallbackError) {
          this.logger.error({ error: fallbackError }, `[EnhancedEventPolymarketClient] Fallback also failed for ${operationName}`);
          throw new Error(`Circuit breaker is ${this.circuitState} and fallback failed`);
        }
      }
      
      throw new Error(`Circuit breaker is ${this.circuitState}`);
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    try {
      const result = await fn();
      
      // Record success
      this.recordSuccess();
      
      // Cache successful result for fallback
      if (operationName) {
        this.cacheResult(operationName, result);
      }
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure();
      
      const duration = Date.now() - startTime;
      this.logger.error({ 
        error: (error as Error).message, 
        operationName, 
        duration,
        circuitState: this.circuitState 
      }, '[EnhancedEventPolymarketClient] Operation failed');
      
      // Only try fallback if circuit is OPEN or if this is a retryable error
      const isRetryableError = this.isRetryableError(error as Error);
      
      if (fallbackFn && (this.circuitState === 'OPEN' || isRetryableError)) {
        try {
          const fallbackData = await fallbackFn();
          this.logger.warn(`[EnhancedEventPolymarketClient] Primary function failed, using fallback for ${operationName}`);
          return fallbackData;
        } catch (fallbackError) {
          this.logger.error(`[EnhancedEventPolymarketClient] Both primary and fallback failed for ${operationName}`);
        }
      }
      
      // Re-throw the original error to maintain proper error propagation
      throw error;
    }
  }

  // ==========================================================================
  // Enhanced Circuit Breaker Logic
  // ==========================================================================

  /**
   * Check if a request can be made based on circuit breaker state
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    switch (this.circuitState) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if enough time has passed to try again
        if (now - this.stateChangeTime >= this.circuitBreakerConfig.resetTimeoutMs) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.halfOpenCalls < this.circuitBreakerConfig.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    const now = Date.now();
    
    this.successCount++;
    this.totalCalls++;
    this.addToCallHistory(now, true);
    
    if (this.circuitState === 'HALF_OPEN') {
      this.halfOpenCalls++;
      this.halfOpenSuccesses++;
      
      // Check if we have enough successes to close the circuit
      if (this.halfOpenSuccesses >= this.circuitBreakerConfig.successThreshold) {
        this.transitionToClosed();
      }
    }
    
    this.logger.debug(`[EnhancedEventPolymarketClient] Recorded success (state: ${this.circuitState})`);
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    const now = Date.now();
    
    this.failureCount++;
    this.totalCalls++;
    this.lastFailureTime = now;
    this.addToCallHistory(now, false);
    
    if (this.circuitState === 'HALF_OPEN') {
      this.halfOpenCalls++;
      // Any failure in half-open state opens the circuit
      this.transitionToOpen();
    } else if (this.circuitState === 'CLOSED') {
      // Check if we should open the circuit
      this.checkFailureThreshold();
    }
    
    this.logger.debug(`[EnhancedEventPolymarketClient] Recorded failure (state: ${this.circuitState})`);
  }

  /**
   * Add call result to sliding window history
   */
  private addToCallHistory(timestamp: number, success: boolean): void {
    this.callHistory.push({ timestamp, success });
    
    // Remove old entries outside monitoring period
    const cutoff = timestamp - this.circuitBreakerConfig.monitoringPeriod;
    this.callHistory = this.callHistory.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Check if failure threshold is exceeded
   */
  private checkFailureThreshold(): void {
    const now = Date.now();
    const cutoff = now - this.circuitBreakerConfig.monitoringPeriod;
    
    // Get recent calls within monitoring period
    const recentCalls = this.callHistory.filter(entry => entry.timestamp > cutoff);
    
    // Check if we have enough volume to make a decision
    if (recentCalls.length < this.circuitBreakerConfig.volumeThreshold) {
      // For low volume, use simple failure count threshold
      if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        this.transitionToOpen();
      }
      return;
    }
    
    // Calculate failure rate
    const failures = recentCalls.filter(entry => !entry.success).length;
    const failureRate = failures / recentCalls.length;
    
    // Check if failure rate exceeds threshold
    if (failures >= this.circuitBreakerConfig.failureThreshold || failureRate > 0.5) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    const previousState = this.circuitState;
    this.circuitState = 'CLOSED';
    this.stateChangeTime = Date.now();
    this.halfOpenCalls = 0;
    this.halfOpenSuccesses = 0;
    
    this.logger.info(`[EnhancedEventPolymarketClient] Circuit breaker state transition: ${previousState} -> ${this.circuitState}`);
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    const previousState = this.circuitState;
    this.circuitState = 'OPEN';
    this.stateChangeTime = Date.now();
    this.halfOpenCalls = 0;
    this.halfOpenSuccesses = 0;
    
    this.logger.warn(`[EnhancedEventPolymarketClient] Circuit breaker state transition: ${previousState} -> ${this.circuitState}`);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    const previousState = this.circuitState;
    this.circuitState = 'HALF_OPEN';
    this.stateChangeTime = Date.now();
    this.halfOpenCalls = 0;
    this.halfOpenSuccesses = 0;
    
    this.logger.info(`[EnhancedEventPolymarketClient] Circuit breaker state transition: ${previousState} -> ${this.circuitState}`);
  }

  /**
   * Get comprehensive circuit breaker statistics
   */
  getCircuitBreakerStats(): CircuitBreakerStats {
    const now = Date.now();
    const cutoff = now - this.circuitBreakerConfig.monitoringPeriod;
    
    // Calculate failure rate from recent calls
    const recentCalls = this.callHistory.filter(entry => entry.timestamp > cutoff);
    const recentFailures = recentCalls.filter(entry => !entry.success).length;
    const failureRate = recentCalls.length > 0 ? recentFailures / recentCalls.length : 0;
    
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      failureRate,
      lastFailureTime: this.lastFailureTime || undefined,
      nextAttemptTime: this.circuitState === 'OPEN' 
        ? this.stateChangeTime + this.circuitBreakerConfig.resetTimeoutMs 
        : undefined,
      halfOpenCalls: this.halfOpenCalls,
      halfOpenSuccesses: this.halfOpenSuccesses,
      stateChangeTime: this.stateChangeTime,
      timeSinceLastStateChange: now - this.stateChangeTime,
    };
  }

  // ==========================================================================
  // Enhanced Rate Limiting (Token Bucket Algorithm with Adaptive Features)
  // ==========================================================================

  /**
   * Update adaptive refill rate based on usage patterns
   */
  private updateAdaptiveRefillRate(): void {
    if (!this.rateLimiterConfig.adaptiveRefill || this.usageHistory.length < 10) {
      return;
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Filter usage to last hour
    this.usageHistory = this.usageHistory.filter(timestamp => timestamp > oneHourAgo);
    
    const recentUsage = this.usageHistory.length;
    const expectedUsage = this.rateLimiterConfig.refillRate * 3600; // Expected usage per hour
    
    // Adjust refill rate based on usage patterns
    if (recentUsage < expectedUsage * 0.5) {
      // Low usage - increase burst capacity, maintain refill rate
      this.burstCapacity = Math.floor(this.rateLimiterConfig.capacity * this.rateLimiterConfig.burstMultiplier);
    } else if (recentUsage > expectedUsage * 0.8) {
      // High usage - optimize for steady flow
      this.adaptiveRefillRate = Math.min(this.rateLimiterConfig.refillRate * 1.2, this.rateLimiterConfig.refillRate * 2);
      this.burstCapacity = this.rateLimiterConfig.capacity;
    } else {
      // Normal usage - use default settings
      this.adaptiveRefillRate = this.rateLimiterConfig.refillRate;
      this.burstCapacity = this.rateLimiterConfig.capacity;
    }
  }

  /**
   * Refill tokens based on elapsed time with adaptive rate
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.rateLimiter.lastRefill) / 1000; // Convert to seconds
    
    if (elapsed > 0) {
      this.updateAdaptiveRefillRate();
      
      const tokensToAdd = elapsed * this.adaptiveRefillRate;
      const maxCapacity = Math.max(this.rateLimiterConfig.capacity, this.burstCapacity);
      this.rateLimiter.tokens = Math.min(maxCapacity, this.rateLimiter.tokens + tokensToAdd);
      this.rateLimiter.lastRefill = now;
    }
  }

  /**
   * Wait for rate limit token to be available with intelligent throttling
   */
  private async waitForRateLimit(): Promise<void> {
    // Refill tokens based on time elapsed
    this.refillTokens();

    // Check if we're within the rate limit buffer
    const bufferThreshold = (this.rateLimitBuffer / 100) * this.rateLimiter.maxTokens;
    const currentUsage = (this.rateLimiter.maxTokens - this.rateLimiter.tokens) / this.rateLimiter.maxTokens;

    // Apply intelligent throttling based on usage
    if (currentUsage > this.rateLimiterConfig.throttleThreshold) {
      const throttleIntensity = (currentUsage - this.rateLimiterConfig.throttleThreshold) / (1 - this.rateLimiterConfig.throttleThreshold);
      const throttleDelay = Math.floor(throttleIntensity * 2000); // Up to 2 seconds
      
      if (throttleDelay > 0) {
        this.logger.debug(`[EnhancedEventPolymarketClient] Applying throttle delay: ${throttleDelay}ms`);
        await new Promise((resolve) => setTimeout(resolve, throttleDelay));
      }
    }

    if (this.rateLimiter.tokens < 1) {
      // Wait for a token to be available
      const waitTime = (1 / this.adaptiveRefillRate) * 1000; // milliseconds
      this.logger.debug(`[EnhancedEventPolymarketClient] Rate limit reached, waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimiter.tokens = 1;
    } else if (this.rateLimiter.tokens < bufferThreshold) {
      // Slow down requests when approaching limit
      const slowdownDelay = 200; // milliseconds
      await new Promise((resolve) => setTimeout(resolve, slowdownDelay));
    }

    // Consume a token
    this.rateLimiter.tokens--;
    
    // Track usage for adaptive refill
    if (this.rateLimiterConfig.adaptiveRefill) {
      this.usageHistory.push(Date.now());
      // Keep only last 1000 entries to prevent memory bloat
      if (this.usageHistory.length > 1000) {
        this.usageHistory = this.usageHistory.slice(-1000);
      }
    }
  }

  // ==========================================================================
  // Enhanced Retry Logic with Exponential Backoff and Jitter
  // ==========================================================================

  /**
   * Fetch with exponential backoff, jitter, and comprehensive error handling
   * @param url - URL to fetch
   * @param maxRetries - Maximum number of retries (default from config)
   * @returns Response data (unvalidated)
   */
  private async fetchWithRetry<T = unknown>(url: string, maxRetries?: number): Promise<T> {
    const retries = maxRetries || this.circuitBreakerConfig.failureThreshold - 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'TradeWizard-EventClient/1.0',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          const error = new Error(errorMessage);
          
          // Don't retry on client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw error;
          }
          
          throw error;
        }

        const data = (await response.json()) as T;
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt === retries) {
          throw lastError;
        }

        // Calculate backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s
        const jitter = Math.random() * 1000; // 0-1s random jitter
        const delay = baseDelay + jitter;

        this.logger.warn({ 
          attempt: attempt + 1, 
          maxRetries: retries + 1, 
          delay, 
          error: lastError.message,
          url 
        }, '[EnhancedEventPolymarketClient] Request failed, retrying with backoff');

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Retry on network errors, timeouts, and server errors
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /500/,
      /502/,
      /503/,
      /504/,
      /429/, // Rate limit
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  // ==========================================================================
  // Fallback Mechanisms and Graceful Degradation
  // ==========================================================================

  /**
   * Cache successful results for fallback
   */
  private cacheResult(key: string, data: any): void {
    this.fallbackCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.cacheTTL,
    });
    
    // Clean up old cache entries
    this.cleanupCache();
  }

  /**
   * Get cached result for fallback
   */
  private getCachedResult<T>(key: string): T | null {
    const cached = this.fallbackCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.fallbackCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.fallbackCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * Get fallback events from cache with validation
   */
  private async getFallbackEvents(cacheKey: string): Promise<PolymarketEvent[]> {
    const cached = this.getCachedResult<unknown>(cacheKey);
    
    if (cached) {
      // Validate cached data before returning
      const validationResult = validatePolymarketEvents(cached, {
        strict: false,
        allowPartialData: true,
        skipMalformedMarkets: true,
        logWarnings: false, // Don't log warnings for cached data
      });

      if (validationResult.success && validationResult.data) {
        this.logger.info(`[EnhancedEventPolymarketClient] Using validated cached fallback events for ${cacheKey}`);
        return validationResult.data;
      } else {
        this.logger.warn({
          cacheKey,
          validationError: validationResult.error?.message,
        }, '[EnhancedEventPolymarketClient] Cached fallback data failed validation');
      }
    }
    
    // Return empty array as last resort
    this.logger.warn(`[EnhancedEventPolymarketClient] No valid cached fallback available for ${cacheKey}`);
    return [];
  }

  /**
   * Get fallback event from cache with validation
   */
  private async getFallbackEvent(eventId: string): Promise<PolymarketEvent> {
    const cached = this.getCachedResult<unknown>(`event_${eventId}`);
    
    if (cached) {
      // Validate cached data before returning
      const validationResult = validatePolymarketEvent(cached, {
        strict: false,
        allowPartialData: true,
        skipMalformedMarkets: true,
        logWarnings: false, // Don't log warnings for cached data
      });

      if (validationResult.success && validationResult.data) {
        this.logger.info(`[EnhancedEventPolymarketClient] Using validated cached fallback event for ${eventId}`);
        return validationResult.data;
      } else {
        this.logger.warn({
          eventId,
          validationError: validationResult.error?.message,
        }, '[EnhancedEventPolymarketClient] Cached fallback event failed validation');
      }
    }
    
    throw new Error(`No valid fallback data available for event ${eventId}`);
  }
}

/**
 * Create an enhanced event-based Polymarket client instance
 */
export function createEnhancedEventPolymarketClient(
  config: EngineConfig['polymarket']
): EnhancedEventPolymarketClient {
  return new EnhancedEventPolymarketClient(config);
}