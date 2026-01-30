/**
 * Tests for historical recommendations hooks
 * Note: These are basic structure tests. Full integration tests would require Supabase setup.
 */

import { describe, it, expect } from 'vitest';
import { calculateRecommendationPnL, calculatePerformanceMetrics } from '../../utils/recommendationAnalysis';

describe('Recommendation Analysis Utils', () => {
  describe('calculateRecommendationPnL', () => {
    it('should calculate P&L for LONG_YES position correctly', () => {
      const result = calculateRecommendationPnL(
        'LONG_YES',
        [0.4, 0.5], // entry zone
        [0.6, 0.7], // target zone
        0.6, // current market price
        '2024-01-01T00:00:00Z'
      );

      expect(result.entryPrice).toBe(0.45); // midpoint of entry zone
      expect(result.currentPrice).toBe(0.6);
      expect(result.targetPrice).toBe(0.65); // midpoint of target zone
      expect(result.potentialReturn).toBe(0.15); // 0.6 - 0.45
      expect(result.wouldHaveProfit).toBe(true);
    });

    it('should calculate P&L for LONG_NO position correctly', () => {
      const result = calculateRecommendationPnL(
        'LONG_NO',
        [0.4, 0.5], // entry zone for YES (so NO entry is 0.5-0.6)
        [0.6, 0.7], // target zone for YES (so NO target is 0.3-0.4)
        0.4, // current market price (so NO price is 0.6)
        '2024-01-01T00:00:00Z'
      );

      expect(result.entryPrice).toBe(0.55); // 1 - 0.45 (midpoint of YES entry)
      expect(result.currentPrice).toBe(0.6); // 1 - 0.4 (current YES price)
      expect(result.wouldHaveProfit).toBe(true);
    });

    it('should return zero values for NO_TRADE', () => {
      const result = calculateRecommendationPnL(
        'NO_TRADE',
        [0.4, 0.5],
        [0.6, 0.7],
        0.6,
        '2024-01-01T00:00:00Z'
      );

      expect(result.entryPrice).toBe(0);
      expect(result.currentPrice).toBe(0);
      expect(result.potentialReturn).toBe(0);
      expect(result.wouldHaveProfit).toBe(false);
    });

    it('should calculate days held correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const result = calculateRecommendationPnL(
        'LONG_YES',
        [0.4, 0.5],
        [0.6, 0.7],
        0.6,
        pastDate.toISOString()
      );

      expect(result.daysHeld).toBe(10);
    });
  });

  describe('calculatePerformanceMetrics', () => {
    it('should calculate metrics correctly for multiple P&L results', () => {
      const pnlResults = [
        {
          entryPrice: 0.4,
          currentPrice: 0.6,
          targetPrice: 0.7,
          potentialReturn: 0.2,
          potentialReturnPercent: 50,
          wouldHaveProfit: true,
          daysHeld: 5
        },
        {
          entryPrice: 0.5,
          currentPrice: 0.4,
          targetPrice: 0.6,
          potentialReturn: -0.1,
          potentialReturnPercent: -20,
          wouldHaveProfit: false,
          daysHeld: 3
        },
        {
          entryPrice: 0.3,
          currentPrice: 0.5,
          targetPrice: 0.6,
          potentialReturn: 0.2,
          potentialReturnPercent: 66.67,
          wouldHaveProfit: true,
          daysHeld: 7
        }
      ];

      const metrics = calculatePerformanceMetrics(pnlResults);

      expect(metrics.totalRecommendations).toBe(3);
      expect(metrics.profitableRecommendations).toBe(2);
      expect(metrics.winRate).toBeCloseTo(66.67, 1);
      expect(metrics.averageReturn).toBeCloseTo(32.22, 1); // (50 - 20 + 66.67) / 3
      expect(metrics.bestReturn).toBe(66.67);
      expect(metrics.worstReturn).toBe(-20);
      expect(metrics.averageDaysHeld).toBe(5); // (5 + 3 + 7) / 3
    });

    it('should handle empty array gracefully', () => {
      const metrics = calculatePerformanceMetrics([]);

      expect(metrics.totalRecommendations).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.averageReturn).toBe(0);
      expect(metrics.bestReturn).toBe(0);
      expect(metrics.worstReturn).toBe(0);
    });
  });
});

// Mock data for testing components (would be used in component tests)
export const mockHistoricalRecommendations = [
  {
    id: '1',
    marketId: 'market-1',
    conditionId: 'condition-1',
    action: 'LONG_YES' as const,
    entryZone: [0.4, 0.5] as [number, number],
    targetZone: [0.6, 0.7] as [number, number],
    expectedValue: 0.15,
    winProbability: 0.65,
    liquidityRisk: 'low' as const,
    explanation: {
      summary: 'Strong bullish signals detected',
      coreThesis: 'Market undervaluing probability',
      keyCatalysts: ['Positive news', 'Technical indicators'],
      failureScenarios: ['Unexpected negative events']
    },
    metadata: {
      consensusProbability: 0.65,
      marketProbability: 0.5,
      edge: 0.15,
      confidenceBand: [0.6, 0.7] as [number, number],
      agentCount: 5
    },
    timestamp: '2024-01-15T10:00:00Z',
    marketPriceAtTime: 0.5,
    volumeAtTime: 100000,
    liquidityAtTime: 50000,
    agentSignals: []
  },
  {
    id: '2',
    marketId: 'market-1',
    conditionId: 'condition-1',
    action: 'LONG_NO' as const,
    entryZone: [0.3, 0.4] as [number, number],
    targetZone: [0.1, 0.2] as [number, number],
    expectedValue: 0.2,
    winProbability: 0.7,
    liquidityRisk: 'medium' as const,
    explanation: {
      summary: 'Bearish reversal expected',
      coreThesis: 'Overvalued market conditions',
      keyCatalysts: ['Economic indicators', 'Sentiment shift'],
      failureScenarios: ['Continued bullish momentum']
    },
    metadata: {
      consensusProbability: 0.3,
      marketProbability: 0.5,
      edge: -0.2,
      confidenceBand: [0.25, 0.35] as [number, number],
      agentCount: 4
    },
    timestamp: '2024-01-10T14:30:00Z',
    marketPriceAtTime: 0.5,
    volumeAtTime: 80000,
    liquidityAtTime: 40000,
    agentSignals: []
  }
];

export const mockPnLData = [
  {
    recommendationId: '1',
    timestamp: '2024-01-15T10:00:00Z',
    action: 'LONG_YES' as const,
    entryPrice: 0.45,
    currentPrice: 0.6,
    targetPrice: 0.65,
    potentialReturn: 0.15,
    potentialReturnPercent: 33.33,
    wouldHaveProfit: true,
    daysHeld: 5,
    annualizedReturn: 2433.45
  },
  {
    recommendationId: '2',
    timestamp: '2024-01-10T14:30:00Z',
    action: 'LONG_NO' as const,
    entryPrice: 0.55,
    currentPrice: 0.4,
    targetPrice: 0.15,
    potentialReturn: -0.15,
    potentialReturnPercent: -27.27,
    wouldHaveProfit: false,
    daysHeld: 10,
    annualizedReturn: -995.36
  }
];