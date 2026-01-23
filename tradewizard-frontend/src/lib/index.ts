/**
 * Polymarket Data Processing Layer - Main Export
 * 
 * This module provides comprehensive data processing utilities for Polymarket API integration
 * with robust error handling, fallback mechanisms, and TypeScript type safety.
 */

// Core data processing functions
export {
  // Enhanced API functions
  getEventsWithProcessing,
  getPoliticalEvents,
  getEventsByPoliticalTag,
  getTrendingPoliticalEvents,
  getAvailablePoliticalTags,
  searchEvents,
  getEventById,
  getEventBySlug,
  
  // Utility functions
  isPoliticalTag,
  getPoliticalTagDisplayName,
  
  // Legacy compatibility
  getEvents,
  getTrendingEvents,
  API_BASE_URL,
} from './polymarket-data';

// Data parsing utilities
export {
  parseMarketOutcomes,
  parseMarketPrices,
  determineMarketType,
  formatVolume,
  isPoliticalEvent,
  processEvent,
  processEvents,
  filterPoliticalEvents,
  filterEventsByTag,
  validateMarketData,
  validateEventData,
} from './polymarket-parser';

// Type definitions
export type {
  // Core types
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  ProcessedEvent,
  ProcessedOutcome,
  MarketType,
  
  // Processing types
  ProcessingResult,
  DataProcessingError,
  ProcessingConfig,
  PoliticalTag,
} from './polymarket-types';

// Enhanced API types
export type {
  EnhancedGetEventsParams,
} from './polymarket-data';

// Constants
export {
  POLITICAL_TAGS,
  RELATED_POLITICAL_TAGS,
  DEFAULT_PROCESSING_CONFIG,
} from './polymarket-types';

// Error handling utilities
export {
  PolymarketErrorHandler,
  globalErrorHandler,
  createFallbackEvent,
  createFallbackOutcomes,
  retryWithBackoff,
  CircuitBreaker,
  polymarketCircuitBreaker,
  validateNetworkResponse,
  handleRateLimit,
  safeJsonParseWithContext,
  APIHealthMonitor,
  apiHealthMonitor,
} from './polymarket-errors';

export type {
  EnhancedError,
  ErrorSeverity,
} from './polymarket-errors';

// Legacy compatibility exports
export type {
  Event,
  Market,
  Outcome,
  GetEventsParams,
} from './polymarket';