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
 * Order Book Entry (Enhanced)
 */
export interface OrderBookEntry {
  price: string;
  size: string;
  total?: string;
  priceNumber?: number;
  sizeNumber?: number;
  totalNumber?: number;
  orderCount?: number;
}

/**
 * Order Book from CLOB API (Enhanced)
 */
export interface OrderBook {
  market: string;
  asset_id: string;
  tokenId: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
  
  // Calculated Fields
  spread?: number;
  spreadPercent?: number;
  midPrice?: number;
  bestBid?: number;
  bestAsk?: number;
  bidDepth?: number;
  askDepth?: number;
  totalBidSize?: number;
  totalAskSize?: number;
  
  // Market Quality Metrics
  liquidityScore?: number;
  depthScore?: number;
  tightness?: number;
  
  // Real-time Status
  lastUpdated?: number;
  updateCount?: number;
}

/**
 * Market Outcome for Trading (Enhanced)
 */
export interface MarketOutcome {
  name: string;
  tokenId: string;
  probability: number;
  price: number;
  volume24h: number;
  color: 'yes' | 'no' | 'neutral';
  
  // Enhanced Trading Fields
  lastPrice?: number;
  priceChange24h?: number;
  priceChangePercent?: number;
  bestBid?: number;
  bestAsk?: number;
  bidSize?: number;
  askSize?: number;
  spread?: number;
  spreadPercent?: number;
  
  // Market Depth
  totalBidSize?: number;
  totalAskSize?: number;
  marketDepth?: number;
  
  // Price History
  high24h?: number;
  low24h?: number;
  open24h?: number;
  
  // Volume Metrics
  volumeChange24h?: number;
  volumeChangePercent?: number;
  tradeCount24h?: number;
  
  // Real-time Status
  lastTradeTime?: number;
  lastUpdateTime?: number;
  
  // Trading Configuration
  minOrderSize?: number;
  maxOrderSize?: number;
  tickSize?: number;
}

/**
 * Order Request (Enhanced)
 */
export interface OrderRequest {
  tokenId: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  orderType: 'limit' | 'market';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  
  // Optional Fields
  clientOrderId?: string;
  postOnly?: boolean;
  reduceOnly?: boolean;
  slippageTolerance?: number;
  
  // Validation Fields
  maxSlippage?: number;
  minFillSize?: number;
  
  // User Context
  userAddress?: string;
  nonce?: number;
}

/**
 * Order Response (Enhanced)
 */
export interface OrderResponse {
  orderId: string;
  clientOrderId?: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  fillPrice?: number;
  fillSize?: number;
  remainingSize?: number;
  timestamp: number;
  
  // Enhanced Response Fields
  averageFillPrice?: number;
  totalFillSize?: number;
  fees?: OrderFees;
  rejectionReason?: string;
  
  // Market Context
  tokenId: string;
  side: 'buy' | 'sell';
  originalPrice: number;
  originalSize: number;
  orderType: 'limit' | 'market';
  
  // Execution Details
  fillHistory?: OrderFill[];
  lastFillTime?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Order Fees
 */
export interface OrderFees {
  makerFee: number;
  takerFee: number;
  totalFees: number;
  feeToken: string;
}

/**
 * Order Fill
 */
export interface OrderFill {
  fillId: string;
  price: number;
  size: number;
  timestamp: number;
  fees: number;
  side: 'maker' | 'taker';
}

/**
 * User Order (Enhanced)
 */
export interface UserOrder {
  orderId: string;
  clientOrderId?: string;
  tokenId: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  remainingSize: number;
  filledSize: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  timestamp: number;
  
  // Enhanced Fields
  orderType: 'limit' | 'market';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  averageFillPrice?: number;
  totalFees?: number;
  
  // Market Context
  currentPrice?: number;
  unrealizedPnL?: number;
  
  // Status Details
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  cancelledAt?: number;
  filledAt?: number;
  
  // User Context
  userAddress: string;
}

/**
 * User Position (Enhanced)
 */
export interface UserPosition {
  tokenId: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  size: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  value: number;
  
  // Enhanced Position Fields
  costBasis: number;
  marketValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  
  // Position Metrics
  holdingPeriod: number; // in days
  maxDrawdown?: number;
  maxDrawdownPercent?: number;
  
  // Risk Metrics
  positionSize: number; // as percentage of portfolio
  riskAmount: number; // amount at risk
  
  // Market Context
  marketEndDate: string;
  daysToExpiry: number;
  marketActive: boolean;
  marketResolved: boolean;
  
  // Transaction History
  entryDate: number;
  lastTradeDate: number;
  tradeCount: number;
  
  // User Context
  userAddress: string;
  
  // Status
  lastUpdated: number;
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
 * Processed Market for Frontend Display (Enhanced for Trading)
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
  liquidityFormatted: string;
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  isNew: boolean;
  featured: boolean;
  slug: string;
  tags: string[];
  
  // Trading Enhancement fields
  orderBook?: OrderBook;
  spread?: number;
  spreadFormatted?: string;
  lastTradePrice?: number;
  priceChange24h?: number;
  priceChangeFormatted?: string;
  marketDepth?: number;
  tradingEnabled: boolean;
  acceptingOrders: boolean;
  minOrderSize?: number;
  tickSize?: number;
  
  // Market Quality Metrics
  competitiveScore?: number;
  liquidityScore?: number; // 0-10 scale
  volatilityRegime?: 'low' | 'medium' | 'high';
  
  // Resolution Information
  resolutionSource?: string;
  resolutionCriteria?: string;
  resolved?: boolean;
  resolutionResult?: string;
  payoutInfo?: PayoutInfo;
  
  // AI Enhancement fields
  aiInsights?: AIMarketInsights;
  riskLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
  
  // Real-time Status
  lastUpdated?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
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
  
  // Enhanced AI Fields
  sentiment: 'bullish' | 'bearish' | 'neutral';
  volatilityPrediction: 'low' | 'medium' | 'high';
  liquidityAssessment: 'poor' | 'fair' | 'good' | 'excellent';
  
  // Probability Analysis
  fairValueEstimate?: number;
  confidenceBand?: [number, number];
  edgeDetection?: number;
  
  // Market Intelligence
  catalysts?: string[];
  headwinds?: string[];
  timeHorizonAnalysis?: {
    shortTerm: string; // 1-7 days
    mediumTerm: string; // 1-4 weeks
    longTerm: string; // 1+ months
  };
  
  // Comparative Analysis
  similarMarkets?: string[];
  historicalComparisons?: string[];
  
  // Risk Assessment
  tailRisks?: string[];
  blackSwanEvents?: string[];
  
  // Trading Insights
  optimalEntryZone?: [number, number];
  targetZone?: [number, number];
  stopLossLevel?: number;
  positionSizing?: 'small' | 'medium' | 'large';
}

/**
 * Payout Information
 */
export interface PayoutInfo {
  resolved: boolean;
  winningOutcome?: string;
  payoutRatio?: number;
  resolutionDate?: number;
  payoutDate?: number;
  totalPayout?: number;
  userPayout?: number;
}

/**
 * Detailed Market (for Market Detail View)
 */
export interface DetailedMarket extends ProcessedMarket {
  // Extended Market Information
  resolutionDetails: string;
  marketMakerAddress?: string;
  createdBy?: string;
  resolvedBy?: string;
  
  // Enhanced Trading Data
  orderBook: OrderBook;
  recentTrades: RecentTrade[];
  priceHistory: PriceHistoryPoint[];
  volumeHistory: VolumeHistoryPoint[];
  
  // Market Statistics
  totalTrades: number;
  uniqueTraders: number;
  averageTradeSize: number;
  largestTrade: number;
  
  // Liquidity Metrics
  bidAskSpread: number;
  marketDepth: number;
  liquidityProviders: number;
  
  // User-Specific Data (if authenticated)
  userPosition?: UserPosition;
  userOrders?: UserOrder[];
  userTradeHistory?: UserTrade[];
  
  // Market Health
  healthScore: number; // 0-100
  riskWarnings?: string[];
  tradingRestrictions?: string[];
}

/**
 * Recent Trade
 */
export interface RecentTrade {
  tradeId: string;
  tokenId: string;
  outcome: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  
  // Optional Fields
  traderAddress?: string; // anonymized
  fees?: number;
  isMarketMaker?: boolean;
}

/**
 * Price History Point
 */
export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

/**
 * Volume History Point
 */
export interface VolumeHistoryPoint {
  timestamp: number;
  volume: number;
  tradeCount?: number;
  uniqueTraders?: number;
}

/**
 * User Trade
 */
export interface UserTrade {
  tradeId: string;
  orderId: string;
  tokenId: string;
  marketId: string;
  marketTitle: string;
  outcome: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  fees: number;
  timestamp: number;
  
  // P&L Information
  realizedPnL?: number;
  
  // Trade Context
  orderType: 'limit' | 'market';
  fillType: 'maker' | 'taker';
  
  // User Context
  userAddress: string;
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
// State Management Models
// ============================================================================

/**
 * Application State
 */
export interface AppState {
  markets: MarketState;
  trading: TradingState;
  user: UserState;
  realtime: RealtimeState;
  ui: UIState;
}

/**
 * Market State
 */
export interface MarketState {
  items: ProcessedMarket[];
  loading: boolean;
  error?: string;
  filters: MarketFilters;
  pagination: PaginationState;
  
  // Cache Management
  lastFetch?: number;
  cacheExpiry?: number;
  
  // Search State
  searchQuery?: string;
  searchResults?: ProcessedMarket[];
  searchLoading?: boolean;
  
  // Category State
  categories: Category[];
  activeCategory?: string;
  categoryLoading?: boolean;
}

/**
 * Trading State
 */
export interface TradingState {
  activeMarket?: DetailedMarket;
  orderBook?: OrderBook;
  userOrders: UserOrder[];
  pendingOrders: string[];
  orderHistory: CompletedOrder[];
  
  // Order Form State
  orderForm: OrderFormState;
  
  // Trading Configuration
  slippageTolerance: number;
  defaultOrderSize: number;
  
  // Real-time Trading Data
  recentTrades: RecentTrade[];
  priceUpdates: Record<string, PriceUpdate>;
  
  // Trading Status
  tradingEnabled: boolean;
  tradingError?: string;
}

/**
 * User State
 */
export interface UserState {
  address?: string;
  balance: number;
  balanceFormatted: string;
  positions: UserPosition[];
  connected: boolean;
  connecting: boolean;
  
  // Wallet Information
  walletType?: 'metamask' | 'walletconnect' | 'coinbase';
  chainId?: number;
  
  // User Preferences
  preferences: UserPreferences;
  
  // Portfolio Metrics
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  
  // Authentication
  authenticated: boolean;
  authToken?: string;
  authExpiry?: number;
}

/**
 * Realtime State
 */
export interface RealtimeState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  subscriptions: string[];
  priceUpdates: Record<string, PriceUpdate>;
  orderUpdates: Record<string, OrderUpdate>;
  
  // Connection Management
  connectionAttempts: number;
  lastConnected?: number;
  lastDisconnected?: number;
  
  // Subscription Management
  marketSubscriptions: Set<string>;
  userSubscriptions: Set<string>;
  
  // Error Handling
  connectionError?: string;
  subscriptionErrors: Record<string, string>;
}

/**
 * UI State
 */
export interface UIState {
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'list';
  sidebarOpen: boolean;
  activeModal?: string;
  
  // Layout State
  mobileMenuOpen: boolean;
  filterPanelOpen: boolean;
  tradingPanelOpen: boolean;
  
  // Loading States
  pageLoading: boolean;
  componentLoading: Record<string, boolean>;
  
  // Notifications
  notifications: Notification[];
  
  // Responsive State
  isMobile: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * Order Form State
 */
export interface OrderFormState {
  tokenId?: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  price?: number;
  size?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  
  // Validation
  errors: Record<string, string>;
  isValid: boolean;
  
  // UI State
  loading: boolean;
  submitting: boolean;
  
  // Calculations
  estimatedCost?: number;
  estimatedFees?: number;
  estimatedTotal?: number;
  maxSize?: number;
  minSize?: number;
}

/**
 * User Preferences
 */
export interface UserPreferences {
  defaultSlippage: number;
  defaultOrderSize: number;
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Display Preferences
  showPriceChanges: boolean;
  showVolume: boolean;
  showLiquidity: boolean;
  compactView: boolean;
  
  // Notification Preferences
  orderFillNotifications: boolean;
  priceAlertNotifications: boolean;
  marketUpdateNotifications: boolean;
  
  // Trading Preferences
  confirmOrders: boolean;
  defaultTimeInForce: 'GTC' | 'IOC' | 'FOK';
  riskWarnings: boolean;
}

/**
 * Completed Order
 */
export interface CompletedOrder extends UserOrder {
  completedAt: number;
  finalPrice: number;
  finalSize: number;
  totalFees: number;
  realizedPnL?: number;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  
  // Optional Action
  action?: {
    label: string;
    onClick: () => void;
  };
  
  // Auto-dismiss
  autoDismiss?: boolean;
  dismissAfter?: number;
}

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

// ============================================================================
// Service Interface Types
// ============================================================================

/**
 * Market Discovery Service Parameters
 */
export interface GetEventsParams {
  tagId?: number;
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Market Discovery Service Parameters
 */
export interface GetMarketsParams {
  eventId?: string;
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Search Parameters
 */
export interface SearchParams {
  query: string;
  category?: string;
  limit?: number;
  offset?: number;
  filters?: MarketFilters;
}

/**
 * Price Chart Parameters
 */
export interface PriceChartParams {
  tokenId: string;
  timeframe: '1h' | '24h' | '7d' | '30d';
  resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
}

/**
 * Trading Service Configuration
 */
export interface TradingServiceConfig {
  clobApiUrl: string;
  rateLimitBuffer: number;
  defaultSlippage: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * WebSocket Service Configuration
 */
export interface WebSocketServiceConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptionTimeout: number;
}