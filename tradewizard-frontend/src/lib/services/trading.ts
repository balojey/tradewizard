/**
 * Trading Service
 * Handles integration with Polymarket's CLOB API for trading operations
 */

import {
  OrderBook,
  OrderBookEntry,
  OrderRequest,
  OrderResponse,
  UserOrder,
  UserPosition,
  UserTrade,
  RecentTrade,
  ApiResponse,
  ApiError,
  TradingError,
  TradingServiceConfig,
} from '../polymarket-api-types';

/**
 * Trading Service Interface
 */
export interface TradingService {
  getOrderBook(tokenId: string): Promise<OrderBook>;
  getCurrentPrice(tokenId: string): Promise<number>;
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<void>;
  getUserOrders(address: string): Promise<UserOrder[]>;
  getUserPositions(address: string): Promise<UserPosition[]>;
  getUserTrades(address: string, limit?: number): Promise<UserTrade[]>;
  getRecentTrades(tokenId: string, limit?: number): Promise<RecentTrade[]>;
  getOrderStatus(orderId: string): Promise<UserOrder>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TradingServiceConfig = {
  clobApiUrl: 'https://clob.polymarket.com',
  rateLimitBuffer: 100, // ms buffer between requests
  defaultSlippage: 0.01, // 1%
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Retry configuration for exponential backoff
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Trading Service Implementation
 */
export class PolymarketTradingService implements TradingService {
  private config: TradingServiceConfig;
  private lastRequestTime = 0;

  constructor(config: Partial<TradingServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get order book for a token
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    const url = `${this.config.clobApiUrl}/book?token_id=${tokenId}`;
    const response = await this.makeRequest<any>(url);
    
    if (response.success && response.data) {
      return this.processOrderBook(response.data, tokenId);
    }
    
    throw new Error(response.error?.message || 'Failed to fetch order book');
  }

  /**
   * Get current price for a token
   */
  async getCurrentPrice(tokenId: string): Promise<number> {
    const url = `${this.config.clobApiUrl}/price?token_id=${tokenId}`;
    const response = await this.makeRequest<{ price: string }>(url);
    
    if (response.success && response.data) {
      return parseFloat(response.data.price);
    }
    
    throw new Error(response.error?.message || 'Failed to fetch current price');
  }

  /**
   * Place an order
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    // Validate order before submission
    this.validateOrder(order);

    const url = `${this.config.clobApiUrl}/order`;
    const response = await this.makeRequest<any>(url, {
      method: 'POST',
      body: JSON.stringify(this.formatOrderRequest(order)),
    });
    
    if (response.success && response.data) {
      return this.processOrderResponse(response.data, order);
    }
    
    // Handle trading-specific errors
    if (response.error) {
      throw this.createTradingError(response.error, order);
    }
    
    throw new Error('Failed to place order');
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    const url = `${this.config.clobApiUrl}/order/${orderId}`;
    const response = await this.makeRequest<any>(url, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to cancel order');
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(address: string): Promise<UserOrder[]> {
    const url = `${this.config.clobApiUrl}/orders?address=${address}`;
    const response = await this.makeRequest<any[]>(url);
    
    if (response.success && response.data) {
      return response.data.map(order => this.processUserOrder(order));
    }
    
    throw new Error(response.error?.message || 'Failed to fetch user orders');
  }

  /**
   * Get user positions
   */
  async getUserPositions(address: string): Promise<UserPosition[]> {
    const url = `${this.config.clobApiUrl}/positions?address=${address}`;
    const response = await this.makeRequest<any[]>(url);
    
    if (response.success && response.data) {
      return response.data.map(position => this.processUserPosition(position));
    }
    
    throw new Error(response.error?.message || 'Failed to fetch user positions');
  }

  /**
   * Get user trade history
   */
  async getUserTrades(address: string, limit = 50): Promise<UserTrade[]> {
    const url = `${this.config.clobApiUrl}/trades?address=${address}&limit=${limit}`;
    const response = await this.makeRequest<any[]>(url);
    
    if (response.success && response.data) {
      return response.data.map(trade => this.processUserTrade(trade));
    }
    
    throw new Error(response.error?.message || 'Failed to fetch user trades');
  }

  /**
   * Get recent trades for a token
   */
  async getRecentTrades(tokenId: string, limit = 20): Promise<RecentTrade[]> {
    const url = `${this.config.clobApiUrl}/trades?token_id=${tokenId}&limit=${limit}`;
    const response = await this.makeRequest<any[]>(url);
    
    if (response.success && response.data) {
      return response.data.map(trade => this.processRecentTrade(trade));
    }
    
    throw new Error(response.error?.message || 'Failed to fetch recent trades');
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<UserOrder> {
    const url = `${this.config.clobApiUrl}/order/${orderId}`;
    const response = await this.makeRequest<any>(url);
    
    if (response.success && response.data) {
      return this.processUserOrder(response.data);
    }
    
    throw new Error(response.error?.message || 'Failed to fetch order status');
  }

  // Private methods

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const retryConfig: RetryConfig = {
      maxRetries: this.config.maxRetries,
      baseDelay: this.config.retryDelay,
      maxDelay: 30000, // 30 seconds max
      backoffFactor: 2,
    };

    return this.withRetry(async () => {
      // Rate limiting
      await this.enforceRateLimit();

      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
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
    }, retryConfig);
  }

  private async withRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    config: RetryConfig
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | undefined;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // If successful or non-retryable error, return immediately
        if (result.success || !this.isRetryableError(result.error)) {
          return result;
        }
        
        lastError = result.error;
        
        // Don't delay after the last attempt
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffFactor, attempt),
            config.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          details: { originalError: error },
        };
        
        // Don't delay after the last attempt
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffFactor, attempt),
            config.maxDelay
          );
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

  private isRetryableError(error?: ApiError): boolean {
    if (!error) return false;
    
    return (
      error.type === 'NETWORK_ERROR' ||
      error.type === 'RATE_LIMIT_ERROR' ||
      (error.type === 'API_ERROR' && error.code === '500')
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

  private validateOrder(order: OrderRequest): void {
    if (!order.tokenId) {
      throw new Error('Token ID is required');
    }
    
    if (!order.side || !['buy', 'sell'].includes(order.side)) {
      throw new Error('Valid side (buy/sell) is required');
    }
    
    if (!order.price || order.price <= 0 || order.price > 1) {
      throw new Error('Price must be between 0 and 1');
    }
    
    if (!order.size || order.size <= 0) {
      throw new Error('Size must be greater than 0');
    }
    
    if (!order.orderType || !['limit', 'market'].includes(order.orderType)) {
      throw new Error('Valid order type (limit/market) is required');
    }
    
    if (!order.timeInForce || !['GTC', 'IOC', 'FOK'].includes(order.timeInForce)) {
      throw new Error('Valid time in force (GTC/IOC/FOK) is required');
    }
  }

  private formatOrderRequest(order: OrderRequest): any {
    return {
      token_id: order.tokenId,
      side: order.side,
      price: order.price.toString(),
      size: order.size.toString(),
      order_type: order.orderType,
      time_in_force: order.timeInForce,
      client_order_id: order.clientOrderId,
      post_only: order.postOnly,
      reduce_only: order.reduceOnly,
      user_address: order.userAddress,
      nonce: order.nonce,
    };
  }

  private processOrderBook(data: any, tokenId: string): OrderBook {
    const bids = data.bids?.map((bid: any) => ({
      price: bid.price,
      size: bid.size,
      total: bid.total,
      priceNumber: parseFloat(bid.price),
      sizeNumber: parseFloat(bid.size),
      totalNumber: parseFloat(bid.total || '0'),
      orderCount: bid.order_count,
    })) || [];

    const asks = data.asks?.map((ask: any) => ({
      price: ask.price,
      size: ask.size,
      total: ask.total,
      priceNumber: parseFloat(ask.price),
      sizeNumber: parseFloat(ask.size),
      totalNumber: parseFloat(ask.total || '0'),
      orderCount: ask.order_count,
    })) || [];

    const bestBid = bids.length > 0 ? bids[0].priceNumber : 0;
    const bestAsk = asks.length > 0 ? asks[0].priceNumber : 1;
    const spread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;

    return {
      market: data.market || '',
      asset_id: data.asset_id || '',
      tokenId,
      bids,
      asks,
      timestamp: data.timestamp || Date.now(),
      spread,
      spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
      midPrice,
      bestBid,
      bestAsk,
      bidDepth: bids.reduce((sum: number, bid: OrderBookEntry) => sum + (bid.sizeNumber || 0), 0),
      askDepth: asks.reduce((sum: number, ask: OrderBookEntry) => sum + (ask.sizeNumber || 0), 0),
      totalBidSize: bids.reduce((sum: number, bid: OrderBookEntry) => sum + (bid.sizeNumber || 0), 0),
      totalAskSize: asks.reduce((sum: number, ask: OrderBookEntry) => sum + (ask.sizeNumber || 0), 0),
      lastUpdated: Date.now(),
      updateCount: 1,
    };
  }

  private processOrderResponse(data: any, originalOrder: OrderRequest): OrderResponse {
    return {
      orderId: data.order_id || data.id,
      clientOrderId: data.client_order_id,
      status: this.mapOrderStatus(data.status),
      fillPrice: data.fill_price ? parseFloat(data.fill_price) : undefined,
      fillSize: data.fill_size ? parseFloat(data.fill_size) : undefined,
      remainingSize: data.remaining_size ? parseFloat(data.remaining_size) : undefined,
      timestamp: data.timestamp || Date.now(),
      averageFillPrice: data.average_fill_price ? parseFloat(data.average_fill_price) : undefined,
      totalFillSize: data.total_fill_size ? parseFloat(data.total_fill_size) : undefined,
      fees: data.fees ? {
        makerFee: parseFloat(data.fees.maker_fee || '0'),
        takerFee: parseFloat(data.fees.taker_fee || '0'),
        totalFees: parseFloat(data.fees.total_fees || '0'),
        feeToken: data.fees.fee_token || 'USDC',
      } : undefined,
      rejectionReason: data.rejection_reason,
      tokenId: originalOrder.tokenId,
      side: originalOrder.side,
      originalPrice: originalOrder.price,
      originalSize: originalOrder.size,
      orderType: originalOrder.orderType,
      fillHistory: data.fills?.map((fill: any) => ({
        fillId: fill.fill_id,
        price: parseFloat(fill.price),
        size: parseFloat(fill.size),
        timestamp: fill.timestamp,
        fees: parseFloat(fill.fees || '0'),
        side: fill.side,
      })) || [],
      lastFillTime: data.last_fill_time,
      createdAt: data.created_at || Date.now(),
      updatedAt: data.updated_at || Date.now(),
    };
  }

  private processUserOrder(data: any): UserOrder {
    return {
      orderId: data.order_id || data.id,
      clientOrderId: data.client_order_id,
      tokenId: data.token_id,
      marketId: data.market_id || '',
      marketTitle: data.market_title || '',
      outcome: data.outcome || '',
      side: data.side,
      price: parseFloat(data.price),
      size: parseFloat(data.size),
      remainingSize: parseFloat(data.remaining_size || data.size),
      filledSize: parseFloat(data.filled_size || '0'),
      status: this.mapOrderStatus(data.status),
      timestamp: data.timestamp || data.created_at || Date.now(),
      orderType: data.order_type || 'limit',
      timeInForce: data.time_in_force || 'GTC',
      averageFillPrice: data.average_fill_price ? parseFloat(data.average_fill_price) : undefined,
      totalFees: data.total_fees ? parseFloat(data.total_fees) : undefined,
      currentPrice: data.current_price ? parseFloat(data.current_price) : undefined,
      unrealizedPnL: data.unrealized_pnl ? parseFloat(data.unrealized_pnl) : undefined,
      createdAt: data.created_at || Date.now(),
      updatedAt: data.updated_at || Date.now(),
      expiresAt: data.expires_at,
      cancelledAt: data.cancelled_at,
      filledAt: data.filled_at,
      userAddress: data.user_address || '',
    };
  }

  private processUserPosition(data: any): UserPosition {
    const currentPrice = parseFloat(data.current_price || '0');
    const averagePrice = parseFloat(data.average_price || '0');
    const size = parseFloat(data.size || '0');
    const costBasis = averagePrice * size;
    const marketValue = currentPrice * size;
    const unrealizedPnL = marketValue - costBasis;

    return {
      tokenId: data.token_id,
      marketId: data.market_id || '',
      marketTitle: data.market_title || '',
      outcome: data.outcome || '',
      size,
      averagePrice,
      currentPrice,
      unrealizedPnL,
      realizedPnL: parseFloat(data.realized_pnl || '0'),
      value: marketValue,
      costBasis,
      marketValue,
      totalReturn: unrealizedPnL + parseFloat(data.realized_pnl || '0'),
      totalReturnPercent: costBasis > 0 ? ((unrealizedPnL + parseFloat(data.realized_pnl || '0')) / costBasis) * 100 : 0,
      holdingPeriod: data.holding_period || 0,
      maxDrawdown: data.max_drawdown ? parseFloat(data.max_drawdown) : undefined,
      maxDrawdownPercent: data.max_drawdown_percent ? parseFloat(data.max_drawdown_percent) : undefined,
      positionSize: parseFloat(data.position_size || '0'),
      riskAmount: parseFloat(data.risk_amount || '0'),
      marketEndDate: data.market_end_date || '',
      daysToExpiry: data.days_to_expiry || 0,
      marketActive: data.market_active !== false,
      marketResolved: data.market_resolved === true,
      entryDate: data.entry_date || Date.now(),
      lastTradeDate: data.last_trade_date || Date.now(),
      tradeCount: data.trade_count || 0,
      userAddress: data.user_address || '',
      lastUpdated: Date.now(),
    };
  }

  private processUserTrade(data: any): UserTrade {
    return {
      tradeId: data.trade_id || data.id,
      orderId: data.order_id,
      tokenId: data.token_id,
      marketId: data.market_id || '',
      marketTitle: data.market_title || '',
      outcome: data.outcome || '',
      side: data.side,
      price: parseFloat(data.price),
      size: parseFloat(data.size),
      fees: parseFloat(data.fees || '0'),
      timestamp: data.timestamp || Date.now(),
      realizedPnL: data.realized_pnl ? parseFloat(data.realized_pnl) : undefined,
      orderType: data.order_type || 'limit',
      fillType: data.fill_type || 'taker',
      userAddress: data.user_address || '',
    };
  }

  private processRecentTrade(data: any): RecentTrade {
    return {
      tradeId: data.trade_id || data.id,
      tokenId: data.token_id,
      outcome: data.outcome || '',
      price: parseFloat(data.price),
      size: parseFloat(data.size),
      side: data.side,
      timestamp: data.timestamp || Date.now(),
      traderAddress: data.trader_address,
      fees: data.fees ? parseFloat(data.fees) : undefined,
      isMarketMaker: data.is_market_maker === true,
    };
  }

  private mapOrderStatus(status: string): UserOrder['status'] {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'open':
        return 'pending';
      case 'filled':
      case 'complete':
        return 'filled';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'rejected':
        return 'rejected';
      case 'partially_filled':
      case 'partial':
        return 'partially_filled';
      default:
        return 'pending';
    }
  }

  private createTradingError(apiError: ApiError, order: OrderRequest): TradingError {
    // Map API errors to trading-specific errors
    if (apiError.message.toLowerCase().includes('insufficient balance')) {
      return {
        type: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance to place order',
        details: { order, originalError: apiError },
      };
    }
    
    if (apiError.message.toLowerCase().includes('invalid order')) {
      return {
        type: 'INVALID_ORDER',
        message: apiError.message,
        details: { order, originalError: apiError },
      };
    }
    
    if (apiError.message.toLowerCase().includes('market closed')) {
      return {
        type: 'MARKET_CLOSED',
        message: 'Market is closed for trading',
        details: { order, originalError: apiError },
      };
    }
    
    return {
      type: 'ORDER_FAILED',
      message: apiError.message,
      details: { order, originalError: apiError },
    };
  }
}

/**
 * Create a new Trading Service instance
 */
export function createTradingService(config?: Partial<TradingServiceConfig>): TradingService {
  return new PolymarketTradingService(config);
}

/**
 * Default Trading Service instance
 */
export const tradingService = createTradingService();