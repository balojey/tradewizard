/**
 * Tests for market type detection logic
 */

import { describe, it, expect } from 'vitest';
import {
  determineMarketType,
  parseMarketOutcomes,
  parseMarketPrices,
  processSimpleMarketOutcomes,
  processComplexMarketOutcomes,
  processMarketOutcomes,
  formatVolume
} from './market-type-detection';
import { PolymarketEvent, PolymarketMarket } from './polymarket-types';

// Mock data for testing
const createMockMarket = (
  id: string,
  groupItemTitle?: string,
  groupItemThreshold?: string,
  outcomes = '["Yes", "No"]',
  outcomePrices = '["0.6", "0.4"]'
): PolymarketMarket => ({
  id,
  question: `Test question ${id}`,
  conditionId: 'test-condition',
  slug: `test-slug-${id}`,
  endDate: '2025-12-31T12:00:00Z',
  outcomes,
  outcomePrices,
  volume: '1000',
  active: true,
  closed: false,
  new: false,
  featured: false,
  archived: false,
  restricted: false,
  groupItemTitle,
  groupItemThreshold,
  enableOrderBook: true,
  orderPriceMinTickSize: 0.001,
  orderMinSize: 5,
  volumeNum: 1000,
  endDateIso: '2025-12-31',
  startDateIso: '2025-01-01',
  hasReviewedDates: true,
  acceptingOrders: true,
  negRisk: false,
  ready: true,
  funded: true,
  cyom: false,
  pagerDutyNotificationEnabled: false,
  approved: true,
  automaticallyActive: true,
  clearBookOnStart: true,
  seriesColor: '',
  showGmpSeries: false,
  showGmpOutcome: false,
  manualActivation: false,
  negRiskOther: false,
  pendingDeployment: false,
  deploying: false,
  rfqEnabled: false,
  holdingRewardsEnabled: false,
  feesEnabled: false,
  requiresTranslation: false
});

const createMockEvent = (markets: PolymarketMarket[]): PolymarketEvent => ({
  id: 'test-event',
  ticker: 'test-ticker',
  slug: 'test-slug',
  title: 'Test Event',
  description: 'Test description',
  startDate: '2025-01-01T00:00:00Z',
  creationDate: '2025-01-01T00:00:00Z',
  endDate: '2025-12-31T12:00:00Z',
  image: 'https://example.com/image.jpg',
  icon: 'https://example.com/icon.jpg',
  active: true,
  closed: false,
  archived: false,
  new: false,
  featured: false,
  restricted: false,
  liquidity: 10000,
  volume: 50000,
  markets,
  tags: [
    { id: '2', label: 'Politics', slug: 'politics', requiresTranslation: false }
  ],
  cyom: false,
  showAllOutcomes: true,
  showMarketImages: false,
  enableNegRisk: false,
  automaticallyActive: true,
  gmpChartMode: 'default',
  negRiskAugmented: false,
  cumulativeMarkets: false,
  pendingDeployment: false,
  deploying: false,
  requiresTranslation: false
});

describe('Market Type Detection', () => {
  describe('determineMarketType', () => {
    it('should identify simple market with single active market', () => {
      const event = createMockEvent([
        createMockMarket('1')
      ]);
      
      expect(determineMarketType(event)).toBe('simple');
    });

    it('should identify simple market with multiple markets having same groupItemTitle', () => {
      const event = createMockEvent([
        createMockMarket('1', 'Same Title'),
        createMockMarket('2', 'Same Title')
      ]);
      
      expect(determineMarketType(event)).toBe('simple');
    });

    it('should identify complex market with different groupItemTitles', () => {
      const event = createMockEvent([
        createMockMarket('1', '250-500k', '1'),
        createMockMarket('2', '500-750k', '2'),
        createMockMarket('3', '750k-1m', '3')
      ]);
      
      expect(determineMarketType(event)).toBe('complex');
    });

    it('should ignore inactive markets', () => {
      const inactiveMarket = createMockMarket('2', 'Different Title');
      inactiveMarket.active = false;
      
      const event = createMockEvent([
        createMockMarket('1', 'Title'),
        inactiveMarket
      ]);
      
      expect(determineMarketType(event)).toBe('simple');
    });
  });

  describe('parseMarketOutcomes', () => {
    it('should parse valid JSON outcomes', () => {
      const result = parseMarketOutcomes('["Yes", "No"]');
      expect(result).toEqual(['Yes', 'No']);
    });

    it('should handle invalid JSON with fallback', () => {
      const result = parseMarketOutcomes('invalid json');
      expect(result).toEqual(['Yes', 'No']);
    });

    it('should handle non-array JSON with fallback', () => {
      const result = parseMarketOutcomes('{"not": "array"}');
      expect(result).toEqual(['Yes', 'No']);
    });
  });

  describe('parseMarketPrices', () => {
    it('should parse valid JSON prices', () => {
      const result = parseMarketPrices('["0.6", "0.4"]');
      expect(result).toEqual([0.6, 0.4]);
    });

    it('should handle invalid JSON with fallback', () => {
      const result = parseMarketPrices('invalid json');
      expect(result).toEqual([0.5, 0.5]);
    });

    it('should handle invalid numbers with fallback', () => {
      const result = parseMarketPrices('["invalid", "0.4"]');
      expect(result).toEqual([0.5, 0.4]);
    });
  });

  describe('processSimpleMarketOutcomes', () => {
    it('should process simple market outcomes correctly', () => {
      const event = createMockEvent([
        createMockMarket('1', undefined, undefined, '["Yes", "No"]', '["0.7", "0.3"]')
      ]);
      
      const result = processSimpleMarketOutcomes(event);
      
      expect(result).toEqual([
        { name: 'Yes', probability: 70, color: 'yes' },
        { name: 'No', probability: 30, color: 'no' }
      ]);
    });

    it('should handle empty markets with fallback', () => {
      const event = createMockEvent([]);
      
      const result = processSimpleMarketOutcomes(event);
      
      expect(result).toEqual([
        { name: 'Yes', probability: 50, color: 'yes' },
        { name: 'No', probability: 50, color: 'no' }
      ]);
    });
  });

  describe('processComplexMarketOutcomes', () => {
    it('should process complex market outcomes correctly', () => {
      const event = createMockEvent([
        createMockMarket('1', '250-500k', '1', '["Yes", "No"]', '["0.8", "0.2"]'),
        createMockMarket('2', '500-750k', '2', '["Yes", "No"]', '["0.3", "0.7"]')
      ]);
      
      const result = processComplexMarketOutcomes(event);
      
      expect(result).toEqual([
        { name: 'Yes', probability: 80, color: 'yes', category: '250-500k' },
        { name: 'Yes', probability: 30, color: 'yes', category: '500-750k' }
      ]);
    });

    it('should sort by groupItemThreshold', () => {
      const event = createMockEvent([
        createMockMarket('1', '500-750k', '2', '["Yes", "No"]', '["0.3", "0.7"]'),
        createMockMarket('2', '250-500k', '1', '["Yes", "No"]', '["0.8", "0.2"]')
      ]);
      
      const result = processComplexMarketOutcomes(event);
      
      expect(result[0].category).toBe('250-500k');
      expect(result[1].category).toBe('500-750k');
    });
  });

  describe('processMarketOutcomes', () => {
    it('should return correct market type and outcomes for simple market', () => {
      const event = createMockEvent([
        createMockMarket('1')
      ]);
      
      const result = processMarketOutcomes(event);
      
      expect(result.marketType).toBe('simple');
      expect(result.outcomes).toHaveLength(2);
    });

    it('should return correct market type and outcomes for complex market', () => {
      const event = createMockEvent([
        createMockMarket('1', '250-500k', '1'),
        createMockMarket('2', '500-750k', '2')
      ]);
      
      const result = processMarketOutcomes(event);
      
      expect(result.marketType).toBe('complex');
      expect(result.outcomes).toHaveLength(2);
      expect(result.outcomes[0].category).toBeDefined();
    });
  });

  describe('formatVolume', () => {
    it('should format millions correctly', () => {
      expect(formatVolume(1500000)).toBe('$1.5M');
      expect(formatVolume(2000000)).toBe('$2.0M');
    });

    it('should format thousands correctly', () => {
      expect(formatVolume(1500)).toBe('$1.5K');
      expect(formatVolume(2000)).toBe('$2.0K');
    });

    it('should format small amounts correctly', () => {
      expect(formatVolume(500)).toBe('$500');
      expect(formatVolume(50.7)).toBe('$51');
    });
  });
});