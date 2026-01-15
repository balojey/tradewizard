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
    // ============================================================================
    // Advanced Agent League Configuration
    // ============================================================================
    advancedAgents: z.object({
      eventIntelligence: z.object({
        enabled: z.boolean().default(false),
        breakingNews: z.boolean().default(true),
        eventImpact: z.boolean().default(true),
      }).default({}),
      pollingStatistical: z.object({
        enabled: z.boolean().default(false),
        pollingIntelligence: z.boolean().default(true),
        historicalPattern: z.boolean().default(true),
      }).default({}),
      sentimentNarrative: z.object({
        enabled: z.boolean().default(false),
        mediaSentiment: z.boolean().default(true),
        socialSentiment: z.boolean().default(true),
        narrativeVelocity: z.boolean().default(true),
      }).default({}),
      priceAction: z.object({
        enabled: z.boolean().default(false),
        momentum: z.boolean().default(true),
        meanReversion: z.boolean().default(true),
        minVolumeThreshold: z.number().positive().default(1000),
      }).default({}),
      eventScenario: z.object({
        enabled: z.boolean().default(false),
        catalyst: z.boolean().default(true),
        tailRisk: z.boolean().default(true),
      }).default({}),
      riskPhilosophy: z.object({
        enabled: z.boolean().default(false),
        aggressive: z.boolean().default(true),
        conservative: z.boolean().default(true),
        neutral: z.boolean().default(true),
      }).default({}),
    }).default({}),
    externalData: z.object({
      news: z.object({
        provider: z.enum(['newsapi', 'perplexity', 'none']).default('none'),
        apiKey: z.string().optional(),
        cacheTTL: z.number().positive().default(900), // 15 minutes
        maxArticles: z.number().positive().default(20),
      }).default({}),
      polling: z.object({
        provider: z.enum(['538', 'rcp', 'polymarket', 'none']).default('none'),
        apiKey: z.string().optional(),
        cacheTTL: z.number().positive().default(3600), // 1 hour
      }).default({}),
      social: z.object({
        providers: z.array(z.enum(['twitter', 'reddit'])).default([]),
        apiKeys: z.record(z.string(), z.string()).optional(),
        cacheTTL: z.number().positive().default(300), // 5 minutes
        maxMentions: z.number().positive().default(100),
      }).default({}),
    }).default({}),
    signalFusion: z.object({
      baseWeights: z.record(z.string(), z.number()).default({
        'market_microstructure': 1.0,
        'probability_baseline': 1.0,
        'risk_assessment': 1.0,
        'breaking_news': 1.2,
        'event_impact': 1.2,
        'polling_intelligence': 1.5,
        'historical_pattern': 1.0,
        'media_sentiment': 0.8,
        'social_sentiment': 0.8,
        'narrative_velocity': 0.8,
        'momentum': 1.0,
        'mean_reversion': 1.0,
        'catalyst': 1.0,
        'tail_risk': 1.0,
      }),
      contextAdjustments: z.boolean().default(true),
      conflictThreshold: z.number().min(0).max(1).default(0.20),
      alignmentBonus: z.number().min(0).max(1).default(0.20),
    }).default({}),
    costOptimization: z.object({
      maxCostPerAnalysis: z.number().positive().default(2.0),
      skipLowImpactAgents: z.boolean().default(false),
      batchLLMRequests: z.boolean().default(true),
    }).default({}),
    performanceTracking: z.object({
      enabled: z.boolean().default(false),
      evaluateOnResolution: z.boolean().default(true),
      minSampleSize: z.number().positive().default(10),
    }).default({}),
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
  )
  .refine(
    (config) => {
      // Validate that enabled agent groups have required data sources configured
      const errors: string[] = [];
      
      // Event Intelligence requires news data
      if (config.advancedAgents.eventIntelligence.enabled && 
          config.externalData.news.provider === 'none') {
        errors.push('Event Intelligence agents require news data source to be configured');
      }
      
      // Polling agents require polling data
      if (config.advancedAgents.pollingStatistical.enabled && 
          config.externalData.polling.provider === 'none') {
        errors.push('Polling & Statistical agents require polling data source to be configured');
      }
      
      // Sentiment agents require news or social data
      if (config.advancedAgents.sentimentNarrative.enabled && 
          config.externalData.news.provider === 'none' && 
          config.externalData.social.providers.length === 0) {
        errors.push('Sentiment & Narrative agents require news or social data sources to be configured');
      }
      
      return errors.length === 0;
    },
    {
      message: 'Agent groups enabled but required external data sources not configured',
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
    advancedAgents: {
      eventIntelligence: {
        enabled: process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_ENABLED === 'true',
        breakingNews: process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_BREAKING_NEWS !== 'false',
        eventImpact: process.env.ADVANCED_AGENTS_EVENT_INTELLIGENCE_EVENT_IMPACT !== 'false',
      },
      pollingStatistical: {
        enabled: process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_ENABLED === 'true',
        pollingIntelligence: process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_POLLING_INTELLIGENCE !== 'false',
        historicalPattern: process.env.ADVANCED_AGENTS_POLLING_STATISTICAL_HISTORICAL_PATTERN !== 'false',
      },
      sentimentNarrative: {
        enabled: process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_ENABLED === 'true',
        mediaSentiment: process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_MEDIA_SENTIMENT !== 'false',
        socialSentiment: process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_SOCIAL_SENTIMENT !== 'false',
        narrativeVelocity: process.env.ADVANCED_AGENTS_SENTIMENT_NARRATIVE_NARRATIVE_VELOCITY !== 'false',
      },
      priceAction: {
        enabled: process.env.ADVANCED_AGENTS_PRICE_ACTION_ENABLED === 'true',
        momentum: process.env.ADVANCED_AGENTS_PRICE_ACTION_MOMENTUM !== 'false',
        meanReversion: process.env.ADVANCED_AGENTS_PRICE_ACTION_MEAN_REVERSION !== 'false',
        minVolumeThreshold: parseInt(process.env.ADVANCED_AGENTS_PRICE_ACTION_MIN_VOLUME_THRESHOLD || '1000', 10),
      },
      eventScenario: {
        enabled: process.env.ADVANCED_AGENTS_EVENT_SCENARIO_ENABLED === 'true',
        catalyst: process.env.ADVANCED_AGENTS_EVENT_SCENARIO_CATALYST !== 'false',
        tailRisk: process.env.ADVANCED_AGENTS_EVENT_SCENARIO_TAIL_RISK !== 'false',
      },
      riskPhilosophy: {
        enabled: process.env.ADVANCED_AGENTS_RISK_PHILOSOPHY_ENABLED === 'true',
        aggressive: process.env.ADVANCED_AGENTS_RISK_PHILOSOPHY_AGGRESSIVE !== 'false',
        conservative: process.env.ADVANCED_AGENTS_RISK_PHILOSOPHY_CONSERVATIVE !== 'false',
        neutral: process.env.ADVANCED_AGENTS_RISK_PHILOSOPHY_NEUTRAL !== 'false',
      },
    },
    externalData: {
      news: {
        provider: (process.env.EXTERNAL_DATA_NEWS_PROVIDER as 'newsapi' | 'perplexity' | 'none') || 'none',
        apiKey: process.env.EXTERNAL_DATA_NEWS_API_KEY,
        cacheTTL: parseInt(process.env.EXTERNAL_DATA_NEWS_CACHE_TTL || '900', 10),
        maxArticles: parseInt(process.env.EXTERNAL_DATA_NEWS_MAX_ARTICLES || '20', 10),
      },
      polling: {
        provider: (process.env.EXTERNAL_DATA_POLLING_PROVIDER as '538' | 'rcp' | 'polymarket' | 'none') || 'none',
        apiKey: process.env.EXTERNAL_DATA_POLLING_API_KEY,
        cacheTTL: parseInt(process.env.EXTERNAL_DATA_POLLING_CACHE_TTL || '3600', 10),
      },
      social: {
        providers: process.env.EXTERNAL_DATA_SOCIAL_PROVIDERS 
          ? (process.env.EXTERNAL_DATA_SOCIAL_PROVIDERS.split(',') as ('twitter' | 'reddit')[])
          : [],
        apiKeys: process.env.EXTERNAL_DATA_SOCIAL_API_KEYS 
          ? JSON.parse(process.env.EXTERNAL_DATA_SOCIAL_API_KEYS)
          : undefined,
        cacheTTL: parseInt(process.env.EXTERNAL_DATA_SOCIAL_CACHE_TTL || '300', 10),
        maxMentions: parseInt(process.env.EXTERNAL_DATA_SOCIAL_MAX_MENTIONS || '100', 10),
      },
    },
    signalFusion: {
      baseWeights: process.env.SIGNAL_FUSION_BASE_WEIGHTS
        ? JSON.parse(process.env.SIGNAL_FUSION_BASE_WEIGHTS)
        : {
            'market_microstructure': 1.0,
            'probability_baseline': 1.0,
            'risk_assessment': 1.0,
            'breaking_news': 1.2,
            'event_impact': 1.2,
            'polling_intelligence': 1.5,
            'historical_pattern': 1.0,
            'media_sentiment': 0.8,
            'social_sentiment': 0.8,
            'narrative_velocity': 0.8,
            'momentum': 1.0,
            'mean_reversion': 1.0,
            'catalyst': 1.0,
            'tail_risk': 1.0,
          },
      contextAdjustments: process.env.SIGNAL_FUSION_CONTEXT_ADJUSTMENTS !== 'false',
      conflictThreshold: parseFloat(process.env.SIGNAL_FUSION_CONFLICT_THRESHOLD || '0.20'),
      alignmentBonus: parseFloat(process.env.SIGNAL_FUSION_ALIGNMENT_BONUS || '0.20'),
    },
    costOptimization: {
      maxCostPerAnalysis: parseFloat(process.env.COST_OPTIMIZATION_MAX_COST_PER_ANALYSIS || '2.0'),
      skipLowImpactAgents: process.env.COST_OPTIMIZATION_SKIP_LOW_IMPACT_AGENTS === 'true',
      batchLLMRequests: process.env.COST_OPTIMIZATION_BATCH_LLM_REQUESTS !== 'false',
    },
    performanceTracking: {
      enabled: process.env.PERFORMANCE_TRACKING_ENABLED === 'true',
      evaluateOnResolution: process.env.PERFORMANCE_TRACKING_EVALUATE_ON_RESOLUTION !== 'false',
      minSampleSize: parseInt(process.env.PERFORMANCE_TRACKING_MIN_SAMPLE_SIZE || '10', 10),
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
    advancedAgents: {
      eventIntelligence: {
        ...baseConfig.advancedAgents.eventIntelligence,
        ...(overrides.advancedAgents?.eventIntelligence || {}),
      },
      pollingStatistical: {
        ...baseConfig.advancedAgents.pollingStatistical,
        ...(overrides.advancedAgents?.pollingStatistical || {}),
      },
      sentimentNarrative: {
        ...baseConfig.advancedAgents.sentimentNarrative,
        ...(overrides.advancedAgents?.sentimentNarrative || {}),
      },
      priceAction: {
        ...baseConfig.advancedAgents.priceAction,
        ...(overrides.advancedAgents?.priceAction || {}),
      },
      eventScenario: {
        ...baseConfig.advancedAgents.eventScenario,
        ...(overrides.advancedAgents?.eventScenario || {}),
      },
      riskPhilosophy: {
        ...baseConfig.advancedAgents.riskPhilosophy,
        ...(overrides.advancedAgents?.riskPhilosophy || {}),
      },
    },
    externalData: {
      news: {
        ...baseConfig.externalData.news,
        ...(overrides.externalData?.news || {}),
      },
      polling: {
        ...baseConfig.externalData.polling,
        ...(overrides.externalData?.polling || {}),
      },
      social: {
        ...baseConfig.externalData.social,
        ...(overrides.externalData?.social || {}),
      },
    },
    signalFusion: {
      ...baseConfig.signalFusion,
      ...(overrides.signalFusion || {}),
    },
    costOptimization: {
      ...baseConfig.costOptimization,
      ...(overrides.costOptimization || {}),
    },
    performanceTracking: {
      ...baseConfig.performanceTracking,
      ...(overrides.performanceTracking || {}),
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
        provider: 'none',
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
    signalFusion: {
      baseWeights: {
        'market_microstructure': 1.0,
        'probability_baseline': 1.0,
        'risk_assessment': 1.0,
        'breaking_news': 1.2,
        'event_impact': 1.2,
        'polling_intelligence': 1.5,
        'historical_pattern': 1.0,
        'media_sentiment': 0.8,
        'social_sentiment': 0.8,
        'narrative_velocity': 0.8,
        'momentum': 1.0,
        'mean_reversion': 1.0,
        'catalyst': 1.0,
        'tail_risk': 1.0,
      },
      contextAdjustments: true,
      conflictThreshold: 0.20,
      alignmentBonus: 0.20,
    },
    costOptimization: {
      maxCostPerAnalysis: 2.0,
      skipLowImpactAgents: false,
      batchLLMRequests: true,
    },
    performanceTracking: {
      enabled: false,
      evaluateOnResolution: true,
      minSampleSize: 10,
    },
  };
}
