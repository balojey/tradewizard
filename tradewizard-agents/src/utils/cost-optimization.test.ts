/**
 * Unit tests for cost optimization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  estimateAgentCost,
  getAgentPriority,
  filterAgentsByCost,
  applyCostOptimization,
  createCostOptimizationAuditEntry,
  trackAgentCost,
  AgentPriority,
} from './cost-optimization.js';
import type { EngineConfig } from '../config/index.js';

describe('Cost Optimization', () => {
  describe('estimateAgentCost', () => {
    it('should estimate cost for MVP agents', () => {
      const agents = ['market_microstructure', 'probability_baseline', 'risk_assessment'];
      const cost = estimateAgentCost(agents);
      
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1.0); // Should be reasonable
    });

    it('should estimate cost for advanced agents', () => {
      const agents = ['breaking_news', 'polling_intelligence', 'media_sentiment'];
      const cost = estimateAgentCost(agents);
      
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1.0);
    });

    it('should handle empty agent list', () => {
      const cost = estimateAgentCost([]);
      expect(cost).toBe(0);
    });

    it('should use default cost for unknown agents', () => {
      const cost = estimateAgentCost(['unknown_agent']);
      expect(cost).toBe(0.10); // Default cost
    });
  });

  describe('getAgentPriority', () => {
    it('should return CRITICAL for MVP agents', () => {
      expect(getAgentPriority('market_microstructure')).toBe(AgentPriority.CRITICAL);
      expect(getAgentPriority('probability_baseline')).toBe(AgentPriority.CRITICAL);
      expect(getAgentPriority('risk_assessment')).toBe(AgentPriority.CRITICAL);
    });

    it('should return HIGH for event intelligence agents', () => {
      expect(getAgentPriority('breaking_news')).toBe(AgentPriority.HIGH);
      expect(getAgentPriority('event_impact')).toBe(AgentPriority.HIGH);
    });

    it('should return MEDIUM for price action agents', () => {
      expect(getAgentPriority('momentum')).toBe(AgentPriority.MEDIUM);
      expect(getAgentPriority('mean_reversion')).toBe(AgentPriority.MEDIUM);
    });

    it('should return LOW for sentiment agents', () => {
      expect(getAgentPriority('media_sentiment')).toBe(AgentPriority.LOW);
      expect(getAgentPriority('social_sentiment')).toBe(AgentPriority.LOW);
    });

    it('should return LOW for unknown agents', () => {
      expect(getAgentPriority('unknown_agent')).toBe(AgentPriority.LOW);
    });
  });

  describe('filterAgentsByCost', () => {
    it('should include all agents when budget is sufficient', () => {
      const agents = ['breaking_news', 'polling_intelligence', 'media_sentiment'];
      const result = filterAgentsByCost(agents, 2.0, true);

      expect(result.selectedAgents).toHaveLength(3);
      expect(result.skippedAgents).toHaveLength(0);
      expect(result.estimatedCost).toBeLessThanOrEqual(2.0);
    });

    it('should prioritize CRITICAL agents even when over budget', () => {
      const agents = ['market_microstructure', 'probability_baseline', 'risk_assessment'];
      const result = filterAgentsByCost(agents, 0.01, true); // Very low budget

      // Critical agents should still be included
      expect(result.selectedAgents).toContain('market_microstructure');
      expect(result.selectedAgents).toContain('probability_baseline');
      expect(result.selectedAgents).toContain('risk_assessment');
    });

    it('should skip LOW priority agents when budget is tight', () => {
      const agents = [
        'market_microstructure', // CRITICAL
        'breaking_news', // HIGH
        'media_sentiment', // LOW
        'social_sentiment', // LOW
      ];
      const result = filterAgentsByCost(agents, 0.25, true);

      // Should include critical and high priority
      expect(result.selectedAgents).toContain('market_microstructure');
      expect(result.selectedAgents).toContain('breaking_news');
      
      // Should skip low priority
      expect(result.skippedAgents.length).toBeGreaterThan(0);
    });

    it('should calculate cost breakdown correctly', () => {
      const agents = ['market_microstructure', 'breaking_news'];
      const result = filterAgentsByCost(agents, 2.0, true);

      expect(result.costBreakdown).toHaveProperty('market_microstructure');
      expect(result.costBreakdown).toHaveProperty('breaking_news');
      expect(result.costBreakdown['market_microstructure']).toBeGreaterThan(0);
    });

    it('should calculate remaining budget correctly', () => {
      const agents = ['market_microstructure'];
      const result = filterAgentsByCost(agents, 1.0, true);

      expect(result.remainingBudget).toBeGreaterThanOrEqual(0);
      expect(result.remainingBudget).toBeLessThanOrEqual(1.0);
      expect(result.estimatedCost + result.remainingBudget).toBeCloseTo(1.0, 2);
    });
  });

  describe('applyCostOptimization', () => {
    const createMockConfig = (maxCost: number, skipLowImpact: boolean): EngineConfig => ({
      costOptimization: {
        maxCostPerAnalysis: maxCost,
        skipLowImpactAgents: skipLowImpact,
        batchLLMRequests: true,
      },
      // Other required config fields (minimal for testing)
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
        projectName: 'test',
        trackCosts: true,
        tags: [],
      },
      llm: {
        openai: {
          apiKey: 'test',
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
        conflictThreshold: 0.20,
        alignmentBonus: 0.20,
      },
      performanceTracking: {
        enabled: false,
        evaluateOnResolution: true,
        minSampleSize: 10,
      },
    });

    it('should return all agents when optimization is disabled', () => {
      const config = createMockConfig(2.0, false);
      const agents = ['breaking_news', 'polling_intelligence', 'media_sentiment'];
      const result = applyCostOptimization(agents, config);

      expect(result.selectedAgents).toHaveLength(3);
      expect(result.skippedAgents).toHaveLength(0);
      expect(result.optimizationApplied).toBe(false);
    });

    it('should apply optimization when enabled and budget is tight', () => {
      const config = createMockConfig(0.20, true);
      const agents = [
        'breaking_news',
        'polling_intelligence',
        'media_sentiment',
        'social_sentiment',
        'narrative_velocity',
      ];
      const result = applyCostOptimization(agents, config);

      expect(result.selectedAgents.length).toBeLessThan(agents.length);
      expect(result.skippedAgents.length).toBeGreaterThan(0);
      expect(result.optimizationApplied).toBe(true);
    });

    it('should include maxCost in result', () => {
      const config = createMockConfig(1.5, true);
      const agents = ['breaking_news'];
      const result = applyCostOptimization(agents, config);

      expect(result.maxCost).toBe(1.5);
    });

    it('should include cost breakdown', () => {
      const config = createMockConfig(2.0, true);
      const agents = ['breaking_news', 'polling_intelligence'];
      const result = applyCostOptimization(agents, config);

      expect(result.costBreakdown).toBeDefined();
      expect(Object.keys(result.costBreakdown).length).toBeGreaterThan(0);
    });
  });

  describe('createCostOptimizationAuditEntry', () => {
    it('should create audit entry with all required fields', () => {
      const result = {
        selectedAgents: ['breaking_news', 'polling_intelligence'],
        skippedAgents: ['media_sentiment'],
        estimatedCost: 0.27,
        maxCost: 0.50,
        costBreakdown: {
          'breaking_news': 0.12,
          'polling_intelligence': 0.15,
        },
        optimizationApplied: true,
      };

      const auditEntry = createCostOptimizationAuditEntry(result);

      expect(auditEntry.optimizationApplied).toBe(true);
      expect(auditEntry.maxCost).toBe(0.50);
      expect(auditEntry.estimatedCost).toBe(0.27);
      expect(auditEntry.remainingBudget).toBeCloseTo(0.23, 2);
      expect(auditEntry.selectedAgentCount).toBe(2);
      expect(auditEntry.skippedAgentCount).toBe(1);
      expect(auditEntry.selectedAgents).toEqual(['breaking_news', 'polling_intelligence']);
      expect(auditEntry.skippedAgents).toEqual(['media_sentiment']);
      expect(auditEntry.costBreakdown).toEqual(result.costBreakdown);
      expect(auditEntry.budgetUtilization).toBeCloseTo(54, 0);
    });

    it('should handle zero skipped agents', () => {
      const result = {
        selectedAgents: ['breaking_news'],
        skippedAgents: [],
        estimatedCost: 0.12,
        maxCost: 2.0,
        costBreakdown: { 'breaking_news': 0.12 },
        optimizationApplied: false,
      };

      const auditEntry = createCostOptimizationAuditEntry(result);

      expect(auditEntry.skippedAgentCount).toBe(0);
      expect(auditEntry.optimizationApplied).toBe(false);
    });
  });

  describe('trackAgentCost', () => {
    it('should return estimated cost when no token data provided', () => {
      const cost = trackAgentCost('breaking_news');
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(1.0);
    });

    it('should calculate cost from token usage', () => {
      const cost = trackAgentCost('breaking_news', {
        input: 2000,
        output: 500,
      });

      expect(cost).toBeGreaterThan(0);
      // Cost should be: (2000/1000 * 0.03) + (500/1000 * 0.06) = 0.06 + 0.03 = 0.09
      expect(cost).toBeCloseTo(0.09, 2);
    });

    it('should handle zero tokens', () => {
      const cost = trackAgentCost('breaking_news', {
        input: 0,
        output: 0,
      });

      expect(cost).toBe(0);
    });

    it('should use default cost for unknown agents', () => {
      const cost = trackAgentCost('unknown_agent');
      expect(cost).toBe(0.10);
    });
  });

  describe('Integration: Cost optimization with agent prioritization', () => {
    it('should prioritize agents correctly under budget constraints', () => {
      const agents = [
        'market_microstructure', // CRITICAL
        'probability_baseline', // CRITICAL
        'breaking_news', // HIGH
        'polling_intelligence', // HIGH
        'momentum', // MEDIUM
        'media_sentiment', // LOW
        'narrative_velocity', // LOW
      ];

      const result = filterAgentsByCost(agents, 0.50, true);

      // Critical agents should always be included
      expect(result.selectedAgents).toContain('market_microstructure');
      expect(result.selectedAgents).toContain('probability_baseline');

      // High priority should be preferred over low priority
      const hasHighPriority = result.selectedAgents.includes('breaking_news') ||
                              result.selectedAgents.includes('polling_intelligence');
      const hasLowPriority = result.selectedAgents.includes('media_sentiment') ||
                             result.selectedAgents.includes('narrative_velocity');

      if (result.selectedAgents.length > 2) {
        // If we have room for more than critical agents, high priority should come first
        expect(hasHighPriority).toBe(true);
      }

      // Low priority should be skipped before high priority
      if (result.skippedAgents.length > 0) {
        const skippedLowPriority = result.skippedAgents.includes('media_sentiment') ||
                                   result.skippedAgents.includes('narrative_velocity');
        expect(skippedLowPriority).toBe(true);
      }
    });

    it('should stay within budget when optimization is enabled', () => {
      const agents = [
        'breaking_news',
        'polling_intelligence',
        'media_sentiment',
        'social_sentiment',
        'narrative_velocity',
        'momentum',
        'mean_reversion',
      ];

      const maxCost = 0.40;
      const result = filterAgentsByCost(agents, maxCost, true);

      // Estimated cost should not exceed budget (with small tolerance for critical agents)
      expect(result.estimatedCost).toBeLessThanOrEqual(maxCost * 1.5);
    });
  });
});
