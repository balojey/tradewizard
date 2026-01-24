/**
 * Service Layer Exports
 * Central export point for all API services
 */

// Market Discovery Service
export {
  type MarketDiscoveryService,
  type MarketDiscoveryConfig,
  PolymarketDiscoveryService,
  createMarketDiscoveryService,
  marketDiscoveryService,
} from './market-discovery';

// Trading Service
export {
  type TradingService,
  PolymarketTradingService,
  createTradingService,
  tradingService,
} from './trading';

// Service Configuration Types
export type {
  TradingServiceConfig,
  WebSocketServiceConfig,
} from '../polymarket-api-types';