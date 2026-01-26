/**
 * Enhanced Polymarket Data Models and Interfaces
 * 
 * This file contains enhanced data models for the Polymarket interface transformation,
 * extending existing types with trading fields, series support, and AI insights integration.
 * 
 * Requirements: 4.2, 4.4, 4.5, 13.1, 13.2
 */

// ============================================================================
// Core Enhanced Data Models
// ============================================================================

/**
 * Enhanced ProcessedMarket interface with trading fields and series support
 * Extends the existing ProcessedMarket with comprehensive trading functionality
 */
export interface ProcessedMarket {
  // Core Market Information
  id: string;
  conditionId: string;
  title: string;
  description: string;
  image: string;
  category: string;
  slug: string;
  
  // Market Metadata
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  resolved?: boolean;
  isNew: boolean;
  featured: boolean;
  
  // Series Support (Requirements 13.1, 13.2)
  groupItemTitle?: string; // For series-based market grouping
  groupItemThreshold?: string;
  seriesId?: string; // Reference to parent series
  seriesTitle?: string; // Series title for display
  
  // Market Outcomes with Enhanced Trading Fields
  outcomes: MarketOutcome[];
  
  // Volume and Liquidity Metrics
  volume24h: number;
  volumeFormatted: string;
  liquidity: number;
  liquidityFormatted: string;
  
  // Trading Enhancement Fields (Requirements 4.2, 4.4, 4.5)
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
  maxOrderSize?: number;
  tickSize?: number;
  
  // Market Quality Metrics
  competitiveScore?: number;
  liquidityScore?: number; // 0-10 scale
  volatilityRegime?: 'low' | 'medium' | 'high';
  
  // Resolution Information
  resolutionSource?: string;
  resolutionCriteria?: string;
  resolutionResult?: string;
  payoutInfo?: PayoutInfo;
  
  // Enhanced Tag System
  tags: MarketTag[];
  politicsTags: PoliticsTag[];
  
  // AI Enhancement Fields
  aiInsights?: AIMarketInsights;
  riskLevel?: 'low' | 'medium' | 'high';
  confidence?: number;
  
  // Real-time Status
  lastUpdated?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting';
  
  // Navigation and Routing
  events: MarketEvent[];
}

/**
 * ProcessedSeries model for series-based market grouping
 * New model for handling series-based markets (Requirements 13.1, 13.2)
 */
export interface ProcessedSeries {
  // Core Series Information
  id: string;
  title: string;
  description: string;
  image: string;
  slug: string;
  
  // Series Configuration
  seriesType: string;
  recurrence: string;
  
  // Related Markets
  markets: ProcessedMarket[];
  marketCount: number;
  
  // Aggregate Metrics
  totalVolume: number;
  totalVolumeFormatted: string;
  totalLiquidity: number;
  totalLiquidityFormatted: string;
  
  // Series Timeline
  endDate: string; // Earliest end date from markets
  startDate: string; // Latest start date from markets
  active: boolean;
  
  // Enhanced Tag System
  tags: MarketTag[];
  politicsTags: PoliticsTag[];
  
  // Series Status
  completedMarkets: number;
  activeMarkets: number;
  upcomingMarkets: number;
  
  // AI Enhancement Fields
  seriesInsights?: SeriesAIInsights;
  
  // Real-time Status
  lastUpdated?: number;
}

/**
 * Enhanced MarketEvent model with series support
 * Extends existing MarketEvent with series information
 */
export interface MarketEvent {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  
  // Series Information (Requirements 13.1, 13.2)
  series?: SeriesInfo; // Optional series information
  
  // Event Timeline
  startDate: string;
  endDate: string;
  active: boolean;
  
  // Event Status
  marketCount: number;
  totalVolume: number;
  
  // Enhanced Tag System
  tags: MarketTag[];
}

/**
 * Series Information for events
 */
export interface SeriesInfo {
  id: string;
  title: string;
  slug: string;
  seriesType: string;
  recurrence: string;
  image: string;
  description: string;
}

/**
 * Enhanced MarketTag model for improved filtering
 */
export interface MarketTag {
  id: string;
  label: string;
  slug: string;
  forceShow: boolean;
  forceHide?: boolean;
  
  // Enhanced Tag Properties
  isPolitics: boolean; // Identifies politics-related tags
  category?: string; // Tag category for grouping
  priority?: number; // Display priority
  marketCount?: number; // Number of markets with this tag
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * PoliticsTag model for politics-focused filtering
 * Extends MarketTag specifically for political markets
 */
export interface PoliticsTag extends MarketTag {
  isPolitics: true;
  marketCount: number;
  
  // Politics-specific properties
  electionCycle?: string;
  jurisdiction?: 'federal' | 'state' | 'local' | 'international';
  politicalParty?: string;
  
  // Trending information
  trending?: boolean;
  trendingScore?: number;
}

// ============================================================================
// Trading Models
// ============================================================================

/**
 * Enhanced MarketOutcome model with comprehensive trading fields
 */
export interface MarketOutcome {
  // Core Outcome Information
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
  
  // Series Support
  category?: string; // For complex markets, this is the groupItemTitle
}

/**
 * Detailed Market for Market Detail View
 * Extends ProcessedMarket with comprehensive trading data
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
 * Price History Point for charts
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
 * Volume History Point for charts
 */
export interface VolumeHistoryPoint {
  timestamp: number;
  volume: number;
  tradeCount?: number;
  uniqueTraders?: number;
}

/**
 * User Trade record
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
  
  // Series Context
  seriesId?: string;
  seriesTitle?: string;
}

/**
 * Enhanced OrderBook model with comprehensive market depth information
 */
export interface OrderBook {
  // Core Order Book Data
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
  
  // Market Health Indicators
  healthScore?: number; // 0-100
  riskWarnings?: string[];
}

/**
 * Enhanced OrderBookEntry with additional trading metrics
 */
export interface OrderBookEntry {
  price: string;
  size: string;
  total?: string;
  priceNumber?: number;
  sizeNumber?: number;
  totalNumber?: number;
  orderCount?: number;
  
  // Enhanced Fields
  timestamp?: number;
  side?: 'bid' | 'ask';
  depth?: number; // Distance from best price
}

/**
 * Enhanced UserPosition model with comprehensive P&L tracking
 */
export interface UserPosition {
  // Core Position Information
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
  
  // Series Context
  seriesId?: string;
  seriesTitle?: string;
}

/**
 * Enhanced OrderRequest model with comprehensive order parameters
 */
export interface OrderRequest {
  // Core Order Information
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
  
  // Market Context
  marketId?: string;
  marketTitle?: string;
  outcome?: string;
}

/**
 * Enhanced OrderResponse model with detailed execution information
 */
export interface OrderResponse {
  // Core Response Information
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
  
  // User Context
  userAddress?: string;
}

/**
 * Order execution fees breakdown
 */
export interface OrderFees {
  makerFee: number;
  takerFee: number;
  totalFees: number;
  feeToken: string;
  gasFee?: number;
}

/**
 * Individual order fill record
 */
export interface OrderFill {
  fillId: string;
  price: number;
  size: number;
  timestamp: number;
  fees: number;
  side: 'maker' | 'taker';
  counterpartyOrderId?: string;
}

/**
 * Enhanced UserOrder model with comprehensive order tracking
 */
export interface UserOrder {
  // Core Order Information
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
  
  // Series Context
  seriesId?: string;
  seriesTitle?: string;
}

// ============================================================================
// AI Enhancement Models
// ============================================================================

/**
 * Enhanced AI Market Insights with comprehensive analysis
 */
export interface AIMarketInsights {
  // Core Insights
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
  
  // Recommendation
  recommendation?: 'buy' | 'sell' | 'hold';
  recommendationStrength?: number; // 0-100
}

/**
 * AI Insights for Series-based markets
 */
export interface SeriesAIInsights {
  // Series-level Analysis
  seriesSummary: string;
  seriesTrend: 'bullish' | 'bearish' | 'neutral';
  correlationAnalysis: string[];
  
  // Market Relationships
  marketCorrelations: Record<string, number>;
  leadingIndicators: string[];
  
  // Series Strategy
  seriesStrategy: string;
  optimalAllocation: Record<string, number>;
  
  // Risk Assessment
  seriesRisk: 'low' | 'medium' | 'high';
  diversificationBenefit: number;
  
  // Metadata
  confidence: number;
  lastUpdated: number;
}

/**
 * Payout information for resolved markets
 */
export interface PayoutInfo {
  resolved: boolean;
  winningOutcome?: string;
  payoutRatio?: number;
  resolutionDate?: number;
  payoutDate?: number;
  totalPayout?: number;
  userPayout?: number;
  
  // Enhanced Payout Fields
  resolutionSource?: string;
  resolutionEvidence?: string[];
  disputePeriod?: {
    start: number;
    end: number;
    active: boolean;
  };
}

// ============================================================================
// State Management Models
// ============================================================================

/**
 * Enhanced Application State with series support
 */
export interface AppState {
  markets: MarketState;
  series: SeriesState;
  tags: TagState;
  trading: TradingState;
  user: UserState;
  realtime: RealtimeState;
  ui: UIState;
  routing: RoutingState;
}

/**
 * Enhanced Market State with series integration
 */
export interface MarketState {
  // Core Market Data
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
  
  // Series Integration
  seriesMarkets: Record<string, ProcessedMarket[]>;
  individualMarkets: ProcessedMarket[];
}

/**
 * Series State management
 */
export interface SeriesState {
  // Core Series Data
  items: ProcessedSeries[];
  loading: boolean;
  error?: string;
  
  // Active Series
  activeSeries?: ProcessedSeries;
  seriesMarkets: Record<string, ProcessedMarket[]>;
  
  // Cache Management
  lastFetch?: number;
  cacheExpiry?: number;
}

/**
 * Enhanced Tag State with politics focus
 */
export interface TagState {
  // All Tags
  allTags: MarketTag[];
  
  // Politics-focused Tags
  politicsTags: PoliticsTag[];
  activeTag: string | null;
  loading: boolean;
  error?: string;
  
  // Tag Analytics
  tagMarketCounts: Record<string, number>;
  trendingTags: PoliticsTag[];
  
  // Cache Management
  lastFetch?: number;
  cacheExpiry?: number;
}

/**
 * Enhanced Trading State with series support
 */
export interface TradingState {
  // Active Markets
  activeMarket?: DetailedMarket;
  activeSeries?: ProcessedSeries;
  
  // Order Book and Trading Data
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
  
  // Series Trading
  seriesPositions: Record<string, UserPosition[]>;
  seriesOrders: Record<string, UserOrder[]>;
}

/**
 * Enhanced User State with comprehensive portfolio tracking
 */
export interface UserState {
  // Authentication
  address?: string;
  connected: boolean;
  connecting: boolean;
  authenticated: boolean;
  authToken?: string;
  authExpiry?: number;
  
  // Wallet Information
  balance: number;
  balanceFormatted: string;
  walletType?: 'metamask' | 'walletconnect' | 'coinbase';
  chainId?: number;
  
  // Portfolio
  positions: UserPosition[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  
  // Series Positions
  seriesPositions: Record<string, UserPosition[]>;
  seriesAllocations: Record<string, number>;
  
  // User Preferences
  preferences: UserPreferences;
}

/**
 * Enhanced Realtime State with series support
 */
export interface RealtimeState {
  // Connection Status
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  
  // Subscriptions
  subscriptions: string[];
  marketSubscriptions: Set<string>;
  seriesSubscriptions: Set<string>;
  userSubscriptions: Set<string>;
  
  // Real-time Updates
  priceUpdates: Record<string, PriceUpdate>;
  orderUpdates: Record<string, OrderUpdate>;
  seriesUpdates: Record<string, SeriesUpdate>;
  
  // Connection Management
  connectionAttempts: number;
  lastConnected?: number;
  lastDisconnected?: number;
  
  // Error Handling
  connectionError?: string;
  subscriptionErrors: Record<string, string>;
}

/**
 * Enhanced UI State with series navigation
 */
export interface UIState {
  // Theme and Layout
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'list';
  sidebarOpen: boolean;
  activeModal?: string;
  
  // Layout State
  mobileMenuOpen: boolean;
  filterPanelOpen: boolean;
  tradingPanelOpen: boolean;
  seriesPanelOpen: boolean;
  
  // Loading States
  pageLoading: boolean;
  componentLoading: Record<string, boolean>;
  
  // Notifications
  notifications: Notification[];
  
  // Responsive State
  isMobile: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Series UI State
  seriesViewMode: 'expanded' | 'collapsed';
  activeSeriesTab?: string;
}

/**
 * Enhanced Routing State with series navigation
 */
export interface RoutingState {
  currentRoute: string;
  marketSlug?: string;
  seriesSlug?: string;
  tagSlug?: string;
  
  // Navigation History
  previousRoute?: string;
  navigationHistory: string[];
  
  // Route Parameters
  routeParams: Record<string, string>;
  queryParams: Record<string, string>;
}

// ============================================================================
// Utility and Helper Types
// ============================================================================

/**
 * Market Filters with series support
 */
export interface MarketFilters {
  category?: string;
  search?: string;
  sortBy: 'volume' | 'liquidity' | 'endDate' | 'probability' | 'series';
  sortOrder: 'asc' | 'desc';
  showClosed: boolean;
  showNew: boolean;
  showSeries: boolean;
  showIndividual: boolean;
  minVolume?: number;
  maxVolume?: number;
  
  // Politics-specific filters
  politicsOnly?: boolean;
  electionCycle?: string;
  jurisdiction?: string;
}

/**
 * Enhanced Pagination State
 */
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  
  // Series Pagination
  seriesPage?: number;
  seriesLimit?: number;
  seriesTotal?: number;
  seriesHasMore?: boolean;
}

/**
 * Category with enhanced metadata
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  active: boolean;
  
  // Enhanced Category Fields
  seriesCount?: number;
  individualCount?: number;
  isPolitics?: boolean;
  priority?: number;
}

/**
 * Order Form State with comprehensive validation
 */
export interface OrderFormState {
  // Order Parameters
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
  
  // Market Context
  marketId?: string;
  marketTitle?: string;
  outcome?: string;
  seriesId?: string;
}

/**
 * User Preferences with series settings
 */
export interface UserPreferences {
  // Trading Preferences
  defaultSlippage: number;
  defaultOrderSize: number;
  autoRefresh: boolean;
  refreshInterval: number;
  
  // Display Preferences
  showPriceChanges: boolean;
  showVolume: boolean;
  showLiquidity: boolean;
  compactView: boolean;
  showSeries: boolean;
  groupBySeries: boolean;
  
  // Notification Preferences
  orderFillNotifications: boolean;
  priceAlertNotifications: boolean;
  marketUpdateNotifications: boolean;
  seriesUpdateNotifications: boolean;
  
  // Trading Preferences
  confirmOrders: boolean;
  defaultTimeInForce: 'GTC' | 'IOC' | 'FOK';
  riskWarnings: boolean;
  
  // Series Preferences
  defaultSeriesView: 'expanded' | 'collapsed';
  seriesNotifications: boolean;
}

// ============================================================================
// WebSocket and Real-time Types
// ============================================================================

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
  
  // Enhanced Price Update Fields
  marketId?: string;
  seriesId?: string;
  high24h?: number;
  low24h?: number;
  tradeCount?: number;
}

/**
 * Order Update from WebSocket
 */
export interface OrderUpdate {
  type: 'order_update';
  orderId: string;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
  fillPrice?: number;
  fillSize?: number;
  remainingSize?: number;
  timestamp: number;
  
  // Enhanced Order Update Fields
  marketId?: string;
  seriesId?: string;
  userAddress?: string;
  fees?: number;
}

/**
 * Series Update from WebSocket
 */
export interface SeriesUpdate {
  type: 'series_update';
  seriesId: string;
  totalVolume: number;
  activeMarkets: number;
  timestamp: number;
  
  // Market Updates within Series
  marketUpdates?: {
    marketId: string;
    volume: number;
    price: number;
  }[];
}

/**
 * Recent Trade with series context
 */
export interface RecentTrade {
  tradeId: string;
  tokenId: string;
  outcome: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  
  // Enhanced Trade Fields
  marketId?: string;
  seriesId?: string;
  traderAddress?: string; // anonymized
  fees?: number;
  isMarketMaker?: boolean;
}

/**
 * Completed Order with comprehensive execution details
 */
export interface CompletedOrder extends UserOrder {
  completedAt: number;
  finalPrice: number;
  finalSize: number;
  totalFees: number;
  realizedPnL?: number;
  
  // Enhanced Completion Fields
  executionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  slippageExperienced?: number;
  fillRate?: number; // percentage of order filled
}

/**
 * Notification with series context
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  
  // Context Information
  marketId?: string;
  seriesId?: string;
  orderId?: string;
  
  // Optional Action
  action?: {
    label: string;
    onClick: () => void;
  };
  
  // Auto-dismiss
  autoDismiss?: boolean;
  dismissAfter?: number;
}

// ============================================================================
// Type Guards and Utility Functions
// ============================================================================

/**
 * Type guard to check if a market belongs to a series
 */
export function isSeriesMarket(market: ProcessedMarket): boolean {
  return !!(market.seriesId || market.groupItemTitle);
}

/**
 * Type guard to check if a tag is a politics tag
 */
export function isPoliticsTag(tag: MarketTag): tag is PoliticsTag {
  return tag.isPolitics === true;
}

/**
 * Type guard to check if insights are series insights
 */
export function isSeriesInsights(insights: AIMarketInsights | SeriesAIInsights): insights is SeriesAIInsights {
  return 'seriesSummary' in insights;
}

// ============================================================================
// Constants and Defaults
// ============================================================================

/**
 * Default market filters
 */
export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  sortBy: 'volume',
  sortOrder: 'desc',
  showClosed: false,
  showNew: true,
  showSeries: true,
  showIndividual: true,
  politicsOnly: false,
};

/**
 * Default pagination state
 */
export const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  hasMore: false,
};

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultSlippage: 0.5,
  defaultOrderSize: 10,
  autoRefresh: true,
  refreshInterval: 30000,
  showPriceChanges: true,
  showVolume: true,
  showLiquidity: true,
  compactView: false,
  showSeries: true,
  groupBySeries: true,
  orderFillNotifications: true,
  priceAlertNotifications: true,
  marketUpdateNotifications: false,
  seriesUpdateNotifications: true,
  confirmOrders: true,
  defaultTimeInForce: 'GTC',
  riskWarnings: true,
  defaultSeriesView: 'expanded',
  seriesNotifications: true,
};

/**
 * Political tag constants for filtering
 */
export const POLITICAL_TAGS = {
  POLITICS: 'politics',
  TRUMP: 'trump',
  ELECTIONS: 'elections',
  US_POLITICS: 'u-s-politics',
  IMMIGRATION: 'immigration',
  WORLD: 'world',
  FRANCE: 'france',
  MACRON: 'macron',
  BIDEN: 'biden',
  CONGRESS: 'congress',
  SENATE: 'senate',
  HOUSE: 'house',
  SUPREME_COURT: 'supreme-court',
  FOREIGN_POLICY: 'foreign-policy',
} as const;

/**
 * Related political tags that should be shown in the tag bar
 */
export const RELATED_POLITICAL_TAGS = [
  POLITICAL_TAGS.TRUMP,
  POLITICAL_TAGS.ELECTIONS,
  POLITICAL_TAGS.US_POLITICS,
  POLITICAL_TAGS.IMMIGRATION,
  POLITICAL_TAGS.WORLD,
  POLITICAL_TAGS.BIDEN,
  POLITICAL_TAGS.CONGRESS,
] as const;

export type PoliticalTag = typeof POLITICAL_TAGS[keyof typeof POLITICAL_TAGS];