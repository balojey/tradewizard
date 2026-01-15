import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createConfig } from './index.js';
import type { EngineConfig } from './index.js';

/**
 * Property-Based Tests for Configuration Validation
 * 
 * Feature: advanced-agent-league, Property 16: Configuration validation
 * Validates: Requirements 12.5
 * 
 * Property: For any engine configuration loaded, when agent groups are enabled
 * but required external data sources are not configured, the system should log
 * validation errors and disable those agent groups.
 */

describe('Configuration Property Tests', () => {
  // Generator for valid LLM configuration (required for all configs)
  const validLLMConfigGen = fc.constantFrom(
    {
      llm: {
        singleProvider: 'openai' as const,
        openai: {
          apiKey: 'sk-test-key',
          defaultModel: 'gpt-4-turbo',
        },
      },
    },
    {
      llm: {
        openai: {
          apiKey: 'sk-test-key',
          defaultModel: 'gpt-4-turbo',
        },
      },
    }
  );

  // Generator for external data news provider
  const newsProviderGen = fc.constantFrom('newsapi' as const, 'perplexity' as const, 'none' as const);

  // Generator for external data polling provider
  const pollingProviderGen = fc.constantFrom('538' as const, 'rcp' as const, 'polymarket' as const, 'none' as const);

  // Generator for external data social providers
  const socialProvidersGen = fc.constantFrom(
    [] as ('twitter' | 'reddit')[],
    ['twitter'] as ('twitter' | 'reddit')[],
    ['reddit'] as ('twitter' | 'reddit')[],
    ['twitter', 'reddit'] as ('twitter' | 'reddit')[]
  );

  /**
   * Property 16: Configuration validation
   * 
   * When agent groups are enabled but required data sources are not configured,
   * the configuration should fail validation.
   */
  it('should fail validation when event intelligence enabled without news data', () => {
    fc.assert(
      fc.property(
        validLLMConfigGen,
        (llmConfig) => {
          // Enable event intelligence without news provider
          const config: Partial<EngineConfig> = {
            ...llmConfig,
            advancedAgents: {
              eventIntelligence: {
                enabled: true,
                breakingNews: true,
                eventImpact: true,
              },
              pollingStatistical: {
                enabled: false,
                pollingIntelligence: true,
                historicalPattern: true,
              },
              sentimentNarrative: {
                enabled: false,
                mediaSentiment: true,
                socialSentiment: true,
                narrativeVelocity: true,
              },
              priceAction: {
                enabled: false,
                momentum: true,
                meanReversion: true,
                minVolumeThreshold: 1000,
              },
              eventScenario: {
                enabled: false,
                catalyst: true,
                tailRisk: true,
              },
              riskPhilosophy: {
                enabled: false,
                aggressive: true,
                conservative: true,
                neutral: true,
              },
            },
            externalData: {
              news: {
                provider: 'none', // No news provider
                cacheTTL: 900,
                maxArticles: 20,
              },
              polling: {
                provider: 'none',
                cacheTTL: 3600,
              },
              social: {
                providers: [],
                cacheTTL: 300,
                maxMentions: 100,
              },
            },
          };

          // Should throw validation error
          expect(() => createConfig(config)).toThrow(/Agent groups enabled but required external data sources not configured/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when polling agents enabled without polling data', () => {
    fc.assert(
      fc.property(
        validLLMConfigGen,
        (llmConfig) => {
          // Enable polling agents without polling provider
          const config: Partial<EngineConfig> = {
            ...llmConfig,
            advancedAgents: {
              eventIntelligence: {
                enabled: false,
                breakingNews: true,
                eventImpact: true,
              },
              pollingStatistical: {
                enabled: true,
                pollingIntelligence: true,
                historicalPattern: true,
              },
              sentimentNarrative: {
                enabled: false,
                mediaSentiment: true,
                socialSentiment: true,
                narrativeVelocity: true,
              },
              priceAction: {
                enabled: false,
                momentum: true,
                meanReversion: true,
                minVolumeThreshold: 1000,
              },
              eventScenario: {
                enabled: false,
                catalyst: true,
                tailRisk: true,
              },
              riskPhilosophy: {
                enabled: false,
                aggressive: true,
                conservative: true,
                neutral: true,
              },
            },
            externalData: {
              news: {
                provider: 'none',
                cacheTTL: 900,
                maxArticles: 20,
              },
              polling: {
                provider: 'none', // No polling provider
                cacheTTL: 3600,
              },
              social: {
                providers: [],
                cacheTTL: 300,
                maxMentions: 100,
              },
            },
          };

          // Should throw validation error
          expect(() => createConfig(config)).toThrow(/Agent groups enabled but required external data sources not configured/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when sentiment agents enabled without news or social data', () => {
    fc.assert(
      fc.property(
        validLLMConfigGen,
        (llmConfig) => {
          // Enable sentiment agents without news or social providers
          const config: Partial<EngineConfig> = {
            ...llmConfig,
            advancedAgents: {
              eventIntelligence: {
                enabled: false,
                breakingNews: true,
                eventImpact: true,
              },
              pollingStatistical: {
                enabled: false,
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
                enabled: false,
                momentum: true,
                meanReversion: true,
                minVolumeThreshold: 1000,
              },
              eventScenario: {
                enabled: false,
                catalyst: true,
                tailRisk: true,
              },
              riskPhilosophy: {
                enabled: false,
                aggressive: true,
                conservative: true,
                neutral: true,
              },
            },
            externalData: {
              news: {
                provider: 'none', // No news provider
                cacheTTL: 900,
                maxArticles: 20,
              },
              polling: {
                provider: 'none',
                cacheTTL: 3600,
              },
              social: {
                providers: [], // No social providers
                cacheTTL: 300,
                maxMentions: 100,
              },
            },
          };

          // Should throw validation error
          expect(() => createConfig(config)).toThrow(/Agent groups enabled but required external data sources not configured/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass validation when agent groups have required data sources', () => {
    fc.assert(
      fc.property(
        validLLMConfigGen,
        newsProviderGen,
        pollingProviderGen,
        socialProvidersGen,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (llmConfig, newsProvider, pollingProvider, socialProviders, enableEvent, enablePolling, enableSentiment) => {
          // Only enable agent groups if their data sources are configured
          const shouldEnableEvent = enableEvent && newsProvider !== 'none';
          const shouldEnablePolling = enablePolling && pollingProvider !== 'none';
          const shouldEnableSentiment = enableSentiment && (newsProvider !== 'none' || socialProviders.length > 0);

          const config: Partial<EngineConfig> = {
            ...llmConfig,
            advancedAgents: {
              eventIntelligence: {
                enabled: shouldEnableEvent,
                breakingNews: true,
                eventImpact: true,
              },
              pollingStatistical: {
                enabled: shouldEnablePolling,
                pollingIntelligence: true,
                historicalPattern: true,
              },
              sentimentNarrative: {
                enabled: shouldEnableSentiment,
                mediaSentiment: true,
                socialSentiment: true,
                narrativeVelocity: true,
              },
              priceAction: {
                enabled: false,
                momentum: true,
                meanReversion: true,
                minVolumeThreshold: 1000,
              },
              eventScenario: {
                enabled: false,
                catalyst: true,
                tailRisk: true,
              },
              riskPhilosophy: {
                enabled: false,
                aggressive: true,
                conservative: true,
                neutral: true,
              },
            },
            externalData: {
              news: {
                provider: newsProvider,
                cacheTTL: 900,
                maxArticles: 20,
              },
              polling: {
                provider: pollingProvider,
                cacheTTL: 3600,
              },
              social: {
                providers: socialProviders,
                cacheTTL: 300,
                maxMentions: 100,
              },
            },
          };

          // Should not throw - configuration is valid
          expect(() => createConfig(config)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass validation when agent groups are disabled regardless of data sources', () => {
    fc.assert(
      fc.property(
        validLLMConfigGen,
        newsProviderGen,
        pollingProviderGen,
        socialProvidersGen,
        (llmConfig, newsProvider, pollingProvider, socialProviders) => {
          // All agent groups disabled - data sources don't matter
          const config: Partial<EngineConfig> = {
            ...llmConfig,
            advancedAgents: {
              eventIntelligence: {
                enabled: false,
                breakingNews: true,
                eventImpact: true,
              },
              pollingStatistical: {
                enabled: false,
                pollingIntelligence: true,
                historicalPattern: true,
              },
              sentimentNarrative: {
                enabled: false,
                mediaSentiment: true,
                socialSentiment: true,
                narrativeVelocity: true,
              },
              priceAction: {
                enabled: false,
                momentum: true,
                meanReversion: true,
                minVolumeThreshold: 1000,
              },
              eventScenario: {
                enabled: false,
                catalyst: true,
                tailRisk: true,
              },
              riskPhilosophy: {
                enabled: false,
                aggressive: true,
                conservative: true,
                neutral: true,
              },
            },
            externalData: {
              news: {
                provider: newsProvider,
                cacheTTL: 900,
                maxArticles: 20,
              },
              polling: {
                provider: pollingProvider,
                cacheTTL: 3600,
              },
              social: {
                providers: socialProviders,
                cacheTTL: 300,
                maxMentions: 100,
              },
            },
          };

          // Should not throw - all agents disabled
          expect(() => createConfig(config)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
