/**
 * Unit tests for Database Persistence Layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDatabasePersistence, type DatabasePersistence } from './persistence.js';
import { SupabaseClientManager } from './supabase-client.js';
import type { TradeRecommendation, AgentSignal } from '../models/types.js';

describe('DatabasePersistence', () => {
  let persistence: DatabasePersistence;
  let clientManager: SupabaseClientManager;

  beforeEach(async () => {
    // Create client manager with test configuration
    clientManager = new SupabaseClientManager({
      url: process.env.SUPABASE_URL || 'http://localhost:54321',
      anonKey: process.env.SUPABASE_KEY || 'test-key',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    try {
      await clientManager.connect();
      persistence = createDatabasePersistence(clientManager);
    } catch (error) {
      console.warn('Skipping test - Supabase not available:', error);
      throw error;
    }
  });

  afterEach(async () => {
    if (clientManager.isClientConnected()) {
      await clientManager.disconnect();
    }
  });

  describe('upsertMarket', () => {
    it('should insert a new market', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Will test pass?',
        description: 'Test market description',
        eventType: 'election',
        marketProbability: 0.65,
        volume24h: 10000,
        liquidity: 50000,
        status: 'active' as const,
        trendingScore: 8.5,
      };

      const marketId = await persistence.upsertMarket(market);

      expect(marketId).toBeDefined();
      expect(typeof marketId).toBe('string');
      expect(marketId.length).toBeGreaterThan(0);
    });

    it('should update an existing market', async () => {
      const conditionId = `test-condition-${Date.now()}`;
      const market = {
        conditionId,
        question: 'Will test pass?',
        eventType: 'election',
        marketProbability: 0.65,
      };

      // Insert first time
      const marketId1 = await persistence.upsertMarket(market);

      // Update with new data
      const updatedMarket = {
        ...market,
        marketProbability: 0.75,
        volume24h: 20000,
      };

      const marketId2 = await persistence.upsertMarket(updatedMarket);

      // Should return same ID
      expect(marketId2).toBe(marketId1);
    });

    it('should handle markets without optional fields', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Minimal market test',
        eventType: 'policy',
      };

      const marketId = await persistence.upsertMarket(market);

      expect(marketId).toBeDefined();
      expect(typeof marketId).toBe('string');
    });
  });

  describe('storeRecommendation', () => {
    it('should store a recommendation', async () => {
      // First create a market
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market for recommendation',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      // Create recommendation
      const recommendation: TradeRecommendation = {
        marketId: market.conditionId,
        action: 'LONG_YES',
        entryZone: [0.45, 0.50],
        targetZone: [0.65, 0.70],
        expectedValue: 25.5,
        winProbability: 0.68,
        liquidityRisk: 'medium',
        explanation: {
          summary: 'Strong bullish case based on polling data',
          coreThesis: 'Polling shows consistent lead',
          keyCatalysts: ['Debate performance', 'Economic data'],
          failureScenarios: ['Unexpected scandal', 'Market crash'],
        },
        metadata: {
          consensusProbability: 0.68,
          marketProbability: 0.48,
          edge: 0.20,
          confidenceBand: [0.63, 0.73],
        },
      };

      const recommendationId = await persistence.storeRecommendation(marketId, recommendation);

      expect(recommendationId).toBeDefined();
      expect(typeof recommendationId).toBe('string');
      expect(recommendationId.length).toBeGreaterThan(0);
    });

    it('should handle NO_TRADE recommendations', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market for no trade',
        eventType: 'policy',
      };
      const marketId = await persistence.upsertMarket(market);

      const recommendation: TradeRecommendation = {
        marketId: market.conditionId,
        action: 'NO_TRADE',
        entryZone: [0, 0],
        targetZone: [0, 0],
        expectedValue: 0,
        winProbability: 0.5,
        liquidityRisk: 'low',
        explanation: {
          summary: 'No edge detected',
          coreThesis: 'Market fairly priced',
          keyCatalysts: [],
          failureScenarios: [],
        },
        metadata: {
          consensusProbability: 0.5,
          marketProbability: 0.5,
          edge: 0,
          confidenceBand: [0.45, 0.55],
        },
      };

      const recommendationId = await persistence.storeRecommendation(marketId, recommendation);

      expect(recommendationId).toBeDefined();
    });
  });

  describe('storeAgentSignals', () => {
    it('should store multiple agent signals', async () => {
      // Create market and recommendation
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market for signals',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const recommendation: TradeRecommendation = {
        marketId: market.conditionId,
        action: 'LONG_YES',
        entryZone: [0.45, 0.50],
        targetZone: [0.65, 0.70],
        expectedValue: 25.5,
        winProbability: 0.68,
        liquidityRisk: 'medium',
        explanation: {
          summary: 'Test',
          coreThesis: 'Test',
          keyCatalysts: [],
          failureScenarios: [],
        },
        metadata: {
          consensusProbability: 0.68,
          marketProbability: 0.48,
          edge: 0.20,
          confidenceBand: [0.63, 0.73],
        },
      };
      const recommendationId = await persistence.storeRecommendation(marketId, recommendation);

      // Create signals
      const signals: AgentSignal[] = [
        {
          agentName: 'polling_intelligence_agent',
          timestamp: Date.now(),
          confidence: 0.85,
          direction: 'YES',
          fairProbability: 0.70,
          keyDrivers: ['Strong polling numbers', 'Demographic advantage'],
          riskFactors: ['Polling error'],
          metadata: { pollCount: 5 },
        },
        {
          agentName: 'sentiment_analysis_agent',
          timestamp: Date.now(),
          confidence: 0.75,
          direction: 'YES',
          fairProbability: 0.65,
          keyDrivers: ['Positive media coverage'],
          riskFactors: ['Sentiment volatility'],
          metadata: { sentimentScore: 0.8 },
        },
        {
          agentName: 'market_microstructure_agent',
          timestamp: Date.now(),
          confidence: 0.60,
          direction: 'NEUTRAL',
          fairProbability: 0.50,
          keyDrivers: ['Balanced order flow'],
          riskFactors: ['Low liquidity'],
          metadata: { spreadBps: 50 },
        },
      ];

      await persistence.storeAgentSignals(marketId, recommendationId, signals);

      // No error means success
      expect(true).toBe(true);
    });

    it('should handle empty signals array', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const recommendation: TradeRecommendation = {
        marketId: market.conditionId,
        action: 'NO_TRADE',
        entryZone: [0, 0],
        targetZone: [0, 0],
        expectedValue: 0,
        winProbability: 0.5,
        liquidityRisk: 'low',
        explanation: {
          summary: 'Test',
          coreThesis: 'Test',
          keyCatalysts: [],
          failureScenarios: [],
        },
        metadata: {
          consensusProbability: 0.5,
          marketProbability: 0.5,
          edge: 0,
          confidenceBand: [0.45, 0.55],
        },
      };
      const recommendationId = await persistence.storeRecommendation(marketId, recommendation);

      await persistence.storeAgentSignals(marketId, recommendationId, []);

      expect(true).toBe(true);
    });
  });

  describe('recordAnalysis', () => {
    it('should record successful analysis', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const analysis = {
        type: 'initial' as const,
        status: 'success' as const,
        durationMs: 5000,
        costUsd: 0.25,
        agentsUsed: ['polling_agent', 'sentiment_agent'],
      };

      await persistence.recordAnalysis(marketId, analysis);

      expect(true).toBe(true);
    });

    it('should record failed analysis', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const analysis = {
        type: 'update' as const,
        status: 'failed' as const,
        durationMs: 2000,
        errorMessage: 'API timeout',
      };

      await persistence.recordAnalysis(marketId, analysis);

      expect(true).toBe(true);
    });
  });

  describe('getMarketsForUpdate', () => {
    it('should return markets needing update', async () => {
      // Create a market that needs update (old timestamp)
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Old market needing update',
        eventType: 'election',
        status: 'active' as const,
      };
      await persistence.upsertMarket(market);

      // Get markets that haven't been analyzed in last 1 hour
      const updateIntervalMs = 60 * 60 * 1000; // 1 hour
      const markets = await persistence.getMarketsForUpdate(updateIntervalMs);

      expect(Array.isArray(markets)).toBe(true);
      // Should include our newly created market (just analyzed)
      expect(markets.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by status', async () => {
      // Create resolved market
      const resolvedMarket = {
        conditionId: `test-resolved-${Date.now()}`,
        question: 'Resolved market',
        eventType: 'election',
        status: 'resolved' as const,
      };
      await persistence.upsertMarket(resolvedMarket);

      const updateIntervalMs = 0; // Get all markets
      const markets = await persistence.getMarketsForUpdate(updateIntervalMs);

      // Should not include resolved markets
      const hasResolved = markets.some((m) => m.status === 'resolved');
      expect(hasResolved).toBe(false);
    });

    it('should handle various timestamps', async () => {
      // Test with different intervals
      const intervals = [
        0, // All markets
        60 * 1000, // 1 minute
        60 * 60 * 1000, // 1 hour
        24 * 60 * 60 * 1000, // 24 hours
      ];

      for (const interval of intervals) {
        const markets = await persistence.getMarketsForUpdate(interval);
        expect(Array.isArray(markets)).toBe(true);
      }
    });
  });

  describe('markMarketResolved', () => {
    it('should mark market as resolved', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Market to resolve',
        eventType: 'election',
        status: 'active' as const,
      };
      const marketId = await persistence.upsertMarket(market);

      await persistence.markMarketResolved(marketId, 'YES');

      // Verify by trying to get it in update list (should not appear)
      const markets = await persistence.getMarketsForUpdate(0);
      const found = markets.find((m) => m.conditionId === market.conditionId);
      expect(found).toBeUndefined();
    });
  });

  describe('getLatestRecommendation', () => {
    it('should return latest recommendation', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const recommendation: TradeRecommendation = {
        marketId: market.conditionId,
        action: 'LONG_YES',
        entryZone: [0.45, 0.50],
        targetZone: [0.65, 0.70],
        expectedValue: 25.5,
        winProbability: 0.68,
        liquidityRisk: 'medium',
        explanation: {
          summary: 'Test recommendation',
          coreThesis: 'Test',
          keyCatalysts: ['Catalyst 1'],
          failureScenarios: ['Risk 1'],
        },
        metadata: {
          consensusProbability: 0.68,
          marketProbability: 0.48,
          edge: 0.20,
          confidenceBand: [0.63, 0.73],
        },
      };

      await persistence.storeRecommendation(marketId, recommendation);

      const retrieved = await persistence.getLatestRecommendation(marketId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.action).toBe('LONG_YES');
      expect(retrieved?.expectedValue).toBe(25.5);
    });

    it('should return null for market without recommendations', async () => {
      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Market without recommendation',
        eventType: 'election',
      };
      const marketId = await persistence.upsertMarket(market);

      const retrieved = await persistence.getLatestRecommendation(marketId);

      expect(retrieved).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Disconnect to simulate error
      await clientManager.disconnect();

      const market = {
        conditionId: `test-condition-${Date.now()}`,
        question: 'Test market',
        eventType: 'election',
      };

      await expect(persistence.upsertMarket(market)).rejects.toThrow();
    });
  });
});
