/**
 * Property-based tests for Monitor Service
 * 
 * Feature: automated-market-monitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AutomatedMarketMonitor } from './monitor-service.js';
import type { EngineConfig } from '../config/index.js';
import type { SupabaseClientManager } from '../database/supabase-client.js';
import type { DatabasePersistence } from '../database/persistence.js';
import type { APIQuotaManager } from './api-quota-manager.js';
import type { MarketDiscoveryEngine, RankedMarket } from './market-discovery.js';
import type { PolymarketClient } from './polymarket-client.js';
import type { TradeRecommendation, MarketBriefingDocument } from '../models/types.js';

// Mock the workflow module
vi.mock('../workflow.js', () => ({
  analyzeMarket: vi.fn(),
}));

describe('MonitorService Property Tests', () => {
  let mockConfig: EngineConfig;
  let mockSupabaseManager: SupabaseClientManager;
  let mockDatabase: DatabasePersistence;
  let mockQuotaManager: APIQuotaManager;
  let mockDiscovery: MarketDiscoveryEngine;
  let mockPolymarketClient: PolymarketClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock config
    mockConfig = {
      polymarket: {
        gammaApiUrl: 'https://gamma-api.polymarket.com',
        clobApiUrl: 'https://clob.polymarket.com',
        rateLimitBuffer: 80,
      },
      langgraph: {
        checkpointer: 'memory',
        recursionLimit: 25,
        streamMode: 'values',
      },
      opik: {
        projectName: 'test-project',
        trackCosts: true,
        tags: [],
      },
      llm: {
        openai: {
          apiKey: 'test-key',
          defaultModel: 'gpt-4',
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
        conflictThreshold: 0.2,
        alignmentBonus: 0.2,
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
    } as EngineConfig;

    // Create mock Supabase manager
    mockSupabaseManager = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as any;

    // Create mock database
    mockDatabase = {
      upsertMarket: vi.fn().mockResolvedValue('market-id-123'),
      storeRecommendation: vi.fn().mockResolvedValue('rec-id-123'),
      storeAgentSignals: vi.fn().mockResolvedValue(undefined),
      recordAnalysis: vi.fn().mockResolvedValue(undefined),
      getMarketsForUpdate: vi.fn().mockResolvedValue([]),
      markMarketResolved: vi.fn().mockResolvedValue(undefined),
      getLatestRecommendation: vi.fn().mockResolvedValue(null),
    } as any;

    // Create mock quota manager
    mockQuotaManager = {
      canMakeRequest: vi.fn().mockReturnValue(true),
      recordUsage: vi.fn(),
      getUsage: vi.fn().mockReturnValue(0),
      resetUsage: vi.fn(),
      getRecommendedMarketCount: vi.fn().mockReturnValue(3),
      getQuotaLimit: vi.fn().mockReturnValue(100),
    } as any;

    // Create mock discovery engine
    mockDiscovery = {
      discoverMarkets: vi.fn().mockResolvedValue([]),
      fetchPoliticalMarkets: vi.fn().mockResolvedValue([]),
      rankMarkets: vi.fn().mockReturnValue([]),
    } as any;

    // Create mock Polymarket client
    const mockMBD: MarketBriefingDocument = {
      marketId: 'test-market',
      conditionId: 'test-condition',
      eventType: 'election',
      question: 'Test market',
      resolutionCriteria: 'Test criteria',
      expiryTimestamp: Date.now() + 86400000,
      currentProbability: 0.5,
      liquidityScore: 7.5,
      bidAskSpread: 2.5,
      volatilityRegime: 'medium',
      volume24h: 10000,
      metadata: {
        ambiguityFlags: [],
        keyCatalysts: [],
      },
    };

    mockPolymarketClient = {
      fetchMarketData: vi.fn().mockResolvedValue({ ok: true, data: mockMBD }),
      healthCheck: vi.fn().mockResolvedValue(true),
    } as any;
  });

  /**
   * Property 7: Error isolation
   * 
   * For any market analysis failure, the system should continue processing
   * remaining markets in the queue without crashing.
   * 
   * Validates: Requirements 10.4
   * 
   * Feature: automated-market-monitor, Property 7: Error isolation
   */
  it('Property 7: should continue processing markets even when some fail', async () => {
    // Import mock once outside the property function
    const { analyzeMarket: mockAnalyzeMarket } = await import('../workflow.js');
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            conditionId: fc.string({ minLength: 1, maxLength: 50 }),
            shouldFail: fc.boolean(),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (markets) => {
          // Explicitly clear the mock before each property test run
          vi.mocked(mockAnalyzeMarket).mockClear();
          vi.mocked(mockDatabase.upsertMarket).mockClear();
          vi.mocked(mockDiscovery.discoverMarkets).mockClear();

          // Create monitor instance
          const monitor = new AutomatedMarketMonitor(
            mockConfig,
            mockSupabaseManager,
            mockDatabase,
            mockQuotaManager,
            mockDiscovery,
            mockPolymarketClient
          );

          // Mock discovery to return the generated markets
          const rankedMarkets: RankedMarket[] = markets.map((m) => ({
            conditionId: m.conditionId,
            question: `Market ${m.conditionId}`,
            description: 'Test description',
            trendingScore: 10,
            volume24h: 1000,
            liquidity: 500,
            marketSlug: m.conditionId,
          }));

          vi.mocked(mockDiscovery.discoverMarkets).mockResolvedValue(rankedMarkets);

          // Mock analyzeMarket to fail or succeed based on shouldFail
          let callIndex = 0;
          vi.mocked(mockAnalyzeMarket).mockImplementation(async () => {
            const market = markets[callIndex++];
            if (market.shouldFail) {
              throw new Error(`Market ${market.conditionId} failed`);
            }
            return {
              marketId: market.conditionId,
              action: 'LONG_YES',
              entryZone: [0.45, 0.50],
              targetZone: [0.60, 0.65],
              expectedValue: 15.5,
              winProbability: 0.65,
              liquidityRisk: 'low',
              explanation: {
                summary: 'Test summary',
                coreThesis: 'Test thesis',
                keyCatalysts: ['Catalyst 1'],
                failureScenarios: ['Risk 1'],
              },
              metadata: {
                consensusProbability: 0.65,
                marketProbability: 0.50,
                edge: 0.15,
                confidenceBand: [0.60, 0.70],
              },
            } as TradeRecommendation;
          });

          await monitor.initialize();

          // Run discovery and analysis cycle
          await (monitor as any).discoverAndAnalyze();

          // Verify all markets were attempted (error isolation)
          expect(mockAnalyzeMarket).toHaveBeenCalledTimes(markets.length);

          // Verify successful markets were stored
          const successfulMarkets = markets.filter((m) => !m.shouldFail);
          expect(mockDatabase.upsertMarket).toHaveBeenCalledTimes(successfulMarkets.length);
        }
      ),
      { numRuns: 100, timeout: 10000 }
    );
  }, 15000);

  /**
   * Property 5: Graceful shutdown completeness
   * 
   * For any shutdown signal (SIGTERM, SIGINT), the system should complete the
   * current analysis before exiting, and no analysis should be left in a partial state.
   * 
   * Validates: Requirements 7.3
   * 
   * Feature: automated-market-monitor, Property 5: Graceful shutdown completeness
   */
  it('Property 5: should complete current analysis before shutdown', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate execution duration between 50ms and 200ms
        fc.integer({ min: 50, max: 200 }),
        async (executionDurationMs) => {
          const { analyzeMarket: mockAnalyzeMarket } = await import('../workflow.js');
          vi.clearAllMocks();

          // Create monitor instance
          const monitor = new AutomatedMarketMonitor(
            mockConfig,
            mockSupabaseManager,
            mockDatabase,
            mockQuotaManager,
            mockDiscovery,
            mockPolymarketClient
          );

          // Mock discovery to return one market
          const rankedMarkets: RankedMarket[] = [{
            conditionId: 'test-market',
            question: 'Test market',
            description: 'Test description',
            trendingScore: 10,
            volume24h: 1000,
            liquidity: 500,
            marketSlug: 'test-market',
          }];

          vi.mocked(mockDiscovery.discoverMarkets).mockResolvedValue(rankedMarkets);

          // Track analysis state
          let analysisStarted = false;
          let analysisCompleted = false;

          // Mock analyzeMarket with variable duration
          vi.mocked(mockAnalyzeMarket).mockImplementation(async () => {
            analysisStarted = true;
            await new Promise(resolve => setTimeout(resolve, executionDurationMs));
            analysisCompleted = true;
            return {
              marketId: 'test-market',
              action: 'LONG_YES',
              entryZone: [0.45, 0.50],
              targetZone: [0.60, 0.65],
              expectedValue: 15.5,
              winProbability: 0.65,
              liquidityRisk: 'low',
              explanation: {
                summary: 'Test summary',
                coreThesis: 'Test thesis',
                keyCatalysts: ['Catalyst 1'],
                failureScenarios: ['Risk 1'],
              },
              metadata: {
                consensusProbability: 0.65,
                marketProbability: 0.50,
                edge: 0.15,
                confidenceBand: [0.60, 0.70],
              },
            } as TradeRecommendation;
          });

          await monitor.initialize();
          await monitor.start();

          // Trigger analysis
          const analysisPromise = monitor.analyzeMarket('test-market');

          // Wait for analysis to start
          await new Promise(resolve => setTimeout(resolve, 10));
          expect(analysisStarted).toBe(true);

          // Stop monitor (should wait for analysis to complete)
          await monitor.stop();

          // Analysis should have completed before shutdown
          expect(analysisCompleted).toBe(true);
          await analysisPromise;

          // Verify analysis results were stored (no partial state)
          expect(mockDatabase.upsertMarket).toHaveBeenCalled();
          expect(mockDatabase.storeRecommendation).toHaveBeenCalled();
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  }, 30000);
});
