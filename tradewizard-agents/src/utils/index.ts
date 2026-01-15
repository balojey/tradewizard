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

