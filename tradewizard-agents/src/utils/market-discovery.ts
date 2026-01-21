/**
 * Market Discovery Engine
 *
 * This module discovers and ranks trending political markets from Polymarket.
 * It filters markets by event type, ranks them by trending score, and selects
 * the top N markets for analysis.
 */

import type { EngineConfig } from '../config/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Raw market data from Polymarket API
 */
export interface PolymarketMarket {
  conditionId: string;
  question: string;
  description: string;
  endDate: string;
  createdAt?: string;
  slug?: string;
  outcomes?: string[];
  outcomePrices?: string[];
  volume?: string;
  volume24hr?: number;
  liquidity: string;
  trades24h?: number;
  active: boolean;
  closed: boolean;
  [key: string]: unknown;
}

/**
 * Market with calculated ranking score
 */
export interface RankedMarket {
  conditionId: string;
  question: string;
  description: string;
  trendingScore: number;
  volume24h: number;
  liquidity: number;
  marketSlug: string;
}

// ============================================================================
// Market Discovery Engine
// ============================================================================

export interface MarketDiscoveryEngine {
  /**
   * Discover and select top trending markets
   * @param limit - Maximum number of markets to select
   * @returns Selected markets with ranking scores
   */
  discoverMarkets(limit: number): Promise<RankedMarket[]>;

  /**
   * Fetch all active political markets from Polymarket
   */
  fetchPoliticalMarkets(): Promise<PolymarketMarket[]>;

  /**
   * Rank markets by trending score
   */
  rankMarkets(markets: PolymarketMarket[]): RankedMarket[];
}

/**
 * Political keywords for filtering markets
 */
const POLITICAL_KEYWORDS = [
  'election',
  'president',
  'trump',
  'biden',
  'harris',
  'senate',
  'congress',
  'governor',
  'court',
  'supreme court',
  'ruling',
  'verdict',
  'policy',
  'legislation',
  'bill',
  'law',
  'geopolitical',
  'war',
  'conflict',
  'treaty',
  'vote',
  'ballot',
  'referendum',
  'impeachment',
  'cabinet',
  'minister',
  'parliament',
  'immigration',
  'deport',
  'deportation',
  'border',
  'tariff',
  'trade war',
  'sanctions',
  'nato',
  'ukraine',
  'russia',
  'china',
];

/**
 * Market Discovery Engine Implementation
 */
export class PolymarketDiscoveryEngine implements MarketDiscoveryEngine {
  private readonly gammaApiUrl: string;

  constructor(config: EngineConfig['polymarket']) {
    this.gammaApiUrl = config.gammaApiUrl;
  }

  /**
   * Discover and select top trending markets
   */
  async discoverMarkets(limit: number): Promise<RankedMarket[]> {
    // Fetch all political markets
    const markets = await this.fetchPoliticalMarkets();

    // Rank markets by trending score
    const rankedMarkets = this.rankMarkets(markets);

    // Select top N markets
    return rankedMarkets.slice(0, limit);
  }

  /**
   * Fetch all active political markets from Polymarket
   */
  async fetchPoliticalMarkets(): Promise<PolymarketMarket[]> {
    // Fetch all active markets with retry logic
    const allMarkets = await this.fetchMarketsWithRetry();

    // Filter for political markets
    return this.filterPoliticalMarkets(allMarkets);
  }

  /**
   * Rank markets by trending score
   */
  rankMarkets(markets: PolymarketMarket[]): RankedMarket[] {
    // Calculate trending score for each market
    const rankedMarkets = markets.map((market) => {
      const trendingScore = this.calculateTrendingScore(market);
      const volume24h = market.volume24hr || parseFloat(market.volume || '0');
      const liquidity = parseFloat(market.liquidity || '0');

      return {
        conditionId: market.conditionId,
        question: market.question,
        description: market.description,
        trendingScore,
        volume24h,
        liquidity,
        marketSlug: market.slug || market.conditionId,
      };
    });

    // Sort by trending score (descending)
    return rankedMarkets.sort((a, b) => b.trendingScore - a.trendingScore);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Fetch markets from Polymarket API with retry logic
   */
  private async fetchMarketsWithRetry(): Promise<PolymarketMarket[]> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Fetch markets from Gamma API
        // Note: This endpoint may vary based on Polymarket's actual API
        const response = await fetch(`${this.gammaApiUrl}/markets?active=true&closed=false&limit=100`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as PolymarketMarket[] | { markets: PolymarketMarket[] };

        // Handle different response formats
        const markets = Array.isArray(data) ? data : data.markets || [];

        return markets;
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

  /**
   * Filter markets for political event types
   */
  private filterPoliticalMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
    return markets.filter((market) => {
      // Skip closed or inactive markets
      if (market.closed || !market.active) {
        return false;
      }

      // Check if question or description contains political keywords
      const text = `${market.question} ${market.description}`.toLowerCase();
      return POLITICAL_KEYWORDS.some((keyword) => text.includes(keyword));
    });
  }

  /**
   * Calculate trending score for a market
   */
  private calculateTrendingScore(market: PolymarketMarket): number {
    // Extract metrics
    const volume24h = market.volume24hr || parseFloat(market.volume || '0');
    const liquidity = parseFloat(market.liquidity || '0');
    const trades24h = market.trades24h || 0;
    const createdAt = market.createdAt || market.endDate;

    // Calculate component scores
    const volumeScore = this.calculateVolumeScore(volume24h);
    const liquidityScore = this.calculateLiquidityScore(liquidity);
    const recencyScore = this.calculateRecencyScore(createdAt);
    const activityScore = this.calculateActivityScore(trades24h);

    // Weighted scoring formula
    const trendingScore =
      volumeScore * 0.4 + liquidityScore * 0.3 + recencyScore * 0.2 + activityScore * 0.1;

    return trendingScore;
  }

  /**
   * Calculate volume score (log scale)
   */
  private calculateVolumeScore(volume24h: number): number {
    if (volume24h <= 0) return 0;
    return Math.log10(volume24h + 1);
  }

  /**
   * Calculate liquidity score (log scale)
   */
  private calculateLiquidityScore(liquidity: number): number {
    if (liquidity <= 0) return 0;
    return Math.log10(liquidity + 1);
  }

  /**
   * Calculate recency score (exponential decay)
   */
  private calculateRecencyScore(createdAt: string): number {
    try {
      const createdTimestamp = new Date(createdAt).getTime();
      const ageInDays = (Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24);

      // Newer markets get higher scores (exponential decay with 30-day half-life)
      return Math.exp(-ageInDays / 30);
    } catch {
      // If date parsing fails, return neutral score
      return 0.5;
    }
  }

  /**
   * Calculate activity score based on 24h trades
   */
  private calculateActivityScore(trades24h: number): number {
    if (trades24h <= 0) return 0;
    // Normalize to 0-1 scale (100 trades = score of 1)
    return Math.min(1, trades24h / 100);
  }
}

/**
 * Create a market discovery engine instance
 */
export function createMarketDiscoveryEngine(
  config: EngineConfig['polymarket']
): MarketDiscoveryEngine {
  return new PolymarketDiscoveryEngine(config);
}
