/**
 * TypeScript interfaces for Polymarket API responses
 * Enhanced for trading interface integration
 */

// ============================================================================
// Core API Response Types
// ============================================================================

/**
 * Polymarket Event from Gamma API
 */
export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  resolutionSource: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  startDate: string;
  creationDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  liquidity: number;
  volume: number;
  openInterest: number;
  competitive: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  enableOrderBook: boolean;
  liquidityClob: number;
  negRisk: boolean;
  negRiskMarketID?: string;
  commentCount: number;
  image?: string;
  icon?: string;
  markets: PolymarketMarket[];
  tags: PolymarketTag[];
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
 * Polymarket Market from Gamma API
 */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  resolutionSource: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity?: string;
  liquidityNum?: number;
  volume: string;
  volumeNum: number;
  volume24hr?: number;
  volume1wk?: number;
  volume1mo?: number;
  volume1yr?: number;
  outcomes: string;
  outcomePrices: string;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  oneMonthPriceChange?: number;
  oneYearPriceChange?: number;
  competitive?: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  closedTime?: string;
  marketMakerAddress: string;
  submitted_by: string;
  resolvedBy?: string;
  groupItemTitle?: string;
  groupItemThreshold?: string;
  questionID?: string;
  umaEndDate?: string;
  umaResolutionStatus?: string;
  umaResolutionStatuses?: string;
  umaBond?: string;
  umaReward?: string;
  enableOrderBook: boolean;
  orderPriceMinTickSize?: number;
  orderMinSize?: number;
  acceptingOrders?: boolean;
  acceptingOrdersTimestamp?: string;
  clobTokenIds?: string;
  liquidityClob?: number;
  volumeClob?: number;
  volume24hrClob?: number;
  volume1wkClob?: number;
  volume1moClob?: number;
  volume1yrClob?: number;
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
  image?: string;
  icon?: string;
  endDateIso?: string;
  startDateIso?: string;
  hasReviewedDates?: boolean;
}

/**
 * Polymarket Tag
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

// ============================================================================
// Trading API Types (CLOB)
// ============================================================================

/**
 * Order Book Entry
 */
export interface OrderBookEntry {
  price: string;
  size: string;
}

/**
 * Order Book from CLOB API
 */
export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

/**
 * Market Outcome for Trading
 */
export interface MarketOutcome {
  name: string;
  tokenId: string;
  probability: number;
  price: number;
  volume24h: number;
  color: 'yes' | 'no' | 'neutral';
  lastPrice?: number;
  priceChange24h?: number;
  bestBid?: number;
  bestAsk?: number;
}

/**
 * Order Request
 */
export interface OrderRequest {
  tokenId: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  orderType: 'limit' | 'market';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}

/**
 * Order Response
 */
export interface OrderResponse {
  orderId: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  fillPrice?: number;
  fillSize?: number;
  remainingSize?: number;
  timestamp: number;
}

/**
 * User Order
 */
export interface UserOrder {
  orderId: string;
  tokenId: string;
  marketTitle: string;
  outcome: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  remainingSize: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  timestamp: number;
}

/**
 * User Position
 */
export interface UserPosition {
  tokenId: string;
  marketTitle: string;
  outcome: string;
  size: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  value: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket Message Types
 */
export type WebSocketMessageType = 
  | 'price_update'
  | 'order_update'
  | 'market_update'
  | 'user_update'
  | 'heartbeat'
  | 'error';

/**
 * Price Update from WebSocket
 */
export interface PriceUpdate {
  type: 'price_update';
  tokenId: string;
  price: number;
  volume: number;
  timestamp: number;
  change24h?: number;
}

/**
 * Order Update from WebSocket
 */
export interface OrderUpdate {
  type: 'order_update';
  orderId: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  fillPrice?: number;
  fillSize?: number;
  remainingSize?: number;
  timestamp: number;
}

/**
 * Market Update from WebSocket
 */
export interface MarketUpdate {
  type: 'market_update';
  marketId: string;
  volume24h: number;
  liquidity: number;
  timestamp: number;
}

/**
 * WebSocket Message Union Type
 */
export type WebSocketMessage = PriceUpdate | OrderUpdate | MarketUpdate | {
  type: 'heartbeat' | 'error';
  timestamp: number;
  message?: string;
};

// ============================================================================
// Enhanced Frontend Types
// ============================================================================

/**
 * Processed Market for Frontend Display
 */
export interface ProcessedMarket {
  id: string;
  conditionId: string;
  title: string;
  description: string;
  image: string;
  category: string;
  outcomes: MarketOutcome[];
  volume24h: number;
  volumeFormatted: string;
  liquidity: number;
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  isNew: boolean;
  featured: boolean;
  slug: string;
  tags: string[];
  // AI Enhancement fields
  aiInsights?: AIMarketInsights;
  riskLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
}

/**
 * AI Market Insights
 */
export interface AIMarketInsights {
  summary: string;
  keyFactors: string[];
  riskFactors: string[];
  confidence: number;
  lastUpdated: number;
}

/**
 * Category for Market Filtering
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  active: boolean;
}

/**
 * Market Filters
 */
export interface MarketFilters {
  category?: string;
  search?: string;
  sortBy: 'volume' | 'liquidity' | 'endDate' | 'probability';
  sortOrder: 'asc' | 'desc';
  showClosed: boolean;
  showNew: boolean;
  minVolume?: number;
  maxVolume?: number;
}

/**
 * Pagination State
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ============================================================================
// API Configuration Types
// ============================================================================

/**
 * API Configuration
 */
export interface ApiConfig {
  gammaApiUrl: string;
  clobApiUrl: string;
  dataApiUrl: string;
  websocketUrl: string;
  rateLimitBuffer: number;
  politicsTagId: number;
  maxEventsPerDiscovery: number;
  maxMarketsPerEvent: number;
  defaultSortBy: string;
}

/**
 * WebSocket Configuration
 */
export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

/**
 * Trading Configuration
 */
export interface TradingConfig {
  defaultSlippageTolerance: number;
  minOrderSize: number;
  maxOrderSize: number;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  marketCacheTtl: number;
  priceCacheTtl: number;
  userCacheTtl: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API Error Response
 */
export interface ApiError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'RATE_LIMIT_ERROR';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Trading Error
 */
export interface TradingError {
  type: 'INSUFFICIENT_BALANCE' | 'INVALID_ORDER' | 'MARKET_CLOSED' | 'ORDER_FAILED';
  message: string;
  orderId?: string;
  details?: Record<string, unknown>;
}

/**
 * WebSocket Error
 */
export interface WebSocketError {
  type: 'CONNECTION_ERROR' | 'SUBSCRIPTION_ERROR' | 'MESSAGE_ERROR';
  message: string;
  reconnecting?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

/**
 * Loading State
 */
export interface LoadingState {
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}

/**
 * Connection Status
 */
export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: number;
}