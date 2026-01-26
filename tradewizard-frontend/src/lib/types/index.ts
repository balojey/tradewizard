/**
 * Centralized Type Exports for Polymarket Interface Transformation
 * 
 * This file provides a single entry point for all enhanced data models and interfaces.
 * It consolidates types from multiple files and provides organized exports.
 * 
 * Usage:
 * import { ProcessedMarket, ProcessedSeries, MarketTag } from '@/lib/types';
 */

// ============================================================================
// Enhanced Core Types
// ============================================================================

export type {
  // Core Market Models
  ProcessedMarket,
  ProcessedSeries,
  MarketEvent,
  SeriesInfo,
  DetailedMarket,
  
  // Tag System
  MarketTag,
  PoliticsTag,
  
  // Trading Models
  MarketOutcome,
  OrderBook,
  OrderBookEntry,
  UserPosition,
  OrderRequest,
  OrderResponse,
  OrderFees,
  OrderFill,
  UserOrder,
  PriceHistoryPoint,
  VolumeHistoryPoint,
  UserTrade,
  
  // AI Enhancement Models
  AIMarketInsights,
  SeriesAIInsights,
  PayoutInfo,
  
  // State Management Models
  AppState,
  MarketState,
  SeriesState,
  TagState,
  TradingState,
  UserState,
  RealtimeState,
  UIState,
  RoutingState,
  
  // Utility Types
  MarketFilters,
  PaginationState,
  Category,
  OrderFormState,
  UserPreferences,
  
  // WebSocket and Real-time Types
  PriceUpdate,
  OrderUpdate,
  SeriesUpdate,
  RecentTrade,
  CompletedOrder,
  Notification,
  
  // Type Guards and Utilities
  PoliticalTag,
} from '../enhanced-polymarket-types';

// ============================================================================
// Legacy Type Re-exports (for backward compatibility)
// ============================================================================

export type {
  // Legacy Polymarket Types
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  ProcessedEvent,
  ProcessedOutcome,
  MarketType,
  DataProcessingError,
  ProcessingResult,
  ProcessingConfig,
} from '../polymarket-types';

export type {
  // Legacy API Types
  OrderBook as LegacyOrderBook,
  OrderBookEntry as LegacyOrderBookEntry,
  MarketOutcome as LegacyMarketOutcome,
  OrderRequest as LegacyOrderRequest,
  OrderResponse as LegacyOrderResponse,
  UserOrder as LegacyUserOrder,
  UserPosition as LegacyUserPosition,
  ProcessedMarket as LegacyProcessedMarket,
  AIMarketInsights as LegacyAIMarketInsights,
  DetailedMarket as LegacyDetailedMarket,
  RecentTrade as LegacyRecentTrade,
  PriceHistoryPoint as LegacyPriceHistoryPoint,
  VolumeHistoryPoint as LegacyVolumeHistoryPoint,
  UserTrade as LegacyUserTrade,
  ApiConfig,
  WebSocketConfig,
  TradingConfig,
  CacheConfig,
  ApiError,
  TradingError,
  WebSocketError,
  AppState as LegacyAppState,
  MarketState as LegacyMarketState,
  TradingState as LegacyTradingState,
  UserState as LegacyUserState,
  RealtimeState as LegacyRealtimeState,
  UIState as LegacyUIState,
  OrderFormState as LegacyOrderFormState,
  UserPreferences as LegacyUserPreferences,
  CompletedOrder as LegacyCompletedOrder,
  Notification as LegacyNotification,
  ApiResponse,
  LoadingState,
  ConnectionStatus,
  GetEventsParams,
  GetMarketsParams,
  SearchParams,
  PriceChartParams,
  TradingServiceConfig,
  WebSocketServiceConfig,
} from '../polymarket-api-types';

// ============================================================================
// Constants and Defaults
// ============================================================================

export {
  // Enhanced Constants
  DEFAULT_MARKET_FILTERS,
  DEFAULT_PAGINATION,
  DEFAULT_USER_PREFERENCES,
  POLITICAL_TAGS,
  RELATED_POLITICAL_TAGS,
} from '../enhanced-polymarket-types';

export {
  // Legacy Constants
  DEFAULT_PROCESSING_CONFIG,
  POLITICAL_TAGS as LEGACY_POLITICAL_TAGS,
  RELATED_POLITICAL_TAGS as LEGACY_RELATED_POLITICAL_TAGS,
} from '../polymarket-types';

// ============================================================================
// Type Guards and Utility Functions
// ============================================================================

export {
  isSeriesMarket,
  isPoliticsTag,
  isSeriesInsights,
} from '../enhanced-polymarket-types';

// ============================================================================
// Type Aliases for Common Use Cases
// ============================================================================

/**
 * Union type for all order states
 */
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';

/**
 * Union type for all market states
 */
export type MarketStatus = 'active' | 'closed' | 'resolved';

/**
 * Union type for all trading sides
 */
export type TradingSide = 'buy' | 'sell';

/**
 * Union type for all order types
 */
export type OrderType = 'limit' | 'market';

/**
 * Union type for all time in force options
 */
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

/**
 * Union type for all risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Union type for all outcome colors
 */
export type OutcomeColor = 'yes' | 'no' | 'neutral';

/**
 * Union type for all sentiment types
 */
export type SentimentType = 'bullish' | 'bearish' | 'neutral';

/**
 * Union type for all volatility regimes
 */
export type VolatilityRegime = 'low' | 'medium' | 'high';

/**
 * Union type for all liquidity assessments
 */
export type LiquidityAssessment = 'poor' | 'fair' | 'good' | 'excellent';

/**
 * Union type for all connection statuses
 */
export type ConnectionStatusType = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Union type for all notification types
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Union type for all theme options
 */
export type ThemeType = 'light' | 'dark';

/**
 * Union type for all view modes
 */
export type ViewMode = 'grid' | 'list';

/**
 * Union type for all screen sizes
 */
export type ScreenSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Union type for all sort options
 */
export type SortBy = 'volume' | 'liquidity' | 'endDate' | 'probability' | 'series';

/**
 * Union type for all sort orders
 */
export type SortOrder = 'asc' | 'desc';

// ============================================================================
// Utility Type Helpers
// ============================================================================

/**
 * Extract keys from a type that are of a specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Extract the value type from a Record
 */
export type ValueOf<T> = T[keyof T];

/**
 * Create a type with all properties as optional except specified ones
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Create a deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Create a type that excludes null and undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Create a type for API response wrappers
 */
export type APIResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
};

/**
 * Create a type for paginated responses
 */
export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  total: number;
};

/**
 * Create a type for filtered responses
 */
export type FilteredResponse<T> = {
  items: T[];
  filters: {
    category?: string;
    search?: string;
    sortBy: string;
    sortOrder: string;
    showClosed: boolean;
    showNew: boolean;
  };
  appliedFilters: string[];
  total: number;
};