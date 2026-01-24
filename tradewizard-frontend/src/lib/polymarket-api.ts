/**
 * Polymarket API Service Layer
 * Handles all API interactions with Polymarket's Gamma, CLOB, and Data APIs
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  OrderBook,
  OrderRequest,
  OrderResponse,
  UserOrder,
  UserPosition,
  ApiResponse,
  ApiError,
  MarketFilters,
} from './polymarket-api-types';

import {
  POLYMARKET_CONFIG,
  GAMMA_ENDPOINTS,
  CLOB_ENDPOINTS,
  DATA_ENDPOINTS,
  buildApiUrl,
} from './polymarket-config';

// ============================================================================
// Base API Client
// ============================================================================

/**
 * Base API client with error handling and retry logic
 */
class BaseApiClient {
  private baseUrl: string;
  private rateLimitBuffer: number;
  private lastRequestTime: number = 0;

  constructor(baseUrl: string, rateLimitBuffer: number = 80) {
    this.baseUrl = baseUrl;
    this.rateLimitBuffer = rateLimitBuffer;
  }

  /**
   * Make API request with rate limiting and error handling
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    try {
      // Rate limiting
      await this.enforceRateLimit();

      // Build URL
      const url = buildApiUrl(this.baseUrl, endpoint, params);

      // Make request
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      
      return {
        success: false,
        error: {
          type: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = (100 - this.rateLimitBuffer) * 10; // Convert buffer to milliseconds

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// Market Discovery Service (Gamma API)
// ============================================================================

/**
 * Market Discovery Service for Gamma API integration
 */
export class MarketDiscoveryService extends BaseApiClient {
  constructor() {
    super(POLYMARKET_CONFIG.gammaApiUrl, POLYMARKET_CONFIG.rateLimitBuffer);
  }

  /**
   * Get events with optional filtering
   */
  async getEvents(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    tagId?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PolymarketEvent[]>> {
    // Convert boolean params to strings for URL parameters
    const urlParams: Record<string, string | number> = {};
    
    if (params.limit !== undefined) urlParams.limit = params.limit;
    if (params.offset !== undefined) urlParams.offset = params.offset;
    if (params.active !== undefined) urlParams.active = params.active.toString();
    if (params.closed !== undefined) urlParams.closed = params.closed.toString();
    if (params.tagId !== undefined) urlParams.tagId = params.tagId;
    if (params.sortBy !== undefined) urlParams.sortBy = params.sortBy;
    
    return this.request<PolymarketEvent[]>(GAMMA_ENDPOINTS.events, {}, urlParams);
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<ApiResponse<PolymarketEvent>> {
    return this.request<PolymarketEvent>(`${GAMMA_ENDPOINTS.events}/${eventId}`);
  }

  /**
   * Get markets with optional filtering
   */
  async getMarkets(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    eventId?: string;
  } = {}): Promise<ApiResponse<PolymarketMarket[]>> {
    // Convert boolean params to strings for URL parameters
    const urlParams: Record<string, string | number> = {};
    
    if (params.limit !== undefined) urlParams.limit = params.limit;
    if (params.offset !== undefined) urlParams.offset = params.offset;
    if (params.active !== undefined) urlParams.active = params.active.toString();
    if (params.closed !== undefined) urlParams.closed = params.closed.toString();
    if (params.eventId !== undefined) urlParams.eventId = params.eventId;
    
    return this.request<PolymarketMarket[]>(GAMMA_ENDPOINTS.markets, {}, urlParams);
  }

  /**
   * Get market by ID
   */
  async getMarket(marketId: string): Promise<ApiResponse<PolymarketMarket>> {
    return this.request<PolymarketMarket>(`${GAMMA_ENDPOINTS.markets}/${marketId}`);
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<ApiResponse<PolymarketTag[]>> {
    return this.request<PolymarketTag[]>(GAMMA_ENDPOINTS.tags);
  }

  /**
   * Search markets
   */
  async searchMarkets(query: string, params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<PolymarketMarket[]>> {
    return this.request<PolymarketMarket[]>(
      GAMMA_ENDPOINTS.search,
      {},
      { q: query, ...params }
    );
  }

  /**
   * Get political events (convenience method)
   */
  async getPoliticalEvents(params: {
    limit?: number;
    offset?: number;
    active?: boolean;
  } = {}): Promise<ApiResponse<PolymarketEvent[]>> {
    return this.getEvents({
      ...params,
      tagId: POLYMARKET_CONFIG.politicsTagId,
    });
  }
}

// ============================================================================
// Trading Service (CLOB API)
// ============================================================================

/**
 * Trading Service for CLOB API integration
 */
export class TradingService extends BaseApiClient {
  constructor() {
    super(POLYMARKET_CONFIG.clobApiUrl, POLYMARKET_CONFIG.rateLimitBuffer);
  }

  /**
   * Get order book for a token
   */
  async getOrderBook(tokenId: string): Promise<ApiResponse<OrderBook>> {
    return this.request<OrderBook>(`${CLOB_ENDPOINTS.orderBook}/${tokenId}`);
  }

  /**
   * Get current price for a token
   */
  async getCurrentPrice(tokenId: string): Promise<ApiResponse<{ price: number }>> {
    const orderBookResponse = await this.getOrderBook(tokenId);
    
    if (!orderBookResponse.success || !orderBookResponse.data) {
      return {
        success: false,
        error: orderBookResponse.error || { type: 'API_ERROR', message: 'Failed to get order book' },
        timestamp: Date.now(),
      };
    }

    const { bids, asks } = orderBookResponse.data;
    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 1;
    const midPrice = (bestBid + bestAsk) / 2;

    return {
      success: true,
      data: { price: midPrice },
      timestamp: Date.now(),
    };
  }

  /**
   * Place an order (requires authentication)
   */
  async placeOrder(order: OrderRequest, authToken?: string): Promise<ApiResponse<OrderResponse>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<OrderResponse>(
      CLOB_ENDPOINTS.orders,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(order),
      }
    );
  }

  /**
   * Cancel an order (requires authentication)
   */
  async cancelOrder(orderId: string, authToken?: string): Promise<ApiResponse<{ success: boolean }>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<{ success: boolean }>(
      `${CLOB_ENDPOINTS.orders}/${orderId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
  }

  /**
   * Get user orders (requires authentication)
   */
  async getUserOrders(address: string, authToken?: string): Promise<ApiResponse<UserOrder[]>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<UserOrder[]>(
      CLOB_ENDPOINTS.orders,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      },
      { address }
    );
  }

  /**
   * Get user positions (requires authentication)
   */
  async getUserPositions(address: string, authToken?: string): Promise<ApiResponse<UserPosition[]>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<UserPosition[]>(
      CLOB_ENDPOINTS.positions,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      },
      { address }
    );
  }

  /**
   * Get user balance (requires authentication)
   */
  async getUserBalance(address: string, authToken?: string): Promise<ApiResponse<{ balance: number }>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<{ balance: number }>(
      CLOB_ENDPOINTS.balance,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      },
      { address }
    );
  }
}

// ============================================================================
// Data Service (Data API)
// ============================================================================

/**
 * Data Service for user data and analytics
 */
export class DataService extends BaseApiClient {
  constructor() {
    super(POLYMARKET_CONFIG.dataApiUrl, POLYMARKET_CONFIG.rateLimitBuffer);
  }

  /**
   * Get user profile (requires authentication)
   */
  async getUserProfile(address: string, authToken?: string): Promise<ApiResponse<{
    address: string;
    totalVolume: number;
    totalPnL: number;
    marketsTraded: number;
  }>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<{
      address: string;
      totalVolume: number;
      totalPnL: number;
      marketsTraded: number;
    }>(
      `${DATA_ENDPOINTS.user}/${address}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );
  }

  /**
   * Get user trading history (requires authentication)
   */
  async getUserHistory(address: string, authToken?: string, params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Array<{
    orderId: string;
    marketId: string;
    side: 'buy' | 'sell';
    price: number;
    size: number;
    timestamp: number;
    pnl: number;
  }>>> {
    if (!authToken) {
      return {
        success: false,
        error: { type: 'API_ERROR', message: 'Authentication required' },
        timestamp: Date.now(),
      };
    }

    return this.request<Array<{
      orderId: string;
      marketId: string;
      side: 'buy' | 'sell';
      price: number;
      size: number;
      timestamp: number;
      pnl: number;
    }>>(
      `${DATA_ENDPOINTS.history}/${address}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      },
      params
    );
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

/**
 * Singleton instances for API services
 */
export const marketDiscoveryService = new MarketDiscoveryService();
export const tradingService = new TradingService();
export const dataService = new DataService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get markets with filtering and processing
 */
export async function getFilteredMarkets(filters: MarketFilters): Promise<ApiResponse<PolymarketMarket[]>> {
  const params: Record<string, string | number> = {
    limit: 50,
    offset: 0,
  };

  // Add category filter
  if (filters.category && filters.category !== 'all') {
    // Map category to tag ID (simplified - would need proper mapping)
    if (filters.category === 'politics') {
      params.tagId = POLYMARKET_CONFIG.politicsTagId;
    }
  }

  // Add active/closed filter
  if (!filters.showClosed) {
    params.active = 'true';
  }

  // Add sort parameters
  params.sortBy = filters.sortBy;
  if (filters.sortOrder === 'desc') {
    params.order = 'desc';
  }

  let response: ApiResponse<PolymarketMarket[]>;

  if (filters.search) {
    // Use search endpoint
    response = await marketDiscoveryService.searchMarkets(filters.search, {
      limit: params.limit as number,
      offset: params.offset as number,
    });
  } else {
    // Use regular markets endpoint - convert params properly
    const marketParams: Parameters<typeof marketDiscoveryService.getMarkets>[0] = {
      limit: params.limit as number,
      offset: params.offset as number,
    };
    
    if (params.active === 'true') {
      marketParams.active = true;
    }
    
    if (params.tagId) {
      // Note: getMarkets doesn't support tagId, would need to use getEvents instead
      // For now, we'll use the markets endpoint without tag filtering
    }
    
    response = await marketDiscoveryService.getMarkets(marketParams);
  }

  return response;
}

/**
 * Health check for all APIs
 */
export async function healthCheck(): Promise<{
  gamma: boolean;
  clob: boolean;
  data: boolean;
}> {
  const results = await Promise.allSettled([
    fetch(`${POLYMARKET_CONFIG.gammaApiUrl}/health`),
    fetch(`${POLYMARKET_CONFIG.clobApiUrl}/health`),
    fetch(`${POLYMARKET_CONFIG.dataApiUrl}/health`),
  ]);

  return {
    gamma: results[0].status === 'fulfilled' && results[0].value.ok,
    clob: results[1].status === 'fulfilled' && results[1].value.ok,
    data: results[2].status === 'fulfilled' && results[2].value.ok,
  };
}