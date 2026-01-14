/**
 * Intelligence Agent Nodes
 *
 * This module implements the specialized AI agents that analyze markets
 * from different perspectives using LangChain LLM integration.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import { AgentSignalSchema } from '../models/schemas.js';
import type { EngineConfig } from '../config/index.js';

/**
 * Type for supported LLM instances
 */
type LLMInstance = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

/**
 * Agent node factory function
 *
 * Creates a LangGraph node that uses an LLM to analyze markets from a specific perspective.
 *
 * @param agentName - Unique identifier for the agent
 * @param llm - LLM instance to use for analysis
 * @param systemPrompt - System prompt defining the agent's perspective
 * @returns LangGraph node function
 */
export function createAgentNode(
  agentName: string,
  llm: LLMInstance,
  systemPrompt: string
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName,
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Use structured output with Zod schema
      const structuredLLM = llm.withStructuredOutput(AgentSignalSchema);

      // Prepare the market context for the agent
      const marketContext = JSON.stringify(state.mbd, null, 2);

      // Invoke the LLM with system prompt and market data
      const response = await structuredLLM.invoke([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze the following prediction market and provide your signal:\n\n${marketContext}`,
        },
      ]);

      // Add agent name and timestamp to the signal
      const signal: AgentSignal = {
        ...response,
        agentName,
        timestamp: Date.now(),
        metadata: response.metadata ?? {},
      };

      // Return successful signal
      return {
        agentSignals: [signal],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    } catch (error) {
      // Handle agent execution failure
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName,
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: `agent_${agentName}`,
            timestamp: Date.now(),
            data: {
              agentName,
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
 * LLM configuration factory
 *
 * Creates LLM instances for each agent based on configuration.
 * Supports both single-provider mode (one LLM for all) and multi-provider mode (different LLMs per agent).
 *
 * @param config - Engine configuration
 * @returns Object with LLM instances for each agent
 */
export function createLLMInstances(config: EngineConfig): {
  marketMicrostructure: LLMInstance;
  probabilityBaseline: LLMInstance;
  riskAssessment: LLMInstance;
} {
  // Single-provider mode: use one LLM for all agents
  if (config.llm.singleProvider) {
    const provider = config.llm.singleProvider;
    let llm: LLMInstance;

    if (provider === 'openai' && config.llm.openai) {
      llm = new ChatOpenAI({
        apiKey: config.llm.openai.apiKey,
        model: config.llm.openai.defaultModel,
      });
    } else if (provider === 'anthropic' && config.llm.anthropic) {
      llm = new ChatAnthropic({
        apiKey: config.llm.anthropic.apiKey,
        model: config.llm.anthropic.defaultModel,
      });
    } else if (provider === 'google' && config.llm.google) {
      llm = new ChatGoogleGenerativeAI({
        apiKey: config.llm.google.apiKey,
        model: config.llm.google.defaultModel,
      });
    } else {
      throw new Error(`Invalid single provider configuration: ${provider}`);
    }

    // Return same LLM instance for all agents
    return {
      marketMicrostructure: llm,
      probabilityBaseline: llm,
      riskAssessment: llm,
    };
  }

  // Multi-provider mode: use different LLMs per agent (default for optimal performance)
  if (!config.llm.openai || !config.llm.google || !config.llm.anthropic) {
    throw new Error(
      'Multi-provider mode requires all three LLM providers (OpenAI, Google, Anthropic) to be configured'
    );
  }

  return {
    marketMicrostructure: new ChatOpenAI({
      apiKey: config.llm.openai.apiKey,
      model: config.llm.openai.defaultModel,
    }),
    probabilityBaseline: new ChatGoogleGenerativeAI({
      apiKey: config.llm.google.apiKey,
      model: config.llm.google.defaultModel,
    }),
    riskAssessment: new ChatAnthropic({
      apiKey: config.llm.anthropic.apiKey,
      model: config.llm.anthropic.defaultModel,
    }),
  };
}

/**
 * System prompts for each specialized agent
 */
const AGENT_PROMPTS = {
  marketMicrostructure: `You are a market microstructure analyst specializing in prediction markets.

Your role is to analyze the order book dynamics, liquidity conditions, and trading patterns to assess market quality and identify potential inefficiencies.

Focus on:
- Bid-ask spread and its implications for transaction costs
- Liquidity depth and market impact
- Order book imbalance and momentum signals
- Volume patterns and unusual trading activity
- Market maker behavior and inventory management

Provide your analysis as a structured signal with:
- confidence: Your confidence in this analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your estimate of the true probability (0-1)
- keyDrivers: Top 3-5 microstructure factors influencing your view
- riskFactors: Liquidity risks, execution risks, or market structure concerns
- metadata: Any additional microstructure metrics

Be precise and data-driven. Focus on what the market structure tells you about price discovery and efficiency.`,

  probabilityBaseline: `You are a probability estimation expert specializing in prediction markets.

Your role is to provide a baseline probability estimate using fundamental analysis, historical base rates, and statistical reasoning.

Focus on:
- Historical base rates for similar events
- Fundamental factors driving the outcome
- Time until resolution and uncertainty decay
- Reference class forecasting
- Bayesian updating from available evidence

Provide your analysis as a structured signal with:
- confidence: Your confidence in this probability estimate (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your baseline probability estimate (0-1)
- keyDrivers: Top 3-5 fundamental factors influencing your estimate
- riskFactors: Sources of uncertainty or information gaps
- metadata: Any statistical metrics or base rates used

Be rigorous and well-calibrated. Avoid overconfidence and acknowledge uncertainty.`,

  riskAssessment: `You are a risk assessment specialist focusing on prediction markets.

Your role is to identify tail risks, failure modes, and scenarios that could invalidate the consensus view.

Focus on:
- Low-probability, high-impact scenarios (tail risks)
- Structural risks in the resolution criteria
- Information asymmetries and adverse selection
- Correlation with other events or markets
- Black swan events and unknown unknowns

Provide your analysis as a structured signal with:
- confidence: Your confidence in this risk assessment (0-1)
- direction: Your view considering all risks (YES/NO/NEUTRAL)
- fairProbability: Your risk-adjusted probability (0-1)
- keyDrivers: Top 3-5 risk factors to consider
- riskFactors: Specific tail risks and failure modes
- metadata: Any risk metrics or scenario probabilities

Be paranoid and thorough. Your job is to find what others might miss.`,
};

/**
 * Create all agent nodes with configured LLM instances
 *
 * This factory function creates the three specialized agent nodes
 * with appropriate LLM instances based on configuration.
 *
 * @param config - Engine configuration
 * @returns Object with all agent node functions
 */
export function createAgentNodes(config: EngineConfig): {
  marketMicrostructureAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
  probabilityBaselineAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
  riskAssessmentAgent: (state: GraphStateType) => Promise<Partial<GraphStateType>>;
} {
  const llms = createLLMInstances(config);

  return {
    marketMicrostructureAgent: createAgentNode(
      'market_microstructure',
      llms.marketMicrostructure,
      AGENT_PROMPTS.marketMicrostructure
    ),
    probabilityBaselineAgent: createAgentNode(
      'probability_baseline',
      llms.probabilityBaseline,
      AGENT_PROMPTS.probabilityBaseline
    ),
    riskAssessmentAgent: createAgentNode(
      'risk_assessment',
      llms.riskAssessment,
      AGENT_PROMPTS.riskAssessment
    ),
  };
}
