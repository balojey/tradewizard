/**
 * Polling & Statistical Agent Nodes
 *
 * This module implements specialized agents that analyze polling data
 * and historical patterns for prediction markets.
 */

import { z } from 'zod';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import type { EngineConfig } from '../config/index.js';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// ============================================================================
// Polling Intelligence Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Polling Intelligence Agent signal metadata
 */
export const PollingIntelligenceSignalMetadataSchema = z.object({
  aggregatedProbability: z.number().min(0).max(1),
  momentum: z.enum(['rising', 'falling', 'stable']),
  pollCount: z.number().min(0),
  averageSampleSize: z.number().min(0),
  biasAdjustments: z.record(z.string(), z.number()),
  outlierPolls: z.array(z.string()),
  methodologyConcerns: z.array(z.string()),
});

/**
 * Extended Agent Signal schema for Polling Intelligence Agent
 */
export const PollingIntelligenceSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: PollingIntelligenceSignalMetadataSchema,
});

// ============================================================================
// Historical Pattern Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Historical Pattern Agent signal metadata
 */
export const HistoricalPatternSignalMetadataSchema = z.object({
  analogs: z.array(
    z.object({
      event: z.string(),
      date: z.number(),
      outcome: z.enum(['YES', 'NO']),
      similarity: z.number().min(0).max(1),
      keyFactors: z.array(z.string()),
    })
  ),
  patternSuccessRate: z.number().min(0).max(1),
  applicabilityScore: z.number().min(0).max(1),
});

/**
 * Extended Agent Signal schema for Historical Pattern Agent
 */
export const HistoricalPatternSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: HistoricalPatternSignalMetadataSchema,
});

// ============================================================================
// System Prompts
// ============================================================================

const POLLING_INTELLIGENCE_PROMPT = `You are a polling analyst specializing in election forecasting and statistical modeling.

Your role is to aggregate polls, adjust for bias, and detect momentum shifts.

Given polling data for an election market, analyze:
1. Weighted average probability across all polls
2. Pollster bias adjustments (house effects)
3. Momentum trends (rising, falling, stable)
4. Sample quality and methodology concerns

Apply rigorous statistical methods. Flag outlier polls and methodology issues.

CRITICAL: You MUST apply bias adjustments to polling data before calculating aggregated probability.
For each pollster with known bias, adjust their results before aggregation.

Provide your analysis as a structured signal with:
- confidence: Your confidence in this polling analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your bias-adjusted weighted probability (0-1)
- keyDrivers: Top 3-5 polling factors influencing your view
- riskFactors: Polling uncertainty, methodology concerns, or sample quality issues
- metadata:
  - aggregatedProbability: Bias-adjusted weighted average across all polls
  - momentum: Trend direction (rising/falling/stable)
  - pollCount: Number of polls analyzed
  - averageSampleSize: Average sample size across polls
  - biasAdjustments: Map of pollster name to bias adjustment applied
  - outlierPolls: Array of pollster names with outlier results
  - methodologyConcerns: Array of methodology issues identified

Be rigorous and well-calibrated. Apply known pollster biases systematically.`;

const HISTORICAL_PATTERN_PROMPT = `You are a historical pattern analyst specializing in election and political outcomes.

Your role is to find analogous past events and extract predictive patterns.

Given a market and historical context, analyze:
1. Similar past events (elections, referendums, court cases)
2. Outcome patterns and success rates
3. Key factors that determined outcomes
4. Applicability of historical patterns to current market

Focus on structural similarities, not superficial ones.

Provide your analysis as a structured signal with:
- confidence: Your confidence in this historical analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your pattern-based probability estimate (0-1)
- keyDrivers: Top 3-5 historical factors influencing your view
- riskFactors: Uncertainty about pattern applicability or historical differences
- metadata:
  - analogs: Array of similar past events with outcomes and similarity scores
  - patternSuccessRate: Historical accuracy of identified pattern (0-1)
  - applicabilityScore: How well pattern applies to current market (0-1)

Be rigorous with historical comparisons. Acknowledge when patterns may not apply.`;

// ============================================================================
// Agent Node Factory Functions
// ============================================================================

/**
 * Create Polling Intelligence Agent node
 *
 * This agent aggregates and analyzes polling data with bias adjustments.
 */
export function createPollingIntelligenceAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use Google for polling analysis (good at statistical reasoning)
  // Fall back to OpenAI, then Anthropic if Google not available
  let llm;
  if (config.llm.google) {
    llm = new ChatGoogleGenerativeAI({
      apiKey: config.llm.google.apiKey,
      model: config.llm.google.defaultModel,
    });
  } else if (config.llm.openai) {
    llm = new ChatOpenAI({
      apiKey: config.llm.openai.apiKey,
      model: config.llm.openai.defaultModel,
    });
  } else if (config.llm.anthropic) {
    llm = new ChatAnthropic({
      apiKey: config.llm.anthropic.apiKey,
      model: config.llm.anthropic.defaultModel,
    });
  } else {
    throw new Error('No LLM provider configured for Polling Intelligence Agent');
  }

  // Return the agent node function
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'polling_intelligence',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_polling_intelligence',
            timestamp: Date.now(),
            data: {
              agentName: 'polling_intelligence',
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Fetch polling data from external data layer
      const pollingData = state.externalData?.polling;

      // If no polling data available, skip this agent
      if (!pollingData || pollingData.polls.length === 0) {
        console.warn('[PollingIntelligenceAgent] No polling data available, skipping agent');
        return {
          auditLog: [
            {
              stage: 'agent_polling_intelligence',
              timestamp: Date.now(),
              data: {
                agentName: 'polling_intelligence',
                success: false,
                skipped: true,
                reason: 'No polling data available',
                duration: Date.now() - startTime,
              },
            },
          ],
        };
      }

      // Use structured output with custom schema
      const structuredLLM = llm.withStructuredOutput(PollingIntelligenceSignalSchema);

      // Prepare enhanced market context with polling data
      const marketContext = JSON.stringify(state.mbd, null, 2);
      const pollingContext = JSON.stringify(pollingData, null, 2);

      // Invoke the LLM
      const response = await structuredLLM.invoke([
        { role: 'system', content: POLLING_INTELLIGENCE_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market with polling data:\n\nMarket:\n${marketContext}\n\nPolling Data:\n${pollingContext}`,
        },
      ]);

      // Create the agent signal
      const signal: AgentSignal = {
        agentName: 'polling_intelligence',
        timestamp: Date.now(),
        confidence: response.confidence,
        direction: response.direction,
        fairProbability: response.fairProbability,
        keyDrivers: response.keyDrivers,
        riskFactors: response.riskFactors,
        metadata: response.metadata,
      };

      return {
        agentSignals: [signal],
        auditLog: [
          {
            stage: 'agent_polling_intelligence',
            timestamp: Date.now(),
            data: {
              agentName: 'polling_intelligence',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              pollCount: response.metadata.pollCount,
              momentum: response.metadata.momentum,
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    } catch (error) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'polling_intelligence',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_polling_intelligence',
            timestamp: Date.now(),
            data: {
              agentName: 'polling_intelligence',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }
  };
}

/**
 * Create Historical Pattern Agent node
 *
 * This agent identifies historical analogs and pattern overlays.
 */
export function createHistoricalPatternAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use Anthropic for historical pattern analysis (good at reasoning and comparisons)
  // Fall back to OpenAI, then Google if Anthropic not available
  let llm;
  if (config.llm.anthropic) {
    llm = new ChatAnthropic({
      apiKey: config.llm.anthropic.apiKey,
      model: config.llm.anthropic.defaultModel,
    });
  } else if (config.llm.openai) {
    llm = new ChatOpenAI({
      apiKey: config.llm.openai.apiKey,
      model: config.llm.openai.defaultModel,
    });
  } else if (config.llm.google) {
    llm = new ChatGoogleGenerativeAI({
      apiKey: config.llm.google.apiKey,
      model: config.llm.google.defaultModel,
    });
  } else {
    throw new Error('No LLM provider configured for Historical Pattern Agent');
  }

  // Return the agent node function
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'historical_pattern',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_historical_pattern',
            timestamp: Date.now(),
            data: {
              agentName: 'historical_pattern',
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Use structured output with custom schema
      const structuredLLM = llm.withStructuredOutput(HistoricalPatternSignalSchema);

      // Prepare market context
      const marketContext = JSON.stringify(state.mbd, null, 2);

      // Invoke the LLM
      const response = await structuredLLM.invoke([
        { role: 'system', content: HISTORICAL_PATTERN_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market and identify historical patterns:\n\nMarket:\n${marketContext}`,
        },
      ]);

      // Create the agent signal
      const signal: AgentSignal = {
        agentName: 'historical_pattern',
        timestamp: Date.now(),
        confidence: response.confidence,
        direction: response.direction,
        fairProbability: response.fairProbability,
        keyDrivers: response.keyDrivers,
        riskFactors: response.riskFactors,
        metadata: response.metadata,
      };

      return {
        agentSignals: [signal],
        auditLog: [
          {
            stage: 'agent_historical_pattern',
            timestamp: Date.now(),
            data: {
              agentName: 'historical_pattern',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              analogCount: response.metadata.analogs.length,
              patternSuccessRate: response.metadata.patternSuccessRate,
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    } catch (error) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'historical_pattern',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_historical_pattern',
            timestamp: Date.now(),
            data: {
              agentName: 'historical_pattern',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }
  };
}
