/**
 * Event Intelligence Agent Nodes
 *
 * This module implements specialized agents that monitor and interpret
 * real-world events (news, policy, court rulings) that impact market outcomes.
 */

import { z } from 'zod';
import type { GraphStateType } from '../models/state.js';
import type { AgentSignal } from '../models/types.js';
import type { EngineConfig } from '../config/index.js';
import { createLLMInstance } from '../utils/llm-factory.js';

// ============================================================================
// Breaking News Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Breaking News Agent signal metadata
 */
export const BreakingNewsSignalMetadataSchema = z.object({
  relevantArticles: z.array(
    z.object({
      title: z.string(),
      source: z.string(),
      relevanceScore: z.number().min(0).max(1),
      probabilityImpact: z.enum(['positive', 'negative', 'neutral']),
    })
  ),
  regimeChange: z.boolean(),
  newsVelocity: z.number().min(0),
});

/**
 * Extended Agent Signal schema for Breaking News Agent
 */
export const BreakingNewsSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: BreakingNewsSignalMetadataSchema,
});

// ============================================================================
// Event Impact Agent Signal Schema
// ============================================================================

/**
 * Zod schema for Event Impact Agent signal metadata
 */
export const EventImpactSignalMetadataSchema = z.object({
  historicalAnalogs: z.array(
    z.object({
      event: z.string(),
      date: z.number(),
      marketReaction: z.number(),
      similarity: z.number().min(0).max(1),
    })
  ),
  scenarioTree: z.array(
    z.object({
      scenario: z.string(),
      probability: z.number().min(0).max(1),
      marketImpact: z.number(),
    })
  ),
  upcomingCatalysts: z.array(
    z.object({
      event: z.string(),
      date: z.number(),
      expectedImpact: z.enum(['high', 'medium', 'low']),
    })
  ),
});

/**
 * Extended Agent Signal schema for Event Impact Agent
 */
export const EventImpactSignalSchema = z.object({
  agentName: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(1),
  direction: z.enum(['YES', 'NO', 'NEUTRAL']),
  fairProbability: z.number().min(0).max(1),
  keyDrivers: z.array(z.string()).min(1).max(5),
  riskFactors: z.array(z.string()),
  metadata: EventImpactSignalMetadataSchema,
});

// ============================================================================
// System Prompts
// ============================================================================

const BREAKING_NEWS_PROMPT = `You are a breaking news analyst specializing in political, legal, and policy developments.

Your role is to identify market-moving news and assess its probability impact.

Given a market and recent news articles, analyze:
1. Which news articles are most relevant to the market outcome
2. Whether the news increases or decreases the probability of YES
3. The magnitude of the probability shift (small, medium, large)
4. The confidence in your assessment

Focus on factual developments, not speculation. Flag regime-changing events.

ENHANCED EVENT-BASED ANALYSIS:
When event-based keywords are provided, use them to improve news correlation:
- Prioritize news articles that match event-level keywords (highest relevance)
- Consider cross-market themes when assessing news impact across multiple markets
- Use political keywords to identify politically relevant news with higher precision
- Leverage market-level keywords to understand specific market contexts within the event

CRITICAL: Only include articles with relevance scores >= 0.5 in your relevantArticles array. Filter out low-relevance articles.

Provide your analysis as a structured signal with:
- confidence: Your confidence in this analysis (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your estimate of the true probability (0-1)
- keyDrivers: Top 3-5 news factors influencing your view (prioritize event-keyword matches)
- riskFactors: Uncertainty about news interpretation or missing information
- metadata: 
  - relevantArticles: Array of relevant articles with relevance scores >= 0.5 and impact direction
  - regimeChange: Boolean indicating if news fundamentally changes market dynamics (only true if high-relevance articles exist)
  - newsVelocity: Rate of new articles (articles per hour)

Be precise and data-driven. Focus on what the news tells you about outcome probability.`;

const EVENT_IMPACT_PROMPT = `You are an event impact modeler specializing in prediction market reactions.

Your role is to predict how upcoming or recent events will reprice the market.

Given a market and event context, analyze:
1. Historical analogs (similar events in the past)
2. How those events repriced similar markets
3. Expected market reaction to upcoming catalysts
4. Scenario trees for different event outcomes

Provide probability estimates for each scenario branch.

ENHANCED EVENT-BASED ANALYSIS:
When event-based keywords are provided, use them to improve impact modeling:
- Use event-level keywords to identify relevant historical analogs with similar themes
- Consider cross-market keywords when modeling impact across multiple related markets
- Leverage political keywords to focus on politically relevant historical events
- Use event themes and concepts to build more accurate scenario trees

Provide your analysis as a structured signal with:
- confidence: Your confidence in this impact assessment (0-1)
- direction: Your view on the outcome (YES/NO/NEUTRAL)
- fairProbability: Your event-adjusted probability (0-1)
- keyDrivers: Top 3-5 event factors influencing your view (prioritize event-keyword matches)
- riskFactors: Uncertainty about event outcomes or historical applicability
- metadata:
  - historicalAnalogs: Array of similar past events with market reactions and similarity scores
  - scenarioTree: Array of possible scenarios with probabilities and market impacts
  - upcomingCatalysts: Array of upcoming events with expected impact levels

Be rigorous with historical comparisons. Focus on structural similarities, not superficial ones.`;

// ============================================================================
// Agent Node Factory Functions
// ============================================================================

/**
 * Create Breaking News Agent node
 *
 * This agent monitors breaking news and assesses its impact on market probabilities.
 */
export function createBreakingNewsAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use configured LLM respecting single/multi provider mode
  // In multi-provider mode, prefer OpenAI for breaking news analysis (fast and good at factual analysis)
  const llm = createLLMInstance(config, 'openai', ['anthropic', 'google']);

  // Return the agent node function
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'breaking_news',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_breaking_news',
            timestamp: Date.now(),
            data: {
              agentName: 'breaking_news',
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Fetch news data from external data layer
      const newsArticles = state.externalData?.news || [];

      // If no news data available, skip this agent
      if (newsArticles.length === 0) {
        console.warn('[BreakingNewsAgent] No news data available, skipping agent');
        return {
          auditLog: [
            {
              stage: 'agent_breaking_news',
              timestamp: Date.now(),
              data: {
                agentName: 'breaking_news',
                success: false,
                skipped: true,
                reason: 'No news data available',
                duration: Date.now() - startTime,
              },
            },
          ],
        };
      }

      // Extract event-based keywords for enhanced news correlation
      const eventKeywords = state.mbd.keywords;
      const keywordContext = eventKeywords && eventKeywords.length > 0 ? {
        keywords: eventKeywords,
        keywordCount: eventKeywords.length
      } : null;

      // Use structured output with custom schema
      const structuredLLM = llm.withStructuredOutput(BreakingNewsSignalSchema);

      // Prepare enhanced market context with news data and event-based keywords
      const marketContext = JSON.stringify(state.mbd, null, 2);
      const newsContext = JSON.stringify(newsArticles, null, 2);
      const keywordContextStr = keywordContext ? 
        `\n\nEvent-Based Keywords for News Correlation:\n${JSON.stringify(keywordContext, null, 2)}` : 
        '';

      // Invoke the LLM with enhanced context
      const response = await structuredLLM.invoke([
        { role: 'system', content: BREAKING_NEWS_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market with recent news:\n\nMarket:\n${marketContext}\n\nRecent News:\n${newsContext}${keywordContextStr}`,
        },
      ]);

      // CRITICAL: Filter relevantArticles to only include articles with relevanceScore >= 0.5
      // This ensures Property 12 (event intelligence relevance filtering) is satisfied
      const MIN_RELEVANCE_THRESHOLD = 0.5;
      const filteredRelevantArticles = response.metadata.relevantArticles.filter(
        (article) => article.relevanceScore >= MIN_RELEVANCE_THRESHOLD
      );

      // If regime change is flagged but no high-relevance articles exist, set it to false
      const regimeChange = response.metadata.regimeChange && filteredRelevantArticles.length > 0;

      // Create the agent signal with filtered articles
      const signal: AgentSignal = {
        agentName: 'breaking_news',
        timestamp: Date.now(),
        confidence: response.confidence,
        direction: response.direction,
        fairProbability: response.fairProbability,
        keyDrivers: response.keyDrivers,
        riskFactors: response.riskFactors,
        metadata: {
          relevantArticles: filteredRelevantArticles,
          regimeChange: regimeChange,
          newsVelocity: response.metadata.newsVelocity,
        },
      };

      return {
        agentSignals: [signal],
        auditLog: [
          {
            stage: 'agent_breaking_news',
            timestamp: Date.now(),
            data: {
              agentName: 'breaking_news',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              newsArticleCount: newsArticles.length,
              regimeChange: response.metadata.regimeChange,
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
            agentName: 'breaking_news',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_breaking_news',
            timestamp: Date.now(),
            data: {
              agentName: 'breaking_news',
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
 * Create Event Impact Agent node
 *
 * This agent models how events reprice markets based on historical patterns.
 */
export function createEventImpactAgentNode(
  config: EngineConfig
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  // Use configured LLM respecting single/multi provider mode
  // In multi-provider mode, prefer Anthropic for event impact modeling (good at reasoning and historical analysis)
  const llm = createLLMInstance(config, 'anthropic', ['openai', 'google']);

  // Return the agent node function
  return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
    const startTime = Date.now();

    // Check if MBD is available
    if (!state.mbd) {
      return {
        agentErrors: [
          {
            type: 'EXECUTION_FAILED',
            agentName: 'event_impact',
            error: new Error('No Market Briefing Document available'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_event_impact',
            timestamp: Date.now(),
            data: {
              agentName: 'event_impact',
              success: false,
              error: 'No MBD available',
              duration: Date.now() - startTime,
            },
          },
        ],
      };
    }

    try {
      // Extract event-based keywords for enhanced event impact analysis
      const eventKeywords = state.mbd.keywords;
      const keywordContext = eventKeywords && eventKeywords.length > 0 ? {
        keywords: eventKeywords,
        keywordCount: eventKeywords.length
      } : null;

      // Use structured output with custom schema
      const structuredLLM = llm.withStructuredOutput(EventImpactSignalSchema);

      // Prepare market context with catalysts and event-based keywords
      const marketContext = JSON.stringify(state.mbd, null, 2);
      const catalystsContext = state.mbd.metadata.keyCatalysts.length > 0
        ? `\n\nUpcoming Catalysts:\n${JSON.stringify(state.mbd.metadata.keyCatalysts, null, 2)}`
        : '';
      const keywordContextStr = keywordContext ? 
        `\n\nEvent-Based Keywords for Impact Analysis:\n${JSON.stringify(keywordContext, null, 2)}` : 
        '';

      // Invoke the LLM with enhanced context
      const response = await structuredLLM.invoke([
        { role: 'system', content: EVENT_IMPACT_PROMPT },
        {
          role: 'user',
          content: `Analyze the following prediction market and model event impacts:\n\nMarket:\n${marketContext}${catalystsContext}${keywordContextStr}`,
        },
      ]);

      // Create the agent signal
      const signal: AgentSignal = {
        agentName: 'event_impact',
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
            stage: 'agent_event_impact',
            timestamp: Date.now(),
            data: {
              agentName: 'event_impact',
              success: true,
              direction: signal.direction,
              confidence: signal.confidence,
              fairProbability: signal.fairProbability,
              historicalAnalogsCount: response.metadata.historicalAnalogs.length,
              scenarioCount: response.metadata.scenarioTree.length,
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
            agentName: 'event_impact',
            error: error instanceof Error ? error : new Error('Unknown error'),
          },
        ],
        auditLog: [
          {
            stage: 'agent_event_impact',
            timestamp: Date.now(),
            data: {
              agentName: 'event_impact',
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
