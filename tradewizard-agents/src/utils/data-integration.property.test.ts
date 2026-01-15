/**
 * Property-based tests for Data Integration Layer
 *
 * Feature: advanced-agent-league
 * Property 2: External data caching consistency
 * Validates: Requirements 7.2, 13.2
 */

import { describe, it, vi } from 'vitest';
import fc from 'fast-check';
import {
  createDataIntegrationLayer,
  type DataSourceConfig,
  type NewsArticle,
} from './data-integration.js';
import type { MarketBriefingDocument } from '../models/types.js';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a random market briefing document
 */
const marketGenerator = (): fc.Arbitrary<MarketBriefingDocument> =>
  fc.record({
    marketId: fc.string({ minLength: 5, maxLength: 20 }),
    conditionId: fc.string({ minLength: 5, maxLength: 20 }),
    eventType: fc.constantFrom('election', 'policy', 'court', 'geopolitical', 'economic', 'other'),
    question: fc.string({ minLength: 10, maxLength: 100 }),
    resolutionCriteria: fc.string({ minLength: 10, maxLength: 100 }),
    expiryTimestamp: fc.integer({ min: Date.now(), max: Date.now() + 86400000 * 365 }),
    currentProbability: fc.double({ min: 0, max: 1, noNaN: true }),
    liquidityScore: fc.double({ min: 0, max: 10, noNaN: true }),
    bidAskSpread: fc.double({ min: 0, max: 10, noNaN: true }),
    volatilityRegime: fc.constantFrom('low', 'medium', 'high'),
    volume24h: fc.integer({ min: 0, max: 1000000 }),
    metadata: fc.record({
      ambiguityFlags: fc.array(fc.string(), { maxLength: 5 }),
      keyCatalysts: fc.array(
        fc.record({
          event: fc.string(),
          timestamp: fc.integer({ min: Date.now(), max: Date.now() + 86400000 * 30 }),
        }),
        { maxLength: 5 }
      ),
    }),
  });

/**
 * Generate random news articles
 */
const newsArticlesGenerator = (): fc.Arbitrary<NewsArticle[]> =>
  fc.array(
    fc.record({
      title: fc.string({ minLength: 10, maxLength: 100 }),
      source: fc.string({ minLength: 5, maxLength: 30 }),
      publishedAt: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
      url: fc.webUrl(),
      summary: fc.string({ minLength: 20, maxLength: 200 }),
      sentiment: fc.constantFrom('positive', 'negative', 'neutral'),
      relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
    { minLength: 0, maxLength: 20 }
  );

/**
 * Generate a data source configuration with specific TTL
 */
const configWithTTLGenerator = (ttl: number): fc.Arbitrary<DataSourceConfig> =>
  fc.constant({
    news: {
      provider: 'newsapi' as const,
      apiKey: 'test-key',
      cacheTTL: ttl,
      maxArticles: 50,
    },
    polling: {
      provider: '538' as const,
      apiKey: 'test-key',
      cacheTTL: 3600,
    },
    social: {
      providers: ['twitter' as const, 'reddit' as const],
      apiKeys: { twitter: 'test-key', reddit: 'test-key' },
      cacheTTL: 300,
      maxMentions: 1000,
    },
  });

// ============================================================================
// Property Tests
// ============================================================================

describe('Data Integration Layer - Property Tests', () => {
  describe('Property 2: External data caching consistency', () => {
    it('should return cached data without API call when within TTL window', async () => {
      await fc.assert(
        fc.asyncProperty(
          marketGenerator(),
          newsArticlesGenerator(),
          configWithTTLGenerator(60), // 60 second TTL
          async (market, articles, config) => {
            const layer = createDataIntegrationLayer(config);

            // Mock the provider to return articles
            const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
            spy.mockResolvedValue(articles);

            // First fetch - should call provider
            const result1 = await layer.fetchNews(market, 24);
            const callCount1 = spy.mock.calls.length;

            // Second fetch immediately - should use cache
            const result2 = await layer.fetchNews(market, 24);
            const callCount2 = spy.mock.calls.length;

            spy.mockRestore();

            // Property: Second call should not increase call count
            return callCount2 === callCount1 && JSON.stringify(result1) === JSON.stringify(result2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return same data for multiple cache hits within TTL', async () => {
      await fc.assert(
        fc.asyncProperty(
          marketGenerator(),
          newsArticlesGenerator(),
          fc.integer({ min: 3, max: 10 }), // Number of fetches
          async (market, articles, numFetches) => {
            const config: DataSourceConfig = {
              news: {
                provider: 'newsapi',
                apiKey: 'test-key',
                cacheTTL: 60,
                maxArticles: 50,
              },
              polling: {
                provider: '538',
                apiKey: 'test-key',
                cacheTTL: 3600,
              },
              social: {
                providers: ['twitter', 'reddit'],
                apiKeys: { twitter: 'test-key', reddit: 'test-key' },
                cacheTTL: 300,
                maxMentions: 1000,
              },
            };

            const layer = createDataIntegrationLayer(config);

            // Mock the provider
            const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
            spy.mockResolvedValue(articles);

            // Fetch multiple times
            const results: NewsArticle[][] = [];
            for (let i = 0; i < numFetches; i++) {
              results.push(await layer.fetchNews(market, 24));
            }

            const callCount = spy.mock.calls.length;
            spy.mockRestore();

            // Property: Should only call provider once
            if (callCount !== 1) return false;

            // Property: All results should be identical
            const firstResult = JSON.stringify(results[0]);
            return results.every((result) => JSON.stringify(result) === firstResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not make API call when returning cached data', async () => {
      await fc.assert(
        fc.asyncProperty(
          marketGenerator(),
          newsArticlesGenerator(),
          async (market, articles) => {
            const config: DataSourceConfig = {
              news: {
                provider: 'newsapi',
                apiKey: 'test-key',
                cacheTTL: 60,
                maxArticles: 50,
              },
              polling: {
                provider: '538',
                apiKey: 'test-key',
                cacheTTL: 3600,
              },
              social: {
                providers: ['twitter', 'reddit'],
                apiKeys: { twitter: 'test-key', reddit: 'test-key' },
                cacheTTL: 300,
                maxMentions: 1000,
              },
            };

            const layer = createDataIntegrationLayer(config);

            // Mock the provider
            const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
            spy.mockResolvedValue(articles);

            // First call
            await layer.fetchNews(market, 24);

            // Reset spy to track only subsequent calls
            spy.mockClear();

            // Second call - should use cache
            await layer.fetchNews(market, 24);

            const subsequentCalls = spy.mock.calls.length;
            spy.mockRestore();

            // Property: No API calls should be made for cached data
            return subsequentCalls === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cache data separately for different markets', async () => {
      await fc.assert(
        fc.asyncProperty(
          marketGenerator(),
          marketGenerator(),
          newsArticlesGenerator(),
          newsArticlesGenerator(),
          async (market1, market2, articles1, articles2) => {
            // Ensure markets are different
            if (market1.marketId === market2.marketId) {
              market2 = { ...market2, marketId: market1.marketId + '_different' };
            }

            const config: DataSourceConfig = {
              news: {
                provider: 'newsapi',
                apiKey: 'test-key',
                cacheTTL: 60,
                maxArticles: 50,
              },
              polling: {
                provider: '538',
                apiKey: 'test-key',
                cacheTTL: 3600,
              },
              social: {
                providers: ['twitter', 'reddit'],
                apiKeys: { twitter: 'test-key', reddit: 'test-key' },
                cacheTTL: 300,
                maxMentions: 1000,
              },
            };

            const layer = createDataIntegrationLayer(config);

            // Mock the provider to return different data for each market
            const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
            let callIndex = 0;
            spy.mockImplementation(async () => {
              const result = callIndex === 0 ? articles1 : articles2;
              callIndex++;
              return result;
            });

            // Fetch for both markets
            const result1 = await layer.fetchNews(market1, 24);
            const result2 = await layer.fetchNews(market2, 24);

            // Fetch again - should use cache
            const result1Cached = await layer.fetchNews(market1, 24);
            const result2Cached = await layer.fetchNews(market2, 24);

            const callCount = spy.mock.calls.length;
            spy.mockRestore();

            // Property: Should call provider twice (once per market)
            if (callCount !== 2) return false;

            // Property: Cached results should match original results
            return (
              JSON.stringify(result1) === JSON.stringify(result1Cached) &&
              JSON.stringify(result2) === JSON.stringify(result2Cached)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data integrity through cache operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          marketGenerator(),
          newsArticlesGenerator(),
          async (market, articles) => {
            const config: DataSourceConfig = {
              news: {
                provider: 'newsapi',
                apiKey: 'test-key',
                cacheTTL: 60,
                maxArticles: 50,
              },
              polling: {
                provider: '538',
                apiKey: 'test-key',
                cacheTTL: 3600,
              },
              social: {
                providers: ['twitter', 'reddit'],
                apiKeys: { twitter: 'test-key', reddit: 'test-key' },
                cacheTTL: 300,
                maxMentions: 1000,
              },
            };

            const layer = createDataIntegrationLayer(config);

            // Mock the provider
            const spy = vi.spyOn(layer as any, 'fetchNewsFromProvider');
            spy.mockResolvedValue(articles);

            // Fetch and cache
            const originalResult = await layer.fetchNews(market, 24);

            // Get from cache
            const cachedResult = await layer.fetchNews(market, 24);

            spy.mockRestore();

            // Property: Cached data should be deep equal to original
            // Check all properties of all articles
            if (originalResult.length !== cachedResult.length) return false;

            for (let i = 0; i < originalResult.length; i++) {
              const orig = originalResult[i];
              const cached = cachedResult[i];

              if (
                orig.title !== cached.title ||
                orig.source !== cached.source ||
                orig.publishedAt !== cached.publishedAt ||
                orig.url !== cached.url ||
                orig.summary !== cached.summary ||
                orig.sentiment !== cached.sentiment ||
                orig.relevanceScore !== cached.relevanceScore
              ) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
