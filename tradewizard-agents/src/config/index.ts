import { z } from 'zod';

/**
 * Configuration schema for the Market Intelligence Engine
 * 
 * The engine supports two LLM configuration modes:
 * 
 * 1. **Single-Provider Mode** (Budget-Friendly):
 *    - Set `llm.singleProvider` to 'openai', 'anthropic', or 'google'
 *    - Configure only that provider's API key and model
 *    - All agents use the same LLM instance with different system prompts
 *    - Lower cost, simpler API key management
 * 
 * 2. **Multi-Provider Mode** (Optimal Quality, Default):
 *    - Leave `llm.singleProvider` undefined
 *    - Configure multiple providers (openai, anthropic, google)
 *    - Each agent uses a different LLM optimized for its task
 *    - Diverse perspectives reduce model-specific biases
 *    - Higher cost but better quality recommendations
 */
const EngineConfigSchema = z
  .object({
    polymarket: z.object({
      gammaApiUrl: z.string().url(),
      clobApiUrl: z.string().url(),
      rateLimitBuffer: z.number().min(0).max(100),
    }),
    langgraph: z.object({
      checkpointer: z.enum(['memory', 'sqlite', 'postgres']).default('memory'),
      recursionLimit: z.number().positive().default(25),
      streamMode: z.enum(['values', 'updates']).default('values'),
    }),
    opik: z.object({
      apiKey: z.string().optional(),
      projectName: z.string(),
      workspace: z.string().optional(),
      baseUrl: z.string().url().optional(),
      tags: z.array(z.string()).default([]),
      trackCosts: z.boolean().default(true),
    }),
    llm: z.object({
      // Single-provider mode: use one LLM for all agents (cost-effective)
      singleProvider: z.enum(['openai', 'anthropic', 'google']).optional(),

      // Multi-provider mode: configure each provider separately (default, better quality)
      openai: z
        .object({
          apiKey: z.string(),
          defaultModel: z.string(),
        })
        .optional(),
      anthropic: z
        .object({
          apiKey: z.string(),
          defaultModel: z.string(),
        })
        .optional(),
      google: z
        .object({
          apiKey: z.string(),
          defaultModel: z.string(),
        })
        .optional(),
    }),
    agents: z.object({
      timeoutMs: z.number().positive(),
      minAgentsRequired: z.number().positive().min(1),
    }),
    consensus: z.object({
      minEdgeThreshold: z.number().min(0).max(1),
      highDisagreementThreshold: z.number().min(0).max(1),
    }),
    logging: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']),
      auditTrailRetentionDays: z.number().positive(),
    }),
  })
  .refine(
    (config) => {
      // If single-provider mode is set, ensure that provider is configured
      if (config.llm.singleProvider) {
        const provider = config.llm.singleProvider;
        if (provider === 'openai' && !config.llm.openai) {
          return false;
        }
        if (provider === 'anthropic' && !config.llm.anthropic) {
          return false;
        }
        if (provider === 'google' && !config.llm.google) {
          return false;
        }
      } else {
        // Multi-provider mode: at least one provider must be configured
        if (!config.llm.openai && !config.llm.anthropic && !config.llm.google) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        'LLM configuration invalid: In single-provider mode, the specified provider must be configured. In multi-provider mode, at least one provider must be configured.',
    }
  );

export type EngineConfig = z.infer<typeof EngineConfigSchema>;

/**
 * Partial configuration for overrides
 */
export type PartialEngineConfig = z.infer<typeof EngineConfigSchema> extends infer T
  ? {
      [K in keyof T]?: T[K] extends object
        ? {
            [P in keyof T[K]]?: T[K][P];
          }
        : T[K];
    }
  : never;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): EngineConfig {
  const config: EngineConfig = {
    polymarket: {
      gammaApiUrl: process.env.POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com',
      clobApiUrl: process.env.POLYMARKET_CLOB_API_URL || 'https://clob.polymarket.com',
      rateLimitBuffer: parseInt(process.env.POLYMARKET_RATE_LIMIT_BUFFER || '80', 10),
    },
    langgraph: {
      checkpointer:
        (process.env.LANGGRAPH_CHECKPOINTER as 'memory' | 'sqlite' | 'postgres') || 'memory',
      recursionLimit: parseInt(process.env.LANGGRAPH_RECURSION_LIMIT || '25', 10),
      streamMode: (process.env.LANGGRAPH_STREAM_MODE as 'values' | 'updates') || 'values',
    },
    opik: {
      apiKey: process.env.OPIK_API_KEY,
      projectName: process.env.OPIK_PROJECT_NAME || 'market-intelligence-engine',
      workspace: process.env.OPIK_WORKSPACE,
      baseUrl: process.env.OPIK_BASE_URL,
      tags: process.env.OPIK_TAGS ? process.env.OPIK_TAGS.split(',') : [],
      trackCosts: process.env.OPIK_TRACK_COSTS !== 'false',
    },
    llm: {
      singleProvider: process.env.LLM_SINGLE_PROVIDER as 'openai' | 'anthropic' | 'google' | undefined,
      openai: process.env.OPENAI_API_KEY
        ? {
            apiKey: process.env.OPENAI_API_KEY,
            defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo',
          }
        : undefined,
      anthropic: process.env.ANTHROPIC_API_KEY
        ? {
            apiKey: process.env.ANTHROPIC_API_KEY,
            defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-sonnet-20240229',
          }
        : undefined,
      google: process.env.GOOGLE_API_KEY
        ? {
            apiKey: process.env.GOOGLE_API_KEY,
            defaultModel: process.env.GOOGLE_DEFAULT_MODEL || 'gemini-1.5-flash',
          }
        : undefined,
    },
    agents: {
      timeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS || '10000', 10),
      minAgentsRequired: parseInt(process.env.MIN_AGENTS_REQUIRED || '2', 10),
    },
    consensus: {
      minEdgeThreshold: parseFloat(process.env.MIN_EDGE_THRESHOLD || '0.05'),
      highDisagreementThreshold: parseFloat(process.env.HIGH_DISAGREEMENT_THRESHOLD || '0.15'),
    },
    logging: {
      level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      auditTrailRetentionDays: parseInt(process.env.AUDIT_TRAIL_RETENTION_DAYS || '30', 10),
    },
  };

  // Validate configuration
  return EngineConfigSchema.parse(config);
}

/**
 * Default configuration instance
 */
export const config = loadConfig();

/**
 * Create a configuration with overrides
 * 
 * This function allows you to override specific configuration values
 * while keeping the rest from environment variables or defaults.
 * 
 * @example
 * ```typescript
 * // Override just the project name
 * const config = createConfig({
 *   opik: { projectName: 'my-custom-project' }
 * });
 * 
 * // Override LLM mode to single-provider
 * const config = createConfig({
 *   llm: {
 *     singleProvider: 'openai',
 *     openai: {
 *       apiKey: 'sk-...',
 *       defaultModel: 'gpt-4o-mini'
 *     }
 *   }
 * });
 * ```
 * 
 * @param overrides - Partial configuration to override defaults
 * @returns Validated configuration with overrides applied
 */
export function createConfig(overrides: Partial<EngineConfig>): EngineConfig {
  const baseConfig = loadConfig();
  
  // Deep merge overrides with base config
  const mergedConfig = {
    ...baseConfig,
    ...overrides,
    polymarket: {
      ...baseConfig.polymarket,
      ...(overrides.polymarket || {}),
    },
    langgraph: {
      ...baseConfig.langgraph,
      ...(overrides.langgraph || {}),
    },
    opik: {
      ...baseConfig.opik,
      ...(overrides.opik || {}),
    },
    llm: {
      ...baseConfig.llm,
      ...(overrides.llm || {}),
      openai: overrides.llm?.openai || baseConfig.llm.openai,
      anthropic: overrides.llm?.anthropic || baseConfig.llm.anthropic,
      google: overrides.llm?.google || baseConfig.llm.google,
    },
    agents: {
      ...baseConfig.agents,
      ...(overrides.agents || {}),
    },
    consensus: {
      ...baseConfig.consensus,
      ...(overrides.consensus || {}),
    },
    logging: {
      ...baseConfig.logging,
      ...(overrides.logging || {}),
    },
  };

  // Validate merged configuration
  return EngineConfigSchema.parse(mergedConfig);
}

/**
 * Get default configuration values
 * 
 * Returns the default configuration without loading from environment variables.
 * Useful for testing or documentation purposes.
 * 
 * @returns Default configuration object
 */
export function getDefaultConfig(): Partial<EngineConfig> {
  return {
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
      projectName: 'market-intelligence-engine',
      tags: [],
      trackCosts: true,
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
  };
}
