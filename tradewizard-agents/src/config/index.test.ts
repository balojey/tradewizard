import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from './index.js';

describe('Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.POLYMARKET_GAMMA_API_URL;
    delete process.env.OPIK_PROJECT_NAME;
  });

  it('should load default configuration', () => {
    const config = loadConfig();

    expect(config).toBeDefined();
    expect(config.polymarket.gammaApiUrl).toBe('https://gamma-api.polymarket.com');
    expect(config.opik.projectName).toBe('market-intelligence-engine');
    expect(config.agents.minAgentsRequired).toBe(2);
  });

  it('should override configuration from environment variables', () => {
    process.env.OPIK_PROJECT_NAME = 'test-project';
    process.env.MIN_AGENTS_REQUIRED = '3';

    const config = loadConfig();

    expect(config.opik.projectName).toBe('test-project');
    expect(config.agents.minAgentsRequired).toBe(3);
  });

  it('should validate configuration schema', () => {
    process.env.POLYMARKET_RATE_LIMIT_BUFFER = '150'; // Invalid: > 100

    expect(() => loadConfig()).toThrow();
  });
});
