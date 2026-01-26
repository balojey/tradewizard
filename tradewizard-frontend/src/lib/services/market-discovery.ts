/**
 * Market Discovery Service
 * Handles integration with Polymarket's Gamma API for market discovery and metadata
 */

import {
  PolymarketEvent,
  PolymarketMarket,
  ProcessedMarket,
  Category,
  GetEventsParams,
  GetMarketsParams,
  SearchParams,
  ApiResponse,
  ApiError,
  MarketFilters,
} from '../polymarket-api-types';
import { marketCacheManager, CacheKeys } from '../cache-manager';

/**
 * Market Discovery Service Interface
 */
export interface MarketDiscoveryService {
  getEvents(params: GetEventsParams): Promise<PolymarketEvent[]>;
  getMarkets(params: GetMarketsParams): Promise<PolymarketMarket[]>;
  getCategories(): Promise<Category[]>;
  searchMarkets(params: SearchParams): Promise<PolymarketMarket[]>;
  getMarketById(marketId: string): Promise<PolymarketMarket | null>;
  getEventById(eventId: string): Promise<PolymarketEvent | null>;
  getMarketBySlug(marketSlug: string): Promise<PolymarketMarket | null>;
  getEventBySlug(eventSlug: string): Promise<PolymarketEvent | null>;
}

/**
 * Configuration for Market Discovery Service
 */
export interface MarketDiscoveryConfig {
  gammaApiUrl: string;
  rateLimitBuffer: number;
  maxEventsPerDiscovery: number;
  maxMarketsPerEvent: number;
  defaultSortBy: string;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: MarketDiscoveryConfig = {
  gammaApiUrl: 'https://gamma-api.polymarket.com',
  rateLimitBuffer: 100, // ms buffer between requests
  maxEventsPerDiscovery: 100,
  maxMarketsPerEvent: 50,
  defaultSortBy: 'volume24hr',
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};


/**
 * Market Discovery Service Implementation with Enhanced Caching
 */
export class PolymarketDiscoveryService implements MarketDiscoveryService {
  private config: MarketDiscoveryConfig;
  private lastRequestTime = 0;

  constructor(config: Partial<MarketDiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get events from Gamma API with enhanced caching
   */
  async getEvents(params: GetEventsParams = {}): Promise<PolymarketEvent[]> {
    const cacheKey = CacheKeys.events(params);
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        const url = this.buildEventsUrl(params);
        const response = await this.makeRequest<PolymarketEvent[]>(url);
        
        if (response.success && response.data) {
          return response.data;
        }
        
        throw new Error(response.error?.message || 'Failed to fetch events');
      }
    );
  }

  /**
   * Get markets from Gamma API with enhanced caching
   */
  async getMarkets(params: GetMarketsParams = {}): Promise<PolymarketMarket[]> {
    const cacheKey = CacheKeys.markets(params);
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        const url = this.buildMarketsUrl(params);
        const response = await this.makeRequest<PolymarketMarket[]>(url);
        
        if (response.success && response.data) {
          return response.data;
        }
        
        throw new Error(response.error?.message || 'Failed to fetch markets');
      }
    );
  }

  /**
   * Get available categories with enhanced caching
   */
  async getCategories(): Promise<Category[]> {
    const cacheKey = CacheKeys.categories();
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        const url = `${this.config.gammaApiUrl}/tags`;
        const response = await this.makeRequest<any[]>(url);
        
        if (response.success && response.data) {
          return this.convertTagsToCategories(response.data);
        }
        
        throw new Error(response.error?.message || 'Failed to fetch categories');
      },
      300000 // 5 minutes for categories (less frequent changes)
    );
  }

  /**
   * Search markets with enhanced caching
   */
  async searchMarkets(params: SearchParams): Promise<PolymarketMarket[]> {
    const { query, category, limit = 20, offset = 0, filters } = params;
    const cacheKey = CacheKeys.search(query, { category, limit, offset, filters });
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        // Build search parameters
        const searchParams: GetMarketsParams = {
          limit,
          offset,
          sortBy: filters?.sortBy || 'volume24hr',
          order: filters?.sortOrder || 'desc',
        };

        // Get all markets first (in a real implementation, this would be server-side search)
        const allMarkets = await this.getMarkets(searchParams);
        
        // Filter by search query
        let filteredMarkets = allMarkets.filter(market => 
          market.question.toLowerCase().includes(query.toLowerCase()) ||
          market.description?.toLowerCase().includes(query.toLowerCase())
        );

        // Apply category filter if specified
        if (category) {
          // This would need to be implemented based on how categories are associated with markets
          // For now, we'll skip category filtering in search
        }

        // Apply additional filters
        if (filters) {
          filteredMarkets = this.applyFilters(filteredMarkets, filters);
        }

        return filteredMarkets.slice(0, limit);
      },
      30000 // 30 seconds for search results
    );
  }

  /**
   * Get market by ID with enhanced caching
   */
  async getMarketById(marketId: string): Promise<PolymarketMarket | null> {
    const cacheKey = CacheKeys.market(marketId);
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        const url = `${this.config.gammaApiUrl}/markets/${marketId}`;
        const response = await this.makeRequest<PolymarketMarket>(url);
        
        if (response.success && response.data) {
          return response.data;
        }
        
        if (response.error?.type === 'API_ERROR' && response.error.message.includes('404')) {
          return null;
        }
        
        throw new Error(response.error?.message || 'Failed to fetch market');
      }
    );
  }

  /**
   * Get event by ID with enhanced caching
   */
  async getEventById(eventId: string): Promise<PolymarketEvent | null> {
    const cacheKey = CacheKeys.event(eventId);
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        const url = `${this.config.gammaApiUrl}/events/${eventId}`;
        const response = await this.makeRequest<PolymarketEvent>(url);
        
        if (response.success && response.data) {
          return response.data;
        }
        
        if (response.error?.type === 'API_ERROR' && response.error.message.includes('404')) {
          return null;
        }
        
        throw new Error(response.error?.message || 'Failed to fetch event');
      }
    );
  }

  /**
   * Get market by slug with enhanced caching and fallback
   * Implements Requirements 4.8, 4.9 - slug-based routing
   */
  async getMarketBySlug(marketSlug: string): Promise<PolymarketMarket | null> {
    const cacheKey = `market_slug_${marketSlug}`;
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        try {
          // First, try to get market directly if the slug is actually an ID
          if (marketSlug.match(/^[0-9a-f-]{36}$/i) || marketSlug.match(/^\d+$/)) {
            const marketById = await this.getMarketById(marketSlug);
            if (marketById) {
              return marketById;
            }
          }

          // Since Polymarket API doesn't have direct slug lookup, we need to search
          // Start with a smaller batch and expand if needed
          let allMarkets: PolymarketMarket[] = [];
          let offset = 0;
          const batchSize = 100;
          let foundMarket: PolymarketMarket | null = null;

          // Search in batches to avoid loading too much data at once
          while (!foundMarket && offset < 1000) {
            const batch = await this.getMarkets({ 
              active: true, 
              limit: batchSize, 
              offset,
              sortBy: 'volume24hr',
              order: 'desc'
            });

            if (batch.length === 0) break;

            foundMarket = batch.find(m => m.slug === marketSlug) || null;
            offset += batchSize;
          }

          // If still not found, try with closed markets
          if (!foundMarket) {
            const closedBatch = await this.getMarkets({ 
              closed: true, 
              limit: 100,
              sortBy: 'volume24hr',
              order: 'desc'
            });
            foundMarket = closedBatch.find(m => m.slug === marketSlug) || null;
          }

          return foundMarket;
        } catch (error) {
          console.error('Error in getMarketBySlug:', error);
          return null;
        }
      }
    );
  }

  /**
   * Get event by slug with enhanced caching and fallback
   * Implements Requirements 4.8, 4.9 - slug-based routing
   */
  async getEventBySlug(eventSlug: string): Promise<PolymarketEvent | null> {
    const cacheKey = `event_slug_${eventSlug}`;
    
    return marketCacheManager.getOrRefresh(
      cacheKey,
      async () => {
        try {
          // First, try to get event directly if the slug is actually an ID
          if (eventSlug.match(/^[0-9a-f-]{36}$/i) || eventSlug.match(/^\d+$/)) {
            const eventById = await this.getEventById(eventSlug);
            if (eventById) {
              return eventById;
            }
          }

          // Since Polymarket API doesn't have direct slug lookup, we need to search
          // Start with a smaller batch and expand if needed
          let offset = 0;
          const batchSize = 100;
          let foundEvent: PolymarketEvent | null = null;

          // Search in batches to avoid loading too much data at once
          while (!foundEvent && offset < 1000) {
            const batch = await this.getEvents({ 
              active: true, 
              limit: batchSize, 
              offset,
              sortBy: 'volume24hr',
              order: 'desc'
            });

            if (batch.length === 0) break;

            foundEvent = batch.find(e => e.slug === eventSlug) || null;
            offset += batchSize;
          }

          // If still not found, try with closed events
          if (!foundEvent) {
            const closedBatch = await this.getEvents({ 
              closed: true, 
              limit: 100,
              sortBy: 'volume24hr',
              order: 'desc'
            });
            foundEvent = closedBatch.find(e => e.slug === eventSlug) || null;
          }

          return foundEvent;
        } catch (error) {
          console.error('Error in getEventBySlug:', error);
          return null;
        }
      }
    );
  }

  /**
   * Clear cache using enhanced cache manager
   */
  clearCache(): void {
    marketCacheManager.clear();
  }

  /**
   * Get cache statistics using enhanced cache manager
   */
  getCacheStats(): { size: number; entries: string[] } {
    const metrics = marketCacheManager.getMetrics();
    const entries = marketCacheManager.getEntries();
    
    return {
      size: metrics.entryCount,
      entries: entries.map(e => e.key),
    };
  }

  /**
   * Invalidate specific market data
   */
  invalidateMarket(marketId: string): void {
    marketCacheManager.invalidateMarket(marketId);
  }

  /**
   * Preload frequently accessed data
   */
  async preloadData(): Promise<void> {
    const preloadEntries = [
      {
        key: CacheKeys.categories(),
        callback: () => this.getCategories(),
        ttl: 300000, // 5 minutes
      },
      {
        key: CacheKeys.events({ active: true, limit: 20 }),
        callback: () => this.getEvents({ active: true, limit: 20 }),
      },
      {
        key: CacheKeys.markets({ active: true, limit: 50 }),
        callback: () => this.getMarkets({ active: true, limit: 50 }),
      },
    ];

    await marketCacheManager.preload(preloadEntries);
  }

  // Private methods

  private buildEventsUrl(params: GetEventsParams): string {
    const url = new URL(`${this.config.gammaApiUrl}/events`);
    
    if (params.tagId) url.searchParams.set('tag_id', params.tagId.toString());
    if (params.active !== undefined) url.searchParams.set('active', params.active.toString());
    if (params.closed !== undefined) url.searchParams.set('closed', params.closed.toString());
    if (params.limit) url.searchParams.set('limit', Math.min(params.limit, this.config.maxEventsPerDiscovery).toString());
    if (params.offset) url.searchParams.set('offset', params.offset.toString());
    if (params.sortBy) url.searchParams.set('sort_by', params.sortBy);
    if (params.order) url.searchParams.set('order', params.order);

    return url.toString();
  }

  private buildMarketsUrl(params: GetMarketsParams): string {
    const url = new URL(`${this.config.gammaApiUrl}/markets`);
    
    if (params.eventId) url.searchParams.set('event_id', params.eventId);
    if (params.active !== undefined) url.searchParams.set('active', params.active.toString());
    if (params.closed !== undefined) url.searchParams.set('closed', params.closed.toString());
    if (params.limit) url.searchParams.set('limit', Math.min(params.limit, this.config.maxMarketsPerEvent).toString());
    if (params.offset) url.searchParams.set('offset', params.offset.toString());
    if (params.sortBy) url.searchParams.set('sort_by', params.sortBy);
    if (params.order) url.searchParams.set('order', params.order);

    return url.toString();
  }

  private async makeRequest<T>(url: string): Promise<ApiResponse<T>> {
    return this.withRetry(async () => {
      try {
        // Rate limiting
        await this.enforceRateLimit();

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: ApiError = {
            type: response.status === 429 ? 'RATE_LIMIT_ERROR' : 'API_ERROR',
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            code: response.status.toString(),
            details: errorData,
          };
          
          return {
            success: false,
            error,
            timestamp: Date.now(),
          };
        }

        const data = await response.json();
        
        return {
          success: true,
          data,
          timestamp: Date.now(),
        };
      } catch (error) {
        const apiError: ApiError = {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: { originalError: error },
        };
        
        return {
          success: false,
          error: apiError,
          timestamp: Date.now(),
        };
      }
    });
  }

  /**
   * Retry mechanism with exponential backoff
   * Implements Requirements 3.3, 11.1, 11.4
   */
  private async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | undefined;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        
        // If successful or non-retryable error, return immediately
        if (result.success || !this.isRetryableError(result.error)) {
          return result;
        }
        
        lastError = result.error;
        
        // Don't delay after the last attempt
        if (attempt < this.config.retryAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: { originalError: error },
        };
        
        // Don't delay after the last attempt
        if (attempt < this.config.retryAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return {
      success: false,
      error: lastError || {
        type: 'API_ERROR',
        message: 'Max retries exceeded',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const maxDelay = 30000; // Cap at 30 seconds
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error?: ApiError): boolean {
    if (!error) return false;
    
    return (
      error.type === 'NETWORK_ERROR' ||
      error.type === 'RATE_LIMIT_ERROR' ||
      (error.type === 'API_ERROR' && error.code === '500') ||
      (error.type === 'API_ERROR' && error.code === '502') ||
      (error.type === 'API_ERROR' && error.code === '503') ||
      (error.type === 'API_ERROR' && error.code === '504')
    );
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimitBuffer) {
      const delay = this.config.rateLimitBuffer - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private convertTagsToCategories(tags: any[]): Category[] {
    return tags.map(tag => ({
      id: tag.id.toString(),
      name: tag.label,
      slug: tag.slug,
      count: 0, // This would need to be calculated separately
      active: !tag.forceHide,
    }));
  }

  private applyFilters(markets: PolymarketMarket[], filters: MarketFilters): PolymarketMarket[] {
    let filtered = markets;

    // Show/hide closed markets
    if (!filters.showClosed) {
      filtered = filtered.filter(market => !market.closed);
    }

    // Show only new markets
    if (filters.showNew) {
      filtered = filtered.filter(market => market.new);
    }

    // Volume filters
    if (filters.minVolume !== undefined) {
      filtered = filtered.filter(market => market.volumeNum >= filters.minVolume!);
    }

    if (filters.maxVolume !== undefined) {
      filtered = filtered.filter(market => market.volumeNum <= filters.maxVolume!);
    }

    // Sort markets
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (filters.sortBy) {
        case 'volume':
          aValue = a.volumeNum || 0;
          bValue = b.volumeNum || 0;
          break;
        case 'liquidity':
          aValue = a.liquidityNum || 0;
          bValue = b.liquidityNum || 0;
          break;
        case 'endDate':
          aValue = new Date(a.endDate).getTime();
          bValue = new Date(b.endDate).getTime();
          break;
        case 'probability':
          // Use the first outcome's price as probability
          const aPrices = JSON.parse(a.outcomePrices || '[]');
          const bPrices = JSON.parse(b.outcomePrices || '[]');
          aValue = parseFloat(aPrices[0] || '0');
          bValue = parseFloat(bPrices[0] || '0');
          break;
        default:
          aValue = a.volumeNum || 0;
          bValue = b.volumeNum || 0;
      }

      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }
}

/**
 * Create a new Market Discovery Service instance
 */
export function createMarketDiscoveryService(config?: Partial<MarketDiscoveryConfig>): MarketDiscoveryService {
  return new PolymarketDiscoveryService(config);
}

/**
 * Default Market Discovery Service instance
 */
export const marketDiscoveryService = createMarketDiscoveryService();