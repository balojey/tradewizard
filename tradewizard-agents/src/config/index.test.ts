import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, createConfig, getDefaultConfig } from './index.js';

describe('Configuration', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to original environment
    process.env = { ...originalEnv };
    
    // Clear specific test variables
    delete process.env.POLYMARKET_GAMMA_API_URL;
    delete process.env.OPIK_PROJECT_NAME;
    delete process.env.LLM_SINGLE_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.MIN_AGENTS_REQUIRED;
    delete process.env.POLYMARKET_RATE_LIMIT_BUFFER;
    
    // Clear advanced agent env vars
    delete process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_ENABLED;
    delete process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_ENABLED;
    delete process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_ENABLED;
    delete process.env.ADVANCED_AGENTS_PRICE_ACTION_ENABLED;
    delete process.env.ADVANCED_AGENTS_EVENT_SCENARIO_ENABLED;
    delete process.env.ADVANCED_AGENTS_RISK_PHILOSOPHY_ENABLED;
    delete process.env.EXTERNAL_DATA_NEWS_PROVIDER;
    delete process.env.EXTERNAL_DATA_POLLING_PROVIDER;
    delete process.env.EXTERNAL_DATA_SOCIAL_PROVIDERS;
  });

  describe('loadConfig', () => {
    it('should load default configuration', () => {
      // Set at least one LLM provider for multi-provider mode
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config).toBeDefined();
      expect(config.polymarket.gammaApiUrl).toBe('https://gamma-api.polymarket.com');
      expect(config.opik.projectName).toBe('market-intelligence-engine');
      expect(config.agents.minAgentsRequired).toBe(2);
    });

    it('should override configuration from environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.OPIK_PROJECT_NAME = 'test-project';
      process.env.MIN_AGENTS_REQUIRED = '3';

      const config = loadConfig();

      expect(config.opik.projectName).toBe('test-project');
      expect(config.agents.minAgentsRequired).toBe(3);
    });

    it('should validate configuration schema', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.POLYMARKET_RATE_LIMIT_BUFFER = '150'; // Invalid: > 100

      expect(() => loadConfig()).toThrow();
    });

    it('should support single-provider mode', () => {
      process.env.LLM_SINGLE_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

      const config = loadConfig();

      expect(config.llm.singleProvider).toBe('openai');
      expect(config.llm.openai?.apiKey).toBe('sk-test');
      expect(config.llm.openai?.defaultModel).toBe('gpt-4o-mini');
    });

    it('should support multi-provider mode', () => {
      process.env.OPENAI_API_KEY = 'sk-openai';
      process.env.OPENAI_DEFAULT_MODEL = 'gpt-4-turbo';
      process.env.ANTHROPIC_API_KEY = 'sk-anthropic';
      process.env.ANTHROPIC_DEFAULT_MODEL = 'claude-3-sonnet-20240229';
      process.env.GOOGLE_API_KEY = 'google-key';
      process.env.GOOGLE_DEFAULT_MODEL = 'gemini-1.5-flash';

      const config = loadConfig();

      expect(config.llm.singleProvider).toBeUndefined();
      expect(config.llm.openai?.apiKey).toBe('sk-openai');
      expect(config.llm.anthropic?.apiKey).toBe('sk-anthropic');
      expect(config.llm.google?.apiKey).toBe('google-key');
    });

    it('should fail if single-provider mode is set but provider is not configured', () => {
      process.env.LLM_SINGLE_PROVIDER = 'openai';
      // No OPENAI_API_KEY set

      expect(() => loadConfig()).toThrow(/LLM configuration invalid/);
    });

    it('should fail if multi-provider mode has no providers configured', () => {
      // No LLM_SINGLE_PROVIDER and no provider API keys

      expect(() => loadConfig()).toThrow(/LLM configuration invalid/);
    });
  });

  describe('Advanced Agent Configuration', () => {
    it('should load default advanced agent configuration (all disabled)', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config.advancedAgents.eventIntelligence.enabled).toBe(false);
      expect(config.advancedAgents.pollingStatistical.enabled).toBe(false);
      expect(config.advancedAgents.sentimentNarrative.enabled).toBe(false);
      expect(config.advancedAgents.priceAction.enabled).toBe(false);
      expect(config.advancedAgents.eventScenario.enabled).toBe(false);
      expect(config.advancedAgents.riskPhilosophy.enabled).toBe(false);
    });

    it('should enable agent groups via environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_ENABLED = 'true';
      process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_ENABLED = 'true';
      process.env.EXTERNAL_DATA_NEWS_PROVIDER = 'newsapi';
      process.env.EXTERNAL_DATA_POLLING_PROVIDER = '538';

      const config = loadConfig();

      expect(config.advancedAgents.eventIntelligence.enabled).toBe(true);
      expect(config.advancedAgents.pollingStatistical.enabled).toBe(true);
    });

    it('should configure individual agents within groups', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_ENABLED = 'true';
      process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_BREAKING_NEWS = 'false';
      process.env.EXTERNAL_DATA_NEWS_PROVIDER = 'newsapi';

      const config = loadConfig();

      expect(config.advancedAgents.eventIntelligence.enabled).toBe(true);
      expect(config.advancedAgents.eventIntelligence.breakingNews).toBe(false);
      expect(config.advancedAgents.eventIntelligence.eventImpact).toBe(true); // default
    });

    it('should configure price action minimum volume threshold', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_PRICE_ACTION_MIN_VOLUME_THRESHOLD = '5000';

      const config = loadConfig();

      expect(config.advancedAgents.priceAction.minVolumeThreshold).toBe(5000);
    });

    it('should fail if event intelligence enabled without news data source', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_ENABLED = 'true';
      // No news provider configured

      expect(() => loadConfig()).toThrow(/Agent groups enabled but required external data sources not configured/);
    });

    it('should fail if polling agents enabled without polling data source', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_ENABLED = 'true';
      // No polling provider configured

      expect(() => loadConfig()).toThrow(/Agent groups enabled but required external data sources not configured/);
    });

    it('should fail if sentiment agents enabled without news or social data', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_ENABLED = 'true';
      // No news or social providers configured

      expect(() => loadConfig()).toThrow(/Agent groups enabled but required external data sources not configured/);
    });

    it('should allow sentiment agents with news data only', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_ENABLED = 'true';
      process.env.EXTERNAL_DATA_NEWS_PROVIDER = 'newsapi';

      const config = loadConfig();

      expect(config.advancedAgents.sentimentNarrative.enabled).toBe(true);
      expect(config.externalData.news.provider).toBe('newsapi');
    });

    it('should allow sentiment agents with social data only', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_ENABLED = 'true';
      process.env.EXTERNAL_DATA_SOCIAL_PROVIDERS = 'twitter,reddit';

      const config = loadConfig();

      expect(config.advancedAgents.sentimentNarrative.enabled).toBe(true);
      expect(config.externalData.social.providers).toEqual(['twitter', 'reddit']);
    });
  });

  describe('External Data Configuration', () => {
    it('should load default external data configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config.externalData.news.provider).toBe('none');
      expect(config.externalData.polling.provider).toBe('none');
      expect(config.externalData.social.providers).toEqual([]);
    });

    it('should configure news data source', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.EXTERNAL_DATA_NEWS_PROVIDER = 'newsapi';
      process.env.EXTERNAL_DATA_NEWS_API_KEY = 'news-key';
      process.env.EXTERNAL_DATA_NEWS_CACHE_TTL = '600';
      process.env.EXTERNAL_DATA_NEWS_MAX_ARTICLES = '50';

      const config = loadConfig();

      expect(config.externalData.news.provider).toBe('newsapi');
      expect(config.externalData.news.apiKey).toBe('news-key');
      expect(config.externalData.news.cacheTTL).toBe(600);
      expect(config.externalData.news.maxArticles).toBe(50);
    });

    it('should configure polling data source', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.EXTERNAL_DATA_POLLING_PROVIDER = '538';
      process.env.EXTERNAL_DATA_POLLING_API_KEY = 'polling-key';
      process.env.EXTERNAL_DATA_POLLING_CACHE_TTL = '7200';

      const config = loadConfig();

      expect(config.externalData.polling.provider).toBe('538');
      expect(config.externalData.polling.apiKey).toBe('polling-key');
      expect(config.externalData.polling.cacheTTL).toBe(7200);
    });

    it('should configure social data sources', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.EXTERNAL_DATA_SOCIAL_PROVIDERS = 'twitter,reddit';
      process.env.EXTERNAL_DATA_SOCIAL_API_KEYS = '{"twitter":"tw-key","reddit":"rd-key"}';
      process.env.EXTERNAL_DATA_SOCIAL_CACHE_TTL = '180';
      process.env.EXTERNAL_DATA_SOCIAL_MAX_MENTIONS = '200';

      const config = loadConfig();

      expect(config.externalData.social.providers).toEqual(['twitter', 'reddit']);
      expect(config.externalData.social.apiKeys).toEqual({ twitter: 'tw-key', reddit: 'rd-key' });
      expect(config.externalData.social.cacheTTL).toBe(180);
      expect(config.externalData.social.maxMentions).toBe(200);
    });
  });

  describe('Signal Fusion Configuration', () => {
    it('should load default signal fusion configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config.signalFusion.contextAdjustments).toBe(true);
      expect(config.signalFusion.conflictThreshold).toBe(0.20);
      expect(config.signalFusion.alignmentBonus).toBe(0.20);
      expect(config.signalFusion.baseWeights['market_microstructure']).toBe(1.0);
      expect(config.signalFusion.baseWeights['polling_intelligence']).toBe(1.5);
    });

    it('should configure signal fusion parameters', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.SIGNAL_FUSION_CONTEXT_ADJUSTMENTS = 'false';
      process.env.SIGNAL_FUSION_CONFLICT_THRESHOLD = '0.30';
      process.env.SIGNAL_FUSION_ALIGNMENT_BONUS = '0.15';

      const config = loadConfig();

      expect(config.signalFusion.contextAdjustments).toBe(false);
      expect(config.signalFusion.conflictThreshold).toBe(0.30);
      expect(config.signalFusion.alignmentBonus).toBe(0.15);
    });

    it('should configure custom base weights', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.SIGNAL_FUSION_BASE_WEIGHTS = JSON.stringify({
        'market_microstructure': 1.5,
        'breaking_news': 2.0,
      });

      const config = loadConfig();

      expect(config.signalFusion.baseWeights['market_microstructure']).toBe(1.5);
      expect(config.signalFusion.baseWeights['breaking_news']).toBe(2.0);
    });
  });

  describe('Cost Optimization Configuration', () => {
    it('should load default cost optimization configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config.costOptimization.maxCostPerAnalysis).toBe(2.0);
      expect(config.costOptimization.skipLowImpactAgents).toBe(false);
      expect(config.costOptimization.batchLLMRequests).toBe(true);
    });

    it('should configure cost optimization parameters', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.COST_OPTIMIZATION_MAX_COST_PER_ANALYSIS = '0.50';
      process.env.COST_OPTIMIZATION_SKIP_LOW_IMPACT_AGENTS = 'true';
      process.env.COST_OPTIMIZATION_BATCH_LLM_REQUESTS = 'false';

      const config = loadConfig();

      expect(config.costOptimization.maxCostPerAnalysis).toBe(0.50);
      expect(config.costOptimization.skipLowImpactAgents).toBe(true);
      expect(config.costOptimization.batchLLMRequests).toBe(false);
    });
  });

  describe('Performance Tracking Configuration', () => {
    it('should load default performance tracking configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = loadConfig();

      expect(config.performanceTracking.enabled).toBe(false);
      expect(config.performanceTracking.evaluateOnResolution).toBe(true);
      expect(config.performanceTracking.minSampleSize).toBe(10);
    });

    it('should configure performance tracking parameters', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.PERFORMANCE_TRACKING_ENABLED = 'true';
      process.env.PERFORMANCE_TRACKING_EVALUATE_ON_RESOLUTION = 'false';
      process.env.PERFORMANCE_TRACKING_MIN_SAMPLE_SIZE = '20';

      const config = loadConfig();

      expect(config.performanceTracking.enabled).toBe(true);
      expect(config.performanceTracking.evaluateOnResolution).toBe(false);
      expect(config.performanceTracking.minSampleSize).toBe(20);
    });
  });

  describe('createConfig', () => {
    it('should create config with overrides', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = createConfig({
        opik: {
          projectName: 'custom-project',
        },
        agents: {
          timeoutMs: 15000,
          minAgentsRequired: 3,
        },
      });

      expect(config.opik.projectName).toBe('custom-project');
      expect(config.agents.timeoutMs).toBe(15000);
      expect(config.agents.minAgentsRequired).toBe(3);
      // Other values should remain default
      expect(config.polymarket.gammaApiUrl).toBe('https://gamma-api.polymarket.com');
    });

    it('should override LLM configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-base';

      const config = createConfig({
        llm: {
          singleProvider: 'openai',
          openai: {
            apiKey: 'sk-override',
            defaultModel: 'gpt-4o-mini',
          },
        },
      });

      expect(config.llm.singleProvider).toBe('openai');
      expect(config.llm.openai?.apiKey).toBe('sk-override');
      expect(config.llm.openai?.defaultModel).toBe('gpt-4o-mini');
    });

    it('should override advanced agent configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.EXTERNAL_DATA_NEWS_PROVIDER = 'newsapi';

      const config = createConfig({
        advancedAgents: {
          eventIntelligence: {
            enabled: true,
            breakingNews: true,
            eventImpact: false,
          },
        },
      });

      expect(config.advancedAgents.eventIntelligence.enabled).toBe(true);
      expect(config.advancedAgents.eventIntelligence.breakingNews).toBe(true);
      expect(config.advancedAgents.eventIntelligence.eventImpact).toBe(false);
    });

    it('should override external data configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = createConfig({
        externalData: {
          news: {
            provider: 'perplexity',
            apiKey: 'perplexity-key',
            cacheTTL: 1200,
            maxArticles: 30,
          },
        },
      });

      expect(config.externalData.news.provider).toBe('perplexity');
      expect(config.externalData.news.apiKey).toBe('perplexity-key');
      expect(config.externalData.news.cacheTTL).toBe(1200);
      expect(config.externalData.news.maxArticles).toBe(30);
    });

    it('should validate overridden configuration', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      expect(() =>
        createConfig({
          polymarket: {
            rateLimitBuffer: 150, // Invalid: > 100
          } as any,
        })
      ).toThrow();
    });

    it('should deep merge nested objects', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = createConfig({
        opik: {
          projectName: 'custom-project',
          // trackCosts should remain default (true)
        },
      });

      expect(config.opik.projectName).toBe('custom-project');
      expect(config.opik.trackCosts).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration values', () => {
      const defaults = getDefaultConfig();

      expect(defaults.polymarket?.gammaApiUrl).toBe('https://gamma-api.polymarket.com');
      expect(defaults.opik?.projectName).toBe('market-intelligence-engine');
      expect(defaults.agents?.minAgentsRequired).toBe(2);
      expect(defaults.consensus?.minEdgeThreshold).toBe(0.05);
      expect(defaults.logging?.level).toBe('info');
    });

    it('should include advanced agent defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.advancedAgents?.eventIntelligence.enabled).toBe(false);
      expect(defaults.advancedAgents?.pollingStatistical.enabled).toBe(false);
      expect(defaults.advancedAgents?.priceAction.minVolumeThreshold).toBe(1000);
    });

    it('should include external data defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.externalData?.news.provider).toBe('none');
      expect(defaults.externalData?.news.cacheTTL).toBe(900);
      expect(defaults.externalData?.polling.provider).toBe('none');
      expect(defaults.externalData?.social.providers).toEqual([]);
    });

    it('should include signal fusion defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.signalFusion?.contextAdjustments).toBe(true);
      expect(defaults.signalFusion?.conflictThreshold).toBe(0.20);
      expect(defaults.signalFusion?.baseWeights?.['market_microstructure']).toBe(1.0);
    });

    it('should include cost optimization defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.costOptimization?.maxCostPerAnalysis).toBe(2.0);
      expect(defaults.costOptimization?.skipLowImpactAgents).toBe(false);
    });

    it('should include performance tracking defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.performanceTracking?.enabled).toBe(false);
      expect(defaults.performanceTracking?.minSampleSize).toBe(10);
    });

    it('should not include LLM configuration in defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.llm).toBeUndefined();
    });
  });
});
