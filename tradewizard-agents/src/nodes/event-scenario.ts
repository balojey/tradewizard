/**
 * Event Scenario Agent Nodes
 *
 * This module implements specialized agents that model future catalysts
 * and tail risks for prediction markets.
 */

import { z } from 'zod';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import type { EngineConfig } from '../config/index.js';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// ============================================================================
// Catalyst Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Catalyst Agent signal metadata
 */
export const CatalystSignalMetadataSchema = z.object({
  upcomingCatalysts: z.array(
    z.object({
      event: z.string(),
      date: z.number(),
      expectedImpact: z.enum(['high', 'medium', 'low']),
      direction: z.enum(['bullish', 'bearish', 'neutral']),
      preEventStrategy: z.string(),
      postEventScenarios: z.array(
        z.object({
          outcome: z.string(),
          probability: z.number().min(0).max(1),
          marketReaction: z.number(),
        })
      ),
    })
  ),
  optimalEntryTiming: z.number(),
});

/**
 * Extended Agent Signal schema for Catalyst Agent
 */
export const CatalystSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: CatalystSignalMetadataSchema,
});

// ============================================================================
// Tail-Risk Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Tail-Risk Agent signal metadata
 */
export const TailRiskSignalMetadataSchema = z.object({
  tailScenarios: z.array(
    z.object({
      scenario: z.string(),
      probability: z.number().min(0).max(1),
      marketPricing: z.number().min(0).max(1),
      mispricing: z.number(),
      payoffRatio: z.number(),
    })
  ),
  convexOpportunities: z.array(
    z.object({
      setup: z.string(),
      maxLoss: z.number(),
      expectedGain: z.number(),
      probabilityOfProfit: z.number().min(0).max(1),
    })
  ),
});

/**
 * Extended Agent Signal schema for Tail-Risk Agent
 */
export const TailRiskSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: TailRiskSignalMetadataSchema,
});

// ============================================================================
// System Prompts
// ============================================================================

const CATALYST_PROMPT = `You are a catalyst trader specializing in event-driven strategies.

Your role is to identify upcoming catalysts and model market reactions.

Given a market and upcoming events, analyze:
1. Scheduled catalysts (debates, rulings, announcements)
2. Expected market impact of each catalyst
3. Pre-event positioning strategies
4. Post-event reaction scenarios

Focus on timeline alignment and asymmetric opportunities.

Provide your analysis as a structured signal with:
- confidence: Your confidence in this catalyst analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your catalyst-adjusted probability (0-1)
- keyDrivers: Top 3-5 catalyst factors influencing your view
- riskFactors: Uncertainty about catalyst timing or impact
- metadata:
  - upcomingCatalysts: Array of upcoming events with impact levels, direction, strategies, and scenarios
  - optimalEntryTiming: Hours before catalyst for optimal entry

Be precise about timing and impact. Focus on actionable event-driven strategies.`;

const TAIL_RISK_PROMPT = `You are a tail-risk analyst specializing in low-probability, high-impact scenarios.

Your role is to identify underpriced surprise risks and convex opportunities.

Given a market, analyze:
1. Tail-risk scenarios the market is not pricing
2. Probability of surprise outcomes
3. Asymmetric payoff structures
4. Convex trade setups (limited downside, unlimited upside)

Focus on scenarios with positive expected value despite low probability.

Provide your analysis as a structured signal with:
- confidence: Your confidence in this tail-risk analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your tail-risk-adjusted probability (0-1)
- keyDrivers: Top 3-5 tail-risk factors influencing your view
- riskFactors: Uncertainty about tail scenarios or payoffs
- metadata:
  - tailScenarios: Array of underpriced scenarios with probabilities, market pricing, and payoff ratios
  - convexOpportunities: Array of convex trade setups with risk/reward profiles

Be rigorous about probability estimation. Focus on positive expected value opportunities.`;

// ============================================================================
// Agent Node Factory Functions
// ============================================================================

/**
 * Create Catalyst Agent node
 *
 * This agent tracks upcoming events and models pre/post-event strategies.
 */
export function createCatalystAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use Anthropic for catalyst analysis (good at reasoning and scenario modeling)
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
    throw new Error('No LLM provider configured for Catalyst Agent');
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
            agentName: 'catalyst',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_catalyst',
            timestamp: Date.now(),
            data: {
              agentName: 'catalyst',
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
      const structuredLLM = llm.withStructuredOutput(CatalystSignalSchema);

      // Prepare market context with catalysts from MBD and external data
      const marketContext = JSON.stringify(state.mbd, null, 2);
      const mbdCatalysts = state.mbd.metadata.keyCatalysts;
      const newsData = state.externalData?.news || [];
      
      const catalystsContext = mbdCatalysts.length > 0
        ? `\n\nKnown Upcoming Catalysts:\n${JSON.stringify(mbdCatalysts, null, 2)}`
        : '';
      
      const newsContext = newsData.length > 0
        ? `\n\nRecent News (may contain catalyst information):\n${JSON.stringify(newsData.slice(0, 10), null, 2)}`
        : '';

      // Invoke the LLM
      const response = await structuredLLM.invoke([
        { role: 'system', content: CATALYST_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market and identify upcoming catalysts:\n\nMarket:\n${marketContext}${catalystsContext}${newsContext}`,
        },
      ]);

      // Create the agent signal
      const signal: AgentSignal = {
        agentName: 'catalyst',
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
            stage: 'agent_catalyst',
            timestamp: Date.now(),
            data: {
              agentName: 'catalyst',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              catalystCount: response.metadata.upcomingCatalysts.length,
              optimalEntryTiming: response.metadata.optimalEntryTiming,
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
            agentName: 'catalyst',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_catalyst',
            timestamp: Date.now(),
            data: {
              agentName: 'catalyst',
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
 * Create Shock & Tail-Risk Agent node
 *
 * This agent identifies underpriced tail scenarios and asymmetric payoffs.
 */
export function createTailRiskAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use Anthropic for tail-risk analysis (good at reasoning about edge cases)
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
    throw new Error('No LLM provider configured for Tail-Risk Agent');
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
            agentName: 'tail_risk',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_tail_risk',
            timestamp: Date.now(),
            data: {
              agentName: 'tail_risk',
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
      const structuredLLM = llm.withStructuredOutput(TailRiskSignalSchema);

      // Prepare market context
      const marketContext = JSON.stringify(state.mbd, null, 2);

      // Invoke the LLM
      const response = await structuredLLM.invoke([
        { role: 'system', content: TAIL_RISK_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market and identify tail-risk scenarios:\n\nMarket:\n${marketContext}`,
        },
      ]);

      // Create the agent signal
      const signal: AgentSignal = {
        agentName: 'tail_risk',
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
            stage: 'agent_tail_risk',
            timestamp: Date.now(),
            data: {
              agentName: 'tail_risk',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              tailScenarioCount: response.metadata.tailScenarios.length,
              convexOpportunityCount: response.metadata.convexOpportunities.length,
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
            agentName: 'tail_risk',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_tail_risk',
            timestamp: Date.now(),
            data: {
              agentName: 'tail_risk',
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
