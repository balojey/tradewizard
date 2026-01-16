/**
 * Polymarket API Client
 *
 * This module provides a wrapper around Polymarket's Gamma API and CLOB API
 * with built-in rate limiting, retry logic, exponential backoff, and circuit breaker.
 */

import type { EngineConfig } from '../config/index.js';
import type { IngestionError, MarketBriefingDocument } from '../models/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Raw market data from Polymarket Gamma API
 */
interface GammaMarketData {
  condition_id: string;
  question: string;
  description: string;
  end_date_iso: string;
  game_start_time: string;
  question_id: string;
  market_slug: string;
  outcomes: string[];
  outcome_prices: string[];
  volume: string;
  liquidity: string;
  [key: string]: unknown;
}

/**
 * Order book data from Polymarket CLOB API
 */
interface OrderBookData {
  market: string;
  asset_id: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
  [key: string]: unknown;
}

/**
 * Circuit breaker state
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Rate limiter state
 */
interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

// ============================================================================
// Polymarket API Client
// ============================================================================

export class PolymarketClient {
  private readonly gammaApiUrl: string;
  private readonly clobApiUrl: string;
  private readonly rateLimitBuffer: number;

  // Circuit breaker state
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 60 seconds

  // Rate limiter state (token bucket algorithm)
  private rateLimiter: RateLimiterState = {
    tokens: 100,
    lastRefill: Date.now(),
    maxTokens: 100,
    refillRate: 10, // 10 requests per second
  };

  constructor(config: EngineConfig['polymarket']) {
    this.gammaApiUrl = config.gammaApiUrl;
    this.clobApiUrl = config.clobApiUrl;
    this.rateLimitBuffer = config.rateLimitBuffer;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Fetch market data for a given condition ID
   * @param conditionId - Polymarket condition ID
   * @returns Market briefing document or error
   */
  async fetchMarketData(
    conditionId: string
  ): Promise<{ ok: true; data: MarketBriefingDocument } | { ok: false; error: IngestionError }> {
    // Check circuit breaker
    if (!this.canMakeRequest()) {
      return {
        ok: false,
        error: {
          type: 'API_UNAVAILABLE',
          message: 'Circuit breaker is OPEN. API is temporarily unavailable.',
        },
      };
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    try {
      // Fetch market data with retry logic
      const marketData = await this.fetchWithRetry<GammaMarketData>(
        `${this.gammaApiUrl}/markets/${conditionId}`,
        3
      );

      // Fetch order book data
      const orderBook = await this.fetchWithRetry<OrderBookData>(
        `${this.clobApiUrl}/book?market=${conditionId}`,
        3
      );

      // Transform to MBD
      const mbd = this.transformToMBD(conditionId, marketData, orderBook);

      // Reset circuit breaker on success
      this.onSuccess();

      return { ok: true, data: mbd };
    } catch (error) {
      // Record failure for circuit breaker
      this.onFailure();

      // Determine error type
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return {
            ok: false,
            error: {
              type: 'RATE_LIMIT_EXCEEDED',
              retryAfter: 60, // seconds
            },
          };
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
          return {
            ok: false,
            error: {
              type: 'INVALID_MARKET_ID',
              marketId: conditionId,
            },
          };
        }
        return {
          ok: false,
          error: {
            type: 'API_UNAVAILABLE',
            message: error.message,
          },
        };
      }

      return {
        ok: false,
        error: {
          type: 'API_UNAVAILABLE',
          message: 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Check if a market is resolved
   * @param conditionId - Polymarket condition ID
   * @returns Resolution status and outcome if resolved
   */
  async checkMarketResolution(
    conditionId: string
  ): Promise<
    | { resolved: false }
    | { resolved: true; outcome: string; resolvedAt: number }
  > {
    // Check circuit breaker
    if (!this.canMakeRequest()) {
      return { resolved: false };
    }

    // Wait for rate limit
    await this.waitForRateLimit();

    try {
      // Fetch market data with retry logic
      const marketData = await this.fetchWithRetry<GammaMarketData>(
        `${this.gammaApiUrl}/markets/${conditionId}`,
        3
      );

      // Check if market has a closed/resolved status
      // Polymarket markets are resolved when they have a definitive outcome
      const closed = (marketData as any).closed === true || (marketData as any).closed === 'true';
      const resolved = (marketData as any).resolved === true || (marketData as any).resolved === 'true';
      const active = (marketData as any).active;
      
      // Check if market is closed/resolved
      // Market is resolved if: closed=true, resolved=true, or active=false (but not active=true)
      const isResolved = closed || resolved || (active !== undefined && active === false);
      
      if (isResolved) {
        // Determine the outcome based on outcome prices
        // If YES price is 1.0 or very close, market resolved YES
        // If NO price is 1.0 or very close, market resolved NO
        const yesPrice = parseFloat(marketData.outcome_prices[0] || '0');
        const noPrice = parseFloat(marketData.outcome_prices[1] || '0');
        
        let outcome = 'UNKNOWN';
        if (yesPrice >= 0.99) {
          outcome = 'YES';
        } else if (noPrice >= 0.99) {
          outcome = 'NO';
        } else if (yesPrice >= 0.95) {
          outcome = 'YES';
        } else if (noPrice >= 0.95) {
          outcome = 'NO';
        }

        // Get resolution timestamp (use end_date_iso or current time)
        const resolvedAt = marketData.end_date_iso
          ? new Date(marketData.end_date_iso).getTime()
          : Date.now();

        // Reset circuit breaker on success
        this.onSuccess();

        return {
          resolved: true,
          outcome,
          resolvedAt,
        };
      }

      // Market is still active
      this.onSuccess();
      return { resolved: false };
    } catch (error) {
      // Record failure for circuit breaker
      this.onFailure();

      // On error, assume market is not resolved
      return { resolved: false };
    }
  }

  /**
   * Health check endpoint
   * @returns true if APIs are reachable, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check Gamma API
      const gammaResponse = await fetch(`${this.gammaApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!gammaResponse.ok) {
        return false;
      }

      // Check CLOB API
      const clobResponse = await fetch(`${this.clobApiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return clobResponse.ok;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Circuit Breaker Logic
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
        if (now - this.lastFailureTime >= this.resetTimeout) {
          this.circuitState = 'HALF_OPEN';
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.circuitState = 'CLOSED';
  }

  /**
   * Record a failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'OPEN';
    }
  }

  // ==========================================================================
  // Rate Limiting (Token Bucket Algorithm)
  // ==========================================================================

  /**
   * Wait for rate limit token to be available
   */
  private async waitForRateLimit(): Promise<void> {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.rateLimiter.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.rateLimiter.refillRate;

    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + tokensToAdd
    );
    this.rateLimiter.lastRefill = now;

    // Check if we're within the rate limit buffer
    const bufferThreshold = (this.rateLimitBuffer / 100) * this.rateLimiter.maxTokens;

    if (this.rateLimiter.tokens < 1) {
      // Wait for a token to be available
      const waitTime = (1 / this.rateLimiter.refillRate) * 1000; // milliseconds
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimiter.tokens = 1;
    } else if (this.rateLimiter.tokens < bufferThreshold) {
      // Slow down requests when approaching limit
      const slowdownDelay = 100; // milliseconds
      await new Promise((resolve) => setTimeout(resolve, slowdownDelay));
    }

    // Consume a token
    this.rateLimiter.tokens--;
  }

  // ==========================================================================
  // Retry Logic with Exponential Backoff
  // ==========================================================================

  /**
   * Fetch with exponential backoff and jitter
   * @param url - URL to fetch
   * @param maxRetries - Maximum number of retries
   * @returns Response data
   */
  private async fetchWithRetry<T>(url: string, maxRetries: number): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as T;
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on 404 or 400 errors
        if (lastError.message.includes('404') || lastError.message.includes('400')) {
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        const jitter = Math.random() * 1000; // 0-1s random jitter
        const delay = baseDelay + jitter;

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  // ==========================================================================
  // Data Transformation
  // ==========================================================================

  /**
   * Transform raw Polymarket data into Market Briefing Document
   */
  private transformToMBD(
    conditionId: string,
    marketData: GammaMarketData,
    orderBook: OrderBookData
  ): MarketBriefingDocument {
    // Calculate bid-ask spread
    const bestBid = orderBook.bids[0] ? parseFloat(orderBook.bids[0].price) : 0;
    const bestAsk = orderBook.asks[0] ? parseFloat(orderBook.asks[0].price) : 1;
    const bidAskSpread = (bestAsk - bestBid) * 100; // in cents

    // Calculate current probability (midpoint)
    const currentProbability = (bestBid + bestAsk) / 2;

    // Calculate liquidity score (0-10 scale based on order book depth)
    const totalBidSize = orderBook.bids.reduce((sum, bid) => sum + parseFloat(bid.size), 0);
    const totalAskSize = orderBook.asks.reduce((sum, ask) => sum + parseFloat(ask.size), 0);
    const totalLiquidity = totalBidSize + totalAskSize;
    const liquidityScore = Math.min(10, Math.log10(totalLiquidity + 1) * 2);

    // Determine volatility regime (simplified - would need historical data)
    const volatilityRegime = this.calculateVolatilityRegime(bidAskSpread);

    // Parse expiry timestamp
    const expiryTimestamp = new Date(marketData.end_date_iso).getTime();

    // Detect ambiguity flags (simplified)
    const ambiguityFlags = this.detectAmbiguityFlags(marketData.description);

    // Extract catalysts (simplified)
    const keyCatalysts = this.extractCatalysts(marketData);

    // Determine event type
    const eventType = this.classifyEventType(marketData.question);

    return {
      marketId: marketData.market_slug || conditionId,
      conditionId,
      eventType,
      question: marketData.question,
      resolutionCriteria: marketData.description || 'No resolution criteria provided',
      expiryTimestamp,
      currentProbability,
      liquidityScore,
      bidAskSpread,
      volatilityRegime,
      volume24h: parseFloat(marketData.volume || '0'),
      metadata: {
        ambiguityFlags,
        keyCatalysts,
      },
    };
  }

  /**
   * Calculate volatility regime based on bid-ask spread
   */
  private calculateVolatilityRegime(bidAskSpread: number): 'low' | 'medium' | 'high' {
    if (bidAskSpread < 2) return 'low';
    if (bidAskSpread < 5) return 'medium';
    return 'high';
  }

  /**
   * Detect ambiguity in resolution criteria
   */
  private detectAmbiguityFlags(description: string): string[] {
    const flags: string[] = [];

    const ambiguousTerms = [
      'may',
      'might',
      'could',
      'possibly',
      'unclear',
      'ambiguous',
      'subjective',
    ];

    for (const term of ambiguousTerms) {
      if (description.toLowerCase().includes(term)) {
        flags.push(`Contains ambiguous term: "${term}"`);
      }
    }

    return flags;
  }

  /**
   * Extract key catalysts from market data
   */
  private extractCatalysts(marketData: GammaMarketData): Array<{ event: string; timestamp: number }> {
    const catalysts: Array<{ event: string; timestamp: number }> = [];

    // Add game start time as a catalyst if available
    if (marketData.game_start_time) {
      catalysts.push({
        event: 'Market event start',
        timestamp: new Date(marketData.game_start_time).getTime(),
      });
    }

    // Add expiry as a catalyst
    if (marketData.end_date_iso) {
      catalysts.push({
        event: 'Market expiry',
        timestamp: new Date(marketData.end_date_iso).getTime(),
      });
    }

    return catalysts;
  }

  /**
   * Classify event type based on question text
   */
  private classifyEventType(question: string): MarketBriefingDocument['eventType'] {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('election') || lowerQuestion.includes('vote')) {
      return 'election';
    }
    if (lowerQuestion.includes('policy') || lowerQuestion.includes('law')) {
      return 'policy';
    }
    if (lowerQuestion.includes('court') || lowerQuestion.includes('ruling')) {
      return 'court';
    }
    if (
      lowerQuestion.includes('war') ||
      lowerQuestion.includes('conflict') ||
      lowerQuestion.includes('treaty')
    ) {
      return 'geopolitical';
    }
    if (
      lowerQuestion.includes('gdp') ||
      lowerQuestion.includes('inflation') ||
      lowerQuestion.includes('economy') ||
      lowerQuestion.includes('bitcoin') ||
      lowerQuestion.includes('stock') ||
      lowerQuestion.includes('market') ||
      lowerQuestion.includes('price')
    ) {
      return 'economic';
    }

    return 'other';
  }
}

/**
 * Create a Polymarket client instance
 */
export function createPolymarketClient(config: EngineConfig['polymarket']): PolymarketClient {
  return new PolymarketClient(config);
}
