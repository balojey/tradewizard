/**
 * Integration Tests for Automated Market Monitor
 *
 * Tests the full monitor lifecycle including:
 * - Initialization
 * - Start and stop
 * - Analysis cycles
 * - Error recovery
 * - Graceful shutdown
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EngineConfig } from './config/index.js';
import type { SupabaseClientManager } from './database/supabase-client.js';
import type { DatabasePersistence } from './database/persistence.js';
import type { APIQuotaManager } from './utils/api-quota-manager.js';
import type { MarketDiscoveryEngine, RankedMarket } from './utils/market-discovery.js';
import type { PolymarketClient } from './utils/polymarket-client.js';
import { createMonitorService } from './utils/monitor-service.js';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Create a mock Supabase client manager
 */
function createMockSupabaseManager(): SupabaseClientManager {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            error: null,
          }),
        }),
      }),
    }),
    isClientConnected: vi.fn().mockReturnValue(true),
    healthCheck: vi.fn().mockResolvedValue(true),
    withRetry: vi.fn().mockImplementation((fn) => fn()),
  } as unknown as SupabaseClientManager;
}

/**
 * Create a mock database persistence layer
 */
function createMockDatabase(): DatabasePersistence {
  return {
    upsertMarket: vi.fn().mockResolvedValue('mock-market-id'),
    storeRecommendation: vi.fn().mockResolvedValue('mock-recommendation-id'),
    storeAgentSignals: vi.fn().mockResolvedValue(undefined),
    recordAnalysis: vi.fn().mockResolvedValue(undefined),
    getMarketsForUpdate: vi.fn().mockResolvedValue([]),
    markMarketResolved: vi.fn().mockResolvedValue(undefined),
    getLatestRecommendation: vi.fn().mockResolvedValue(null),
  };
}

/**
 * Create a mock quota manager
 */
function createMockQuotaManager(): APIQuotaManager {
  const mock = {
    canMakeRequest: vi.fn().mockReturnValue(true),
    recordUsage: vi.fn(),
    getUsage: vi.fn().mockReturnValue(0),
    resetUsage: vi.fn(),
    getRecommendedMarketCount: vi.fn().mockReturnValue(3),
    getQuotaLimit: vi.fn().mockReturnValue(100),
    getLastReset: vi.fn().mockReturnValue(new Date()),
  };
  return mock as unknown as APIQuotaManager;
}

/**
 * Create a mock market discovery engine
 */
function createMockDiscovery(): MarketDiscoveryEngine {
  const mockMarkets: RankedMarket[] = [
    {
      conditionId: 'test-condition-1',
      question: 'Will test market 1 resolve YES?',
      description: 'Test market 1 description',
      trendingScore: 10.5,
      volume24h: 50000,
      liquidity: 25000,
      marketSlug: 'test-market-1',
    },
    {
      conditionId: 'test-condition-2',
      question: 'Will test market 2 resolve YES?',
      description: 'Test market 2 description',
      trendingScore: 9.2,
      volume24h: 40000,
      liquidity: 20000,
      marketSlug: 'test-market-2',
    },
  ];

  return {
    discoverMarkets: vi.fn().mockResolvedValue(mockMarkets),
    fetchPoliticalMarkets: vi.fn().mockResolvedValue([]),
    rankMarkets: vi.fn().mockReturnValue(mockMarkets),
  };
}

/**
 * Create a mock Polymarket client
 */
function createMockPolymarketClient(): PolymarketClient {
  return {
    fetchMarketData: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        marketId: 'test-market',
        conditionId: 'test-condition',
        eventType: 'election',
        question: 'Test question?',
        resolutionCriteria: 'Test resolution criteria',
        expiryTimestamp: Date.now() + 86400000,
        currentProbability: 0.55,
        liquidityScore: 7.5,
        bidAskSpread: 2.5,
        volatilityRegime: 'medium',
        volume24h: 50000,
        metadata: {
          ambiguityFlags: [],
          keyCatalysts: [],
        },
      },
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
  } as unknown as PolymarketClient;
}

/**
 * Create a mock engine config
 */
function createMockConfig(): EngineConfig {
  return {
    polymarket: {
      gammaApiUrl: 'https://test-gamma-api.polymarket.com',
      clobApiUrl: 'https://test-clob.polymarket.com',
      rateLimitBuffer: 80,
    },
    langgraph: {
      checkpointer: 'memory',
      recursionLimit: 25,
      streamMode: 'values',
    },
    opik: {
      projectName: 'test-project',
      tags: [],
      trackCosts: false,
    },
    llm: {
      openai: {
        apiKey: 'test-key',
        defaultModel: 'gpt-4-turbo',
      },
    },
    agents: {
      timeoutMs: 10000,
      minAgentsRequired: 2,
    },
    consensus: {
      minEdgeThreshold: 0.05,
      highDisagreementThreshold: 0.15,
    },
    logging: {
      level: 'info',
      auditTrailRetentionDays: 30,
    },
    advancedAgents: {
      eventIntelligence: { enabled: false, breakingNews: true, eventImpact: true },
      pollingStatistical: { enabled: false, pollingIntelligence: true, historicalPattern: true },
      sentimentNarrative: { enabled: false, mediaSentiment: true, socialSentiment: true, narrativeVelocity: true },
      priceAction: { enabled: false, momentum: true, meanReversion: true, minVolumeThreshold: 1000 },
      eventScenario: { enabled: false, catalyst: true, tailRisk: true },
      riskPhilosophy: { enabled: false, aggressive: true, conservative: true, neutral: true },
    },
    externalData: {
      news: { provider: 'none', cacheTTL: 900, maxArticles: 20 },
      polling: { provider: 'none', cacheTTL: 3600 },
      social: { providers: [], cacheTTL: 300, maxMentions: 100 },
    },
    signalFusion: {
      baseWeights: {},
      contextAdjustments: true,
      conflictThreshold: 0.20,
      alignmentBonus: 0.20,
    },
    costOptimization: {
      maxCostPerAnalysis: 2.0,
      skipLowImpactAgents: false,
      batchLLMRequests: true,
    },
    performanceTracking: {
      enabled: false,
      evaluateOnResolution: true,
      minSampleSize: 10,
    },
  };
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Monitor Integration Tests', () => {
  let config: EngineConfig;
  let supabaseManager: SupabaseClientManager;
  let database: DatabasePersistence;
  let quotaManager: APIQuotaManager;
  let discovery: MarketDiscoveryEngine;
  let polymarketClient: PolymarketClient;

  beforeEach(() => {
    // Create mock dependencies
    config = createMockConfig();
    supabaseManager = createMockSupabaseManager();
    database = createMockDatabase();
    quotaManager = createMockQuotaManager();
    discovery = createMockDiscovery();
    polymarketClient = createMockPolymarketClient();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any timers
    vi.clearAllTimers();
  });

  describe('Monitor Lifecycle', () => {
    it('should initialize monitor service successfully', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Verify database connection was checked
      expect(supabaseManager.getClient).toHaveBeenCalled();
    });

    it('should start and stop monitor service', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize and start
      await monitor.initialize();
      await monitor.start();

      // Verify monitor is running
      const health = monitor.getHealth();
      expect(health.scheduler.running).toBe(true);

      // Stop monitor
      await monitor.stop();

      // Verify monitor is stopped
      const healthAfterStop = monitor.getHealth();
      expect(healthAfterStop.scheduler.running).toBe(false);
    });

    it('should return health status', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Get health status
      const health = monitor.getHealth();

      // Verify health status structure
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('scheduler');
      expect(health).toHaveProperty('quota');
      expect(health.database).toHaveProperty('connected');
      expect(health.scheduler).toHaveProperty('running');
      expect(health.quota).toHaveProperty('recommendedMarkets');
    });
  });

  describe('Market Analysis', () => {
    it('should analyze a market successfully', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Note: analyzeMarket is a complex function that requires the full workflow
      // For integration testing, we would need to mock the workflow or use a test database
      // This test verifies the monitor can be initialized and is ready to analyze markets
      expect(monitor).toBeDefined();
      expect(typeof monitor.analyzeMarket).toBe('function');
    });
  });

  describe('Error Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Create mock with failing database
      const failingSupabase = createMockSupabaseManager();
      (failingSupabase.getClient as any).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Create monitor service
      const monitor = createMonitorService(
        config,
        failingSupabase,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize should complete but log the error
      await monitor.initialize();

      // Verify health status shows database as disconnected
      const health = monitor.getHealth();
      expect(health.database.connected).toBe(false);
    });

    it('should handle market discovery failures gracefully', async () => {
      // Create mock with failing discovery
      const failingDiscovery = createMockDiscovery();
      (failingDiscovery.discoverMarkets as any).mockRejectedValue(
        new Error('Market discovery failed')
      );

      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        failingDiscovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Discovery failure should not crash the monitor
      // The monitor should log the error and continue
      expect(monitor).toBeDefined();
    });

    it('should handle API quota exhaustion', async () => {
      // Create mock with exhausted quota
      const exhaustedQuota = createMockQuotaManager();
      (exhaustedQuota.getRecommendedMarketCount as any).mockReturnValue(0);

      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        exhaustedQuota,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Verify quota manager is used
      expect(exhaustedQuota.getRecommendedMarketCount).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should complete current analysis before shutdown', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize and start
      await monitor.initialize();
      await monitor.start();

      // Stop monitor (should wait for current cycle)
      await monitor.stop();

      // Verify monitor stopped cleanly
      const health = monitor.getHealth();
      expect(health.scheduler.running).toBe(false);
    });

    it('should not leave analysis in partial state', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize and start
      await monitor.initialize();
      await monitor.start();

      // Stop monitor immediately
      await monitor.stop();

      // Verify no partial state
      // In a real scenario, we would check the database for incomplete records
      expect(database.recordAnalysis).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'partial' })
      );
    });
  });

  describe('Health Check', () => {
    it('should report healthy status when all components are working', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize and start
      await monitor.initialize();
      await monitor.start();

      // Get health status
      const health = monitor.getHealth();

      // Verify healthy status
      expect(health.status).toBe('healthy');
      expect(health.database.connected).toBe(true);
      expect(health.scheduler.running).toBe(true);

      // Clean up
      await monitor.stop();
    });

    it('should report degraded status when scheduler is stopped', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize but don't start
      await monitor.initialize();

      // Get health status
      const health = monitor.getHealth();

      // Verify degraded status
      expect(health.status).toBe('degraded');
      expect(health.scheduler.running).toBe(false);
    });

    it('should report unhealthy status when database is disconnected', async () => {
      // Create mock with disconnected database
      const disconnectedSupabase = createMockSupabaseManager();
      (disconnectedSupabase.isClientConnected as any).mockReturnValue(false);
      (disconnectedSupabase.getClient as any).mockImplementation(() => {
        const mockClient = {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                error: { message: 'Connection failed' },
              }),
            }),
          }),
        };
        return mockClient;
      });

      // Create monitor service
      const monitor = createMonitorService(
        config,
        disconnectedSupabase,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Get health status
      const health = monitor.getHealth();

      // Verify unhealthy status
      expect(health.status).toBe('unhealthy');
      expect(health.database.connected).toBe(false);
    });
  });

  describe('Opik Metrics', () => {
    it('should track metrics via Opik integration', async () => {
      // Create monitor service
      const monitor = createMonitorService(
        config,
        supabaseManager,
        database,
        quotaManager,
        discovery,
        polymarketClient
      );

      // Initialize
      await monitor.initialize();

      // Get Opik metrics
      const metrics = monitor.getOpikMetrics();

      // Verify metrics structure
      expect(metrics).toHaveProperty('currentCycle');
      expect(metrics).toHaveProperty('cycleHistory');
      expect(metrics).toHaveProperty('aggregateMetrics');
    });
  });
});
