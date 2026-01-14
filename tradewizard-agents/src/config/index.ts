import { z } from 'zod';

/**
 * Configuration schema for the Market Intelligence Engine
 */
const EngineConfigSchema = z.object({
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
});

export type EngineConfig = z.infer<typeof EngineConfigSchema>;

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
