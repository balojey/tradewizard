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
  cacheTimeout: number;
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
  cacheTimeout: 60000, // 60 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Cache entry for API responses
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Market Discovery Service Implementation
 */
export class PolymarketDiscoveryService implements MarketDiscoveryService {
  private config: MarketDiscoveryConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private lastRequestTime = 0;

  constructor(config: Partial<MarketDiscoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get events from Gamma API
   */
  async getEvents(params: GetEventsParams = {}): Promise<PolymarketEvent[]> {
    const cacheKey = `events:${JSON.stringify(params)}`;
    const cached = this.getFromCache<PolymarketEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = this.buildEventsUrl(params);
    const response = await this.makeRequest<PolymarketEvent[]>(url);
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to fetch events');
  }

  /**
   * Get markets from Gamma API
   */
  async getMarkets(params: GetMarketsParams = {}): Promise<PolymarketMarket[]> {
    const cacheKey = `markets:${JSON.stringify(params)}`;
    const cached = this.getFromCache<PolymarketMarket[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = this.buildMarketsUrl(params);
    const response = await this.makeRequest<PolymarketMarket[]>(url);
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to fetch markets');
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.getFromCache<Category[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get tags from API and convert to categories
    const url = `${this.config.gammaApiUrl}/tags`;
    const response = await this.makeRequest<any[]>(url);
    
    if (response.success && response.data) {
      const categories = this.convertTagsToCategories(response.data);
      this.setCache(cacheKey, categories);
      return categories;
    }
    
    throw new Error(response.error?.message || 'Failed to fetch categories');
  }

  /**
   * Search markets
   */
  async searchMarkets(params: SearchParams): Promise<PolymarketMarket[]> {
    const { query, category, limit = 20, offset = 0, filters } = params;
    
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
  }

  /**
   * Get market by ID
   */
  async getMarketById(marketId: string): Promise<PolymarketMarket | null> {
    const cacheKey = `market:${marketId}`;
    const cached = this.getFromCache<PolymarketMarket>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.config.gammaApiUrl}/markets/${marketId}`;
    const response = await this.makeRequest<PolymarketMarket>(url);
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
      return response.data;
    }
    
    if (response.error?.type === 'API_ERROR' && response.error.message.includes('404')) {
      return null;
    }
    
    throw new Error(response.error?.message || 'Failed to fetch market');
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<PolymarketEvent | null> {
    const cacheKey = `event:${eventId}`;
    const cached = this.getFromCache<PolymarketEvent>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.config.gammaApiUrl}/events/${eventId}`;
    const response = await this.makeRequest<PolymarketEvent>(url);
    
    if (response.success && response.data) {
      this.setCache(cacheKey, response.data);
      return response.data;
    }
    
    if (response.error?.type === 'API_ERROR' && response.error.message.includes('404')) {
      return null;
    }
    
    throw new Error(response.error?.message || 'Failed to fetch event');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
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

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.config.cacheTimeout,
    };
    
    this.cache.set(key, entry);
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