/**
 * Utility functions and clients
 */

export { PolymarketClient, createPolymarketClient } from './polymarket-client.js';
export {
  getAuditTrail,
  getStateAtCheckpoint,
  listCheckpoints,
  queryOpikTraces,
  getOpikTraceUrl,
  GraphExecutionLogger,
  type CheckpointMetadata,
  type OpikTraceQuery,
  type OpikTraceSummary,
} from './audit-logger.js';
export {
  DataIntegrationLayer,
  createDataIntegrationLayer,
  type NewsArticle,
  type PollingData,
  type SocialSentiment,
  type CachedData,
  type DataSourceConfig,
} from './data-integration.js';
export {
  updateAgentMetrics,
  calculateAccuracyScore,
  evaluateOnResolution,
  getPerformanceWeightAdjustment,
  getPerformanceLeaderboard,
  getPerformanceDashboard,
  trackAgentExecution,
  type AgentPerformanceMetrics,
  type MarketResolution,
} from './performance-tracking.js';
export {
  estimateAgentCost,
  getAgentPriority,
  filterAgentsByCost,
  applyCostOptimization,
  createCostOptimizationAuditEntry,
  trackAgentCost,
  AgentPriority,
} from './cost-optimization.js';
export {
  QuotaManager,
  createQuotaManager,
  type APIQuotaManager,
  type QuotaConfig,
} from './api-quota-manager.js';
export {
  PolymarketDiscoveryEngine,
  createMarketDiscoveryEngine,
  type MarketDiscoveryEngine,
  type PolymarketMarket,
  type RankedMarket,
} from './market-discovery.js';

