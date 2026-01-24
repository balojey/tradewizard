/**
 * Polymarket API Configuration
 * Centralized configuration for all Polymarket API integrations
 */

import type { 
  ApiConfig, 
  WebSocketConfig, 
  TradingConfig, 
  CacheConfig 
} from './polymarket-api-types';

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefixed variables
    return process.env[`NEXT_PUBLIC_${key}`] || fallback;
  }
  // Server-side: can access all environment variables
  return process.env[`NEXT_PUBLIC_${key}`] || process.env[key] || fallback;
}

/**
 * Get environment variable as number with fallback
 */
function getEnvNumber(key: string, fallback: number): number {
  const value = getEnvVar(key, fallback.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ============================================================================
// API Configuration
// ============================================================================

/**
 * Polymarket API Configuration
 */
export const POLYMARKET_CONFIG: ApiConfig = {
  gammaApiUrl: getEnvVar('POLYMARKET_GAMMA_API_URL', 'https://gamma-api.polymarket.com'),
  clobApiUrl: getEnvVar('POLYMARKET_CLOB_API_URL', 'https://clob.polymarket.com'),
  dataApiUrl: getEnvVar('POLYMARKET_DATA_API_URL', 'https://data-api.polymarket.com'),
  websocketUrl: getEnvVar('POLYMARKET_WEBSOCKET_URL', 'wss://ws-subscriptions-clob.polymarket.com/ws/market'),
  rateLimitBuffer: getEnvNumber('POLYMARKET_RATE_LIMIT_BUFFER', 80),
  politicsTagId: getEnvNumber('POLYMARKET_POLITICS_TAG_ID', 2),
  maxEventsPerDiscovery: getEnvNumber('POLYMARKET_MAX_EVENTS_PER_DISCOVERY', 20),
  maxMarketsPerEvent: getEnvNumber('POLYMARKET_MAX_MARKETS_PER_EVENT', 50),
  defaultSortBy: getEnvVar('POLYMARKET_DEFAULT_SORT_BY', 'volume24hr'),
};

/**
 * WebSocket Configuration
 */
export const WEBSOCKET_CONFIG: WebSocketConfig = {
  url: POLYMARKET_CONFIG.websocketUrl,
  reconnectInterval: getEnvNumber('WS_RECONNECT_INTERVAL', 5000),
  maxReconnectAttempts: getEnvNumber('WS_MAX_RECONNECT_ATTEMPTS', 10),
  heartbeatInterval: getEnvNumber('WS_HEARTBEAT_INTERVAL', 30000),
};

/**
 * Trading Configuration
 */
export const TRADING_CONFIG: TradingConfig = {
  defaultSlippageTolerance: parseFloat(getEnvVar('DEFAULT_SLIPPAGE_TOLERANCE', '0.01')),
  minOrderSize: getEnvNumber('MIN_ORDER_SIZE', 1),
  maxOrderSize: getEnvNumber('MAX_ORDER_SIZE', 10000),
};

/**
 * Cache Configuration
 */
export const CACHE_CONFIG: CacheConfig = {
  marketCacheTtl: getEnvNumber('MARKET_CACHE_TTL', 60000), // 1 minute
  priceCacheTtl: getEnvNumber('PRICE_CACHE_TTL', 5000),    // 5 seconds
  userCacheTtl: getEnvNumber('USER_CACHE_TTL', 30000),     // 30 seconds
};

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Gamma API Endpoints
 */
export const GAMMA_ENDPOINTS = {
  events: '/events',
  markets: '/markets',
  tags: '/tags',
  search: '/search',
} as const;

/**
 * CLOB API Endpoints
 */
export const CLOB_ENDPOINTS = {
  orderBook: '/book',
  orders: '/orders',
  trades: '/trades',
  positions: '/positions',
  balance: '/balance',
} as const;

/**
 * Data API Endpoints
 */
export const DATA_ENDPOINTS = {
  user: '/user',
  positions: '/positions',
  orders: '/orders',
  history: '/history',
} as const;

// ============================================================================
// Constants
// ============================================================================

/**
 * Market Categories
 */
export const MARKET_CATEGORIES = [
  { id: 'all', name: 'All Markets', slug: 'all' },
  { id: 'politics', name: 'Politics', slug: 'politics' },
  { id: 'sports', name: 'Sports', slug: 'sports' },
  { id: 'crypto', name: 'Crypto', slug: 'crypto' },
  { id: 'finance', name: 'Finance', slug: 'finance' },
  { id: 'science', name: 'Science', slug: 'science' },
  { id: 'entertainment', name: 'Entertainment', slug: 'entertainment' },
] as const;

/**
 * Sort Options
 */
export const SORT_OPTIONS = [
  { value: 'volume', label: 'Volume' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'endDate', label: 'End Date' },
  { value: 'probability', label: 'Probability' },
] as const;

/**
 * Time Ranges for Charts
 */
export const TIME_RANGES = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
] as const;

/**
 * Order Types
 */
export const ORDER_TYPES = [
  { value: 'limit', label: 'Limit Order' },
  { value: 'market', label: 'Market Order' },
] as const;

/**
 * Time in Force Options
 */
export const TIME_IN_FORCE_OPTIONS = [
  { value: 'GTC', label: 'Good Till Cancelled' },
  { value: 'IOC', label: 'Immediate or Cancel' },
  { value: 'FOK', label: 'Fill or Kill' },
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build API URL
 */
export function buildApiUrl(baseUrl: string, endpoint: string, params?: Record<string, string | number>): string {
  const url = new URL(endpoint, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });
  }
  
  return url.toString();
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Format probability for display
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

/**
 * Get outcome color class
 */
export function getOutcomeColor(outcome: string): string {
  const lowerOutcome = outcome.toLowerCase();
  if (lowerOutcome.includes('yes') || lowerOutcome.includes('true')) {
    return 'text-emerald-600';
  }
  if (lowerOutcome.includes('no') || lowerOutcome.includes('false')) {
    return 'text-red-600';
  }
  return 'text-gray-600';
}

/**
 * Get outcome background color class
 */
export function getOutcomeBackgroundColor(outcome: string): string {
  const lowerOutcome = outcome.toLowerCase();
  if (lowerOutcome.includes('yes') || lowerOutcome.includes('true')) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (lowerOutcome.includes('no') || lowerOutcome.includes('false')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

/**
 * Calculate price change color
 */
export function getPriceChangeColor(change: number): string {
  if (change > 0) return 'text-emerald-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
}

/**
 * Format price change
 */
export function formatPriceChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${(change * 100).toFixed(2)}%`;
}

/**
 * Validate order parameters
 */
export function validateOrderParams(
  price: number, 
  size: number, 
  balance: number
): { valid: boolean; error?: string } {
  if (price <= 0 || price > 1) {
    return { valid: false, error: 'Price must be between 0 and 1' };
  }
  
  if (size < TRADING_CONFIG.minOrderSize) {
    return { valid: false, error: `Minimum order size is ${TRADING_CONFIG.minOrderSize}` };
  }
  
  if (size > TRADING_CONFIG.maxOrderSize) {
    return { valid: false, error: `Maximum order size is ${TRADING_CONFIG.maxOrderSize}` };
  }
  
  const totalCost = price * size;
  if (totalCost > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  return { valid: true };
}

/**
 * Calculate order total
 */
export function calculateOrderTotal(price: number, size: number): number {
  return price * size;
}

/**
 * Calculate potential profit
 */
export function calculatePotentialProfit(
  entryPrice: number, 
  exitPrice: number, 
  size: number
): number {
  return (exitPrice - entryPrice) * size;
}

/**
 * Get market status
 */
export function getMarketStatus(market: { active: boolean; closed: boolean; endDate: string }): {
  status: 'active' | 'closed' | 'ending_soon';
  label: string;
  color: string;
} {
  if (market.closed) {
    return {
      status: 'closed',
      label: 'Closed',
      color: 'text-gray-600 bg-gray-100',
    };
  }
  
  if (!market.active) {
    return {
      status: 'closed',
      label: 'Inactive',
      color: 'text-gray-600 bg-gray-100',
    };
  }
  
  const endDate = new Date(market.endDate);
  const now = new Date();
  const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilEnd <= 24) {
    return {
      status: 'ending_soon',
      label: 'Ending Soon',
      color: 'text-orange-600 bg-orange-100',
    };
  }
  
  return {
    status: 'active',
    label: 'Active',
    color: 'text-emerald-600 bg-emerald-100',
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if error is an API error
 */
export function isApiError(error: unknown): error is { message: string; status?: number } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * Check if market is active
 */
export function isMarketActive(market: { active: boolean; closed: boolean }): boolean {
  return market.active && !market.closed;
}

/**
 * Check if market is tradeable
 */
export function isMarketTradeable(market: { 
  active: boolean; 
  closed: boolean; 
  enableOrderBook: boolean;
  acceptingOrders?: boolean;
}): boolean {
  return market.active && 
         !market.closed && 
         market.enableOrderBook && 
         (market.acceptingOrders !== false);
}