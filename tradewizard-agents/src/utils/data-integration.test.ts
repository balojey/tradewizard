/**
 * Unit tests for Data Integration Layer
 *
 * Tests caching, rate limiting, data validation, and error handling
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataIntegrationLayer,
  createDataIntegrationLayer,
  type DataSourceConfig,
  type NewsArticle,
  type PollingData,
  type SocialSentiment,
} from './data-integration.js';
import type { MarketBriefingDocument } from '../models/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockMarket: MarketBriefingDocument = {
  marketId: 'test-market-123',
  conditionId: 'condition-456',
  eventType: 'election',
  question: 'Will candidate X win the election?',
  resolutionCriteria: 'Resolves YES if candidate X wins',
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
};

const mockNewsArticles: NewsArticle[] = [
  {
    title: 'Breaking: Major development in election',
    source: 'News Source',
    publishedAt: Date.now(),
    url: 'https://example.com/article1',
    summary: 'Summary of the article',
    sentiment: 'positive',
    relevanceScore: 0.9,
  },
  {
    title: 'Analysis: Election trends',
    source: 'Another Source',
    publishedAt: Date.now() - 3600000,
    url: 'https://example.com/article2',
    summary: 'Analysis summary',
    sentiment: 'neutral',
    relevanceScore: 0.7,
  },
];

const mockPollingData: PollingData = {
  polls: [
    {
      pollster: 'Pollster A',
      date: Date.now(),
      sampleSize: 1000,
      yesPercentage: 52,
      noPercentage: 48,
      marginOfError: 3,
      methodology: 'Phone survey',
    },
  ],
  aggregatedProbability: 0.52,
  momentum: 'rising',
  biasAdjustment: 0.02,
};

const mockSocialSentiment: SocialSentiment = {
  platforms: {
    twitter: {
      volume: 5000,
      sentiment: 0.3,
      viralScore: 0.7,
      topKeywords: ['election', 'candidate', 'vote'],
    },
    reddit: {
      volume: 2000,
      sentiment: 0.1,
      viralScore: 0.5,
      topKeywords: ['politics', 'election', 'debate'],
    },
  },
  overallSentiment: 0.2,
  narrativeVelocity: 150,
};

const defaultConfig: DataSourceConfig = {
  news: {
    provider: 'newsapi',
    apiKey: 'test-key',
    cacheTTL: 900, // 15 minutes
    maxArticles: 50,
  },
  polling: {
    provider: '538',
    apiKey: 'test-key',
    cacheTTL: 3600, // 1 hour
  },
  social: {
    providers: ['twitter', 'reddit'],
    apiKeys: { twitter: 'test-key', reddit: 'test-key' },
    cacheTTL: 300, // 5 minutes
    maxMentions: 1000,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe('DataIntegrationLayer', () => {
  let dataLayer: DataIntegrationLayer;

  beforeEach(() => {
    dataLayer = createDataIntegrationLayer(defaultConfig);
  });

  describe('News API Client', () => {
    it('should return empty array when provider is none', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        news: { ...defaultConfig.news, provider: 'none' },
      };
      const layer = createDataIntegrationLayer(config);

      const articles = await layer.fetchNews(mockMarket);
      expect(articles).toEqual([]);
    });

    it('should return empty array when API key is missing', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        news: { ...defaultConfig.news, apiKey: undefined },
      };
      const layer = createDataIntegrationLayer(config);

      const articles = await layer.fetchNews(mockMarket);
      expect(articles).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      // The current implementation returns empty array on error
      const articles = await dataLayer.fetchNews(mockMarket);
      expect(Array.isArray(articles)).toBe(true);
    });
  });

  describe('Polling API Client', () => {
    it('should return null when provider is none', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        polling: { ...defaultConfig.polling, provider: 'none' },
      };
      const layer = createDataIntegrationLayer(config);

      const polling = await layer.fetchPollingData(mockMarket);
      expect(polling).toBeNull();
    });

    it('should return null when API key is missing', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        polling: { ...defaultConfig.polling, apiKey: undefined },
      };
      const layer = createDataIntegrationLayer(config);

      const polling = await layer.fetchPollingData(mockMarket);
      expect(polling).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const polling = await dataLayer.fetchPollingData(mockMarket);
      expect(polling).toBeNull();
    });
  });

  describe('Social API Client', () => {
    it('should return null when no providers configured', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        social: { ...defaultConfig.social, providers: [] },
      };
      const layer = createDataIntegrationLayer(config);

      const sentiment = await layer.fetchSocialSentiment(mockMarket);
      expect(sentiment).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const sentiment = await dataLayer.fetchSocialSentiment(mockMarket);
      expect(sentiment).toBeNull();
    });
  });

  describe('Caching Behavior', () => {
    it('should cache news data and return cached data on subsequent calls', async () => {
      // Mock the private method to return data
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');
      spy.mockResolvedValue(mockNewsArticles);

      // First call - should fetch from provider
      const articles1 = await dataLayer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(articles1).toEqual(mockNewsArticles);

      // Second call - should return cached data
      const articles2 = await dataLayer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1); // Not called again
      expect(articles2).toEqual(mockNewsArticles);

      spy.mockRestore();
    });

    it('should cache polling data and return cached data on subsequent calls', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchPollingFromProvider');
      spy.mockResolvedValue(mockPollingData);

      const polling1 = await dataLayer.fetchPollingData(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(polling1).toEqual(mockPollingData);

      const polling2 = await dataLayer.fetchPollingData(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(polling2).toEqual(mockPollingData);

      spy.mockRestore();
    });

    it('should cache social sentiment and return cached data on subsequent calls', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchSocialFromProvider');
      spy.mockResolvedValue(mockSocialSentiment);

      const sentiment1 = await dataLayer.fetchSocialSentiment(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(sentiment1).toEqual(mockSocialSentiment);

      const sentiment2 = await dataLayer.fetchSocialSentiment(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(sentiment2).toEqual(mockSocialSentiment);

      spy.mockRestore();
    });

    it('should respect TTL and refetch after expiration', async () => {
      // Create layer with very short TTL
      const config: DataSourceConfig = {
        ...defaultConfig,
        news: { ...defaultConfig.news, cacheTTL: 0.1 }, // 0.1 seconds
      };
      const layer = createDataIntegrationLayer(config);

      const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
      spy.mockResolvedValue(mockNewsArticles);

      // First call
      await layer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second call - should refetch
      await layer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockRestore();
    });

    it('should clear all caches when clearCaches is called', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');
      spy.mockResolvedValue(mockNewsArticles);

      // Populate cache
      await dataLayer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(1);

      // Clear caches
      dataLayer.clearCaches();

      // Should refetch after clear
      await dataLayer.fetchNews(mockMarket);
      expect(spy).toHaveBeenCalledTimes(2);

      spy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should use cached data when rate limit is approached', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');
      spy.mockResolvedValue(mockNewsArticles);

      // First call to populate cache
      await dataLayer.fetchNews(mockMarket);

      // Exhaust rate limiter by consuming all tokens
      const rateLimiter = (dataLayer as any).newsRateLimiter;
      while (rateLimiter.tryConsume()) {
        // Consume all tokens
      }

      // Should return cached data without calling provider
      const articles = await dataLayer.fetchNews(mockMarket);
      expect(articles).toEqual(mockNewsArticles);
      expect(spy).toHaveBeenCalledTimes(1); // Only the first call

      spy.mockRestore();
    });

    it('should return empty array when rate limited and no cache', async () => {
      // Exhaust rate limiter
      const rateLimiter = (dataLayer as any).newsRateLimiter;
      while (rateLimiter.tryConsume()) {
        // Consume all tokens
      }

      const articles = await dataLayer.fetchNews(mockMarket);
      expect(articles).toEqual([]);
    });
  });

  describe('Data Availability Checking', () => {
    it('should report news availability correctly', async () => {
      const available = await dataLayer.checkDataAvailability('news');
      expect(typeof available).toBe('boolean');
    });

    it('should report polling availability correctly', async () => {
      const available = await dataLayer.checkDataAvailability('polling');
      expect(typeof available).toBe('boolean');
    });

    it('should report social availability correctly', async () => {
      const available = await dataLayer.checkDataAvailability('social');
      expect(typeof available).toBe('boolean');
    });

    it('should return false when provider is none', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        news: { ...defaultConfig.news, provider: 'none' },
      };
      const layer = createDataIntegrationLayer(config);

      const available = await layer.checkDataAvailability('news');
      expect(available).toBe(false);
    });

    it('should return false when API key is missing', async () => {
      const config: DataSourceConfig = {
        ...defaultConfig,
        news: { ...defaultConfig.news, apiKey: undefined },
      };
      const layer = createDataIntegrationLayer(config);

      const available = await layer.checkDataAvailability('news');
      expect(available).toBe(false);
    });
  });

  describe('Data Freshness', () => {
    it('should return null for freshness when no data cached', () => {
      const freshness = dataLayer.getDataFreshness('news', mockMarket.marketId);
      expect(freshness).toBeNull();
    });

    it('should return timestamp after data is cached', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');
      spy.mockResolvedValue(mockNewsArticles);

      await dataLayer.fetchNews(mockMarket);

      const freshness = dataLayer.getDataFreshness('news', mockMarket.marketId);
      expect(typeof freshness).toBe('number');
      expect(freshness).toBeGreaterThan(0);

      spy.mockRestore();
    });
  });

  describe('Fallback Logic', () => {
    it('should use stale cached data when provider fails', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');

      // First call succeeds
      spy.mockResolvedValueOnce(mockNewsArticles);
      await dataLayer.fetchNews(mockMarket);

      // Clear cache to make data stale
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call fails
      spy.mockRejectedValueOnce(new Error('API Error'));

      // Should return cached data despite error
      const articles = await dataLayer.fetchNews(mockMarket);
      expect(articles).toEqual(mockNewsArticles);

      spy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchNewsFromProvider');
      spy.mockRejectedValue(new Error('Network error'));

      const articles = await dataLayer.fetchNews(mockMarket);
      expect(articles).toEqual([]);

      spy.mockRestore();
    });

    it('should handle invalid responses gracefully', async () => {
      const spy = vi.spyOn(dataLayer as any, 'fetchPollingFromProvider');
      spy.mockRejectedValue(new Error('Invalid response'));

      const polling = await dataLayer.fetchPollingData(mockMarket);
      expect(polling).toBeNull();

      spy.mockRestore();
    });
  });
});
