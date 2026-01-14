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

    it('should not include LLM configuration in defaults', () => {
      const defaults = getDefaultConfig();

      expect(defaults.llm).toBeUndefined();
    });
  });
});
