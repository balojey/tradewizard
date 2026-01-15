/**
 * Unit Tests for Agent Signal Fusion Node
 *
 * Tests weight calculation, conflict detection, alignment calculation,
 * data quality penalty, fusion confidence, and state updates.
 */

import { describe, it, expect } from 'vitest';
import { agentSignalFusionNode } from './agent-signal-fusion.js';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import type { EngineConfig } from '../config/index.js';

/**
 * Create a mock agent signal
 */
function createMockSignal(
  agentName: string,
  fairProbability: number,
  confidence: number = 0.8
): AgentSignal {
  return {
    agentName,
    timestamp: Date.now(),
    confidence,
    direction: fairProbability > 0.5 ? 'YES' : 'NO',
    fairProbability,
    keyDrivers: ['driver1', 'driver2'],
    riskFactors: ['risk1'],
    metadata: {},
  };
}

/**
 * Create a mock graph state
 */
function createMockState(signals: AgentSignal[]): Partial<GraphStateType> {
  return {
    agentSignals: signals,
    activeAgents: signals.map((s) => s.agentName),
    mbd: {
      marketId: 'test-market',
      conditionId: 'test-condition',
      eventType: 'election',
      question: 'Test question?',
      resolutionCriteria: 'Test criteria',
      expiryTimestamp: Date.now() + 86400000,
      currentProbability: 0.5,
      liquidityScore: 7,
      bidAskSpread: 0.02,
      volatilityRegime: 'medium',
      volume24h: 5000,
      metadata: {
        ambiguityFlags: [],
        keyCatalysts: [],
      },
    },
    externalData: {
      dataFreshness: {
        news: Date.now() - 600000, // 10 minutes ago
        polling: Date.now() - 1800000, // 30 minutes ago
      },
    },
    auditLog: [],
  };
}

/**
 * Create a mock engine configuration
 */
function createMockConfig(): EngineConfig {
  return {
    agents: {
      minAgentsRequired: 3,
      timeout: 15000,
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    },
    opik: {
      projectName: 'test-project',
      enabled: true,
    },
    langgraph: {
      checkpointer: 'memory',
    },
    advancedAgents: {
      eventIntelligence: {
        enabled: true,
        breakingNews: true,
        eventImpact: true,
      },
      pollingStatistical: {
        enabled: true,
        pollingIntelligence: true,
        historicalPattern: true,
      },
      sentimentNarrative: {
        enabled: true,
        mediaSentiment: true,
        socialSentiment: true,
        narrativeVelocity: true,
      },
      priceAction: {
        enabled: true,
        momentum: true,
        meanReversion: true,
        minVolumeThreshold: 1000,
      },
      eventScenario: {
        enabled: true,
        catalyst: true,
        tailRisk: true,
      },
      riskPhilosophy: {
        enabled: true,
        aggressive: true,
        conservative: true,
        neutral: true,
      },
    },
    externalData: {
      news: {
        provider: 'newsapi',
        cacheTTL: 900,
        maxArticles: 50,
      },
      polling: {
        provider: '538',
        cacheTTL: 3600,
      },
      social: {
        providers: ['twitter', 'reddit'],
        cacheTTL: 300,
        maxMentions: 1000,
      },
    },
    signalFusion: {
      baseWeights: {},
      contextAdjustments: true,
      conflictThreshold: 0.2,
      alignmentBonus: 0.2,
    },
    costOptimization: {
      maxCostPerAnalysis: 1.0,
      skipLowImpactAgents: false,
      batchLLMRequests: true,
    },
    performanceTracking: {
      enabled: true,
      evaluateOnResolution: true,
      minSampleSize: 10,
    },
  };
}

describe('Agent Signal Fusion Node', () => {
  describe('Weight Calculation', () => {
    it('should calculate weights for MVP agents', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('probability_baseline', 0.55),
        createMockSignal('risk_assessment', 0.58),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.weights).toBeDefined();

      // All MVP agents should have equal base weight (1.0x)
      const weights = Object.values(result.fusedSignal!.weights);
      expect(weights.length).toBe(3);

      // Weights should sum to 1.0
      const sum = weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should apply higher weights to polling agents for election markets', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('polling_intelligence', 0.65),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();

      // Polling agent should have higher weight than MVP agent
      const pollingWeight = result.fusedSignal!.weights['polling_intelligence'];
      const mvpWeight = result.fusedSignal!.weights['market_microstructure'];

      expect(pollingWeight).toBeGreaterThan(mvpWeight);
    });

    it('should adjust weights based on agent confidence', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6, 0.9), // High confidence
        createMockSignal('probability_baseline', 0.6, 0.4), // Low confidence
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();

      // High confidence agent should have higher weight
      const highConfWeight = result.fusedSignal!.weights['market_microstructure'];
      const lowConfWeight = result.fusedSignal!.weights['probability_baseline'];

      expect(highConfWeight).toBeGreaterThan(lowConfWeight);
    });

    it('should handle various agent combinations', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('breaking_news', 0.65),
        createMockSignal('polling_intelligence', 0.7),
        createMockSignal('media_sentiment', 0.55),
        createMockSignal('momentum', 0.62),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.weights).toBeDefined();

      // All agents should have weights
      expect(Object.keys(result.fusedSignal!.weights).length).toBe(5);

      // Weights should sum to 1.0
      const sum = Object.values(result.fusedSignal!.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts when signals diverge significantly', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.3), // Bearish
        createMockSignal('probability_baseline', 0.7), // Bullish
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.conflictingSignals.length).toBeGreaterThan(0);

      const conflict = result.fusedSignal!.conflictingSignals[0];
      expect(conflict.disagreement).toBeGreaterThan(0.2);
    });

    it('should not detect conflicts when signals are aligned', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('probability_baseline', 0.62),
        createMockSignal('risk_assessment', 0.58),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.conflictingSignals.length).toBe(0);
    });

    it('should identify all conflicting pairs', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.3),
        createMockSignal('probability_baseline', 0.7),
        createMockSignal('risk_assessment', 0.8),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();

      // Should detect conflicts between:
      // - market_microstructure (0.3) and probability_baseline (0.7) = 0.4 difference
      // - market_microstructure (0.3) and risk_assessment (0.8) = 0.5 difference
      expect(result.fusedSignal!.conflictingSignals.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Alignment Bonus Calculation', () => {
    it('should calculate high alignment when agents agree', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('probability_baseline', 0.61),
        createMockSignal('risk_assessment', 0.59),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.signalAlignment).toBeGreaterThan(0.8);
    });

    it('should calculate low alignment when agents disagree', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.2),
        createMockSignal('probability_baseline', 0.5),
        createMockSignal('risk_assessment', 0.8),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      // With probabilities 0.2, 0.5, 0.8, alignment should be lower than high agreement case
      expect(result.fusedSignal!.signalAlignment).toBeLessThan(0.6);
    });
  });

  describe('Data Quality Penalty', () => {
    it('should apply penalty for stale data', async () => {
      const signals = [
        createMockSignal('breaking_news', 0.6),
        createMockSignal('market_microstructure', 0.6),
      ];

      // Create state with stale news data (2 hours old)
      const staleState = createMockState(signals) as GraphStateType;
      staleState.externalData = {
        dataFreshness: {
          news: Date.now() - 7200000, // 2 hours ago
        },
      };

      const config = createMockConfig();

      const result = await agentSignalFusionNode(staleState, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.metadata.dataQuality).toBeLessThan(1.0);
    });

    it('should have high data quality for fresh data', async () => {
      const signals = [
        createMockSignal('breaking_news', 0.6, 0.9),
        createMockSignal('market_microstructure', 0.6, 0.9),
      ];

      const freshState = createMockState(signals) as GraphStateType;
      freshState.externalData = {
        dataFreshness: {
          news: Date.now() - 300000, // 5 minutes ago
        },
      };

      const config = createMockConfig();

      const result = await agentSignalFusionNode(freshState, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.metadata.dataQuality).toBeGreaterThan(0.8);
    });
  });

  describe('Fusion Confidence Calculation', () => {
    it('should calculate high confidence with aligned high-confidence agents', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6, 0.9),
        createMockSignal('probability_baseline', 0.61, 0.9),
        createMockSignal('risk_assessment', 0.59, 0.9),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate low confidence with divergent low-confidence agents', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.3, 0.4),
        createMockSignal('probability_baseline', 0.7, 0.4),
        createMockSignal('risk_assessment', 0.5, 0.4),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.confidence).toBeLessThan(0.6);
    });

    it('should apply alignment bonus to confidence', async () => {
      const alignedSignals = [
        createMockSignal('market_microstructure', 0.6, 0.7),
        createMockSignal('probability_baseline', 0.61, 0.7),
        createMockSignal('risk_assessment', 0.59, 0.7),
      ];

      const divergentSignals = [
        createMockSignal('market_microstructure', 0.3, 0.7),
        createMockSignal('probability_baseline', 0.7, 0.7),
        createMockSignal('risk_assessment', 0.5, 0.7),
      ];

      const alignedState = createMockState(alignedSignals) as GraphStateType;
      const divergentState = createMockState(divergentSignals) as GraphStateType;
      const config = createMockConfig();

      const alignedResult = await agentSignalFusionNode(alignedState, config);
      const divergentResult = await agentSignalFusionNode(divergentState, config);

      expect(alignedResult.fusedSignal).toBeDefined();
      expect(divergentResult.fusedSignal).toBeDefined();

      // Aligned signals should have higher confidence due to alignment bonus
      expect(alignedResult.fusedSignal!.confidence).toBeGreaterThan(
        divergentResult.fusedSignal!.confidence
      );
    });
  });

  describe('State Updates', () => {
    it('should update state with fused signal', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('probability_baseline', 0.62),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.fairProbability).toBeGreaterThan(0);
      expect(result.fusedSignal!.fairProbability).toBeLessThan(1);
      expect(result.fusedSignal!.confidence).toBeGreaterThan(0);
      expect(result.fusedSignal!.confidence).toBeLessThan(1);
    });

    it('should include audit log entry', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6),
        createMockSignal('probability_baseline', 0.62),
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.auditLog).toBeDefined();
      expect(result.auditLog!.length).toBe(1);

      const auditEntry = result.auditLog![0];
      expect(auditEntry.stage).toBe('agent_signal_fusion');
      expect(auditEntry.data.success).toBe(true);
      expect(auditEntry.data.agentCount).toBe(2);
    });

    it('should count MVP and advanced agents correctly', async () => {
      const signals = [
        createMockSignal('market_microstructure', 0.6), // MVP
        createMockSignal('probability_baseline', 0.62), // MVP
        createMockSignal('breaking_news', 0.65), // Advanced
        createMockSignal('polling_intelligence', 0.7), // Advanced
      ];

      const state = createMockState(signals) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeDefined();
      expect(result.fusedSignal!.metadata.mvpAgentCount).toBe(2);
      expect(result.fusedSignal!.metadata.advancedAgentCount).toBe(2);
    });

    it('should handle empty agent signals gracefully', async () => {
      const state = createMockState([]) as GraphStateType;
      const config = createMockConfig();

      const result = await agentSignalFusionNode(state, config);

      expect(result.fusedSignal).toBeNull();
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog![0].data.success).toBe(false);
    });
  });
});
