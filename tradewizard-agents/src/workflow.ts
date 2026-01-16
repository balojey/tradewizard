/**
 * LangGraph Workflow Definition
 *
 * This module defines the Market Intelligence Engine workflow as a LangGraph StateGraph.
 * The workflow orchestrates the multi-agent debate protocol with Opik tracing.
 */

import { StateGraph, END, MemorySaver } from '@langchain/langgraph';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { OpikCallbackHandler } from 'opik-langchain';
import { GraphState, type GraphStateType } from './models/state.js';
import type { EngineConfig } from './config/index.js';
import type { PolymarketClient } from './utils/polymarket-client.js';
import type { TradeRecommendation } from './models/types.js';
import { GraphExecutionLogger } from './utils/audit-logger.js';
import { createDataIntegrationLayer } from './utils/data-integration.js';
import { createPostgresCheckpointer } from './database/postgres-checkpointer.js';
import type { SupabaseClientManager } from './database/supabase-client.js';
import {
  createMarketIngestionNode,
  createAgentNodes,
  createThesisConstructionNode,
  createCrossExaminationNode,
  createConsensusEngineNode,
  createRecommendationGenerationNode,
  createDynamicAgentSelectionNode,
  createBreakingNewsAgentNode,
  createEventImpactAgentNode,
  createPollingIntelligenceAgentNode,
  createHistoricalPatternAgentNode,
  createMediaSentimentAgentNode,
  createSocialSentimentAgentNode,
  createNarrativeVelocityAgentNode,
  createMomentumAgentNode,
  createMeanReversionAgentNode,
  createCatalystAgentNode,
  createTailRiskAgentNode,
  createAgentSignalFusionNode,
  createRiskPhilosophyAgentNodes,
} from './nodes/index.js';

/**
 * Create the Market Intelligence Engine workflow
 *
 * This function builds the complete LangGraph StateGraph with all nodes,
 * edges, and Opik tracing integration.
 *
 * @param config - Engine configuration
 * @param polymarketClient - Polymarket API client
 * @param supabaseManager - Optional Supabase client manager for PostgreSQL checkpointing
 * @returns Compiled and traced LangGraph application
 */
export async function createWorkflow(
  config: EngineConfig,
  polymarketClient: PolymarketClient,
  supabaseManager?: SupabaseClientManager
) {
  // Create data integration layer for external data sources
  const dataLayer = createDataIntegrationLayer(config.externalData);

  // Create all node functions
  const marketIngestion = createMarketIngestionNode(polymarketClient);
  const agents = createAgentNodes(config);
  const thesisConstruction = createThesisConstructionNode(config);
  const crossExamination = createCrossExaminationNode(config);
  const consensusEngine = createConsensusEngineNode(config);
  const recommendationGeneration = createRecommendationGenerationNode(config);

  // Create advanced agent nodes
  const dynamicAgentSelection = createDynamicAgentSelectionNode(config, dataLayer);
  const breakingNewsAgent = createBreakingNewsAgentNode(config);
  const eventImpactAgent = createEventImpactAgentNode(config);
  const pollingIntelligenceAgent = createPollingIntelligenceAgentNode(config);
  const historicalPatternAgent = createHistoricalPatternAgentNode(config);
  const mediaSentimentAgent = createMediaSentimentAgentNode(config);
  const socialSentimentAgent = createSocialSentimentAgentNode(config);
  const narrativeVelocityAgent = createNarrativeVelocityAgentNode(config);
  const momentumAgent = createMomentumAgentNode(config);
  const meanReversionAgent = createMeanReversionAgentNode(config);
  const catalystAgent = createCatalystAgentNode(config);
  const tailRiskAgent = createTailRiskAgentNode(config);
  const agentSignalFusion = createAgentSignalFusionNode(config);
  const riskPhilosophyAgents = createRiskPhilosophyAgentNodes(config);

  // Create the StateGraph
  const workflow = new StateGraph(GraphState)
    // Add all nodes to the graph
    .addNode('market_ingestion', marketIngestion)
    .addNode('dynamic_agent_selection', dynamicAgentSelection)
    
    // MVP agents
    .addNode('market_microstructure_agent', agents.marketMicrostructureAgent)
    .addNode('probability_baseline_agent', agents.probabilityBaselineAgent)
    .addNode('risk_assessment_agent', agents.riskAssessmentAgent)
    
    // Event Intelligence agents
    .addNode('breaking_news_agent', breakingNewsAgent)
    .addNode('event_impact_agent', eventImpactAgent)
    
    // Polling & Statistical agents
    .addNode('polling_intelligence_agent', pollingIntelligenceAgent)
    .addNode('historical_pattern_agent', historicalPatternAgent)
    
    // Sentiment & Narrative agents
    .addNode('media_sentiment_agent', mediaSentimentAgent)
    .addNode('social_sentiment_agent', socialSentimentAgent)
    .addNode('narrative_velocity_agent', narrativeVelocityAgent)
    
    // Price Action agents
    .addNode('momentum_agent', momentumAgent)
    .addNode('mean_reversion_agent', meanReversionAgent)
    
    // Event Scenario agents
    .addNode('catalyst_agent', catalystAgent)
    .addNode('tail_risk_agent', tailRiskAgent)
    
    // Signal fusion
    .addNode('agent_signal_fusion', agentSignalFusion)
    
    // Debate protocol nodes
    .addNode('thesis_construction', thesisConstruction)
    .addNode('cross_examination', crossExamination)
    .addNode('consensus_engine', consensusEngine)
    
    // Risk Philosophy agents
    .addNode('risk_philosophy_aggressive', riskPhilosophyAgents.aggressiveAgent)
    .addNode('risk_philosophy_conservative', riskPhilosophyAgents.conservativeAgent)
    .addNode('risk_philosophy_neutral', riskPhilosophyAgents.neutralAgent)
    
    .addNode('recommendation_generation', recommendationGeneration)

    // Define entry edge from START to market_ingestion
    .addEdge('__start__', 'market_ingestion')

    // Add conditional edge from ingestion (error handling)
    .addConditionalEdges(
      'market_ingestion',
      (state: GraphStateType) => {
        // If ingestion failed, end early
        if (state.ingestionError) {
          return 'error';
        }
        // Otherwise, proceed to dynamic agent selection
        return 'agent_selection';
      },
      {
        agent_selection: 'dynamic_agent_selection',
        error: END,
      }
    )

    // Add edge from ingestion to dynamic agent selection
    .addEdge('market_ingestion', 'dynamic_agent_selection')

    // Add conditional edges from dynamic agent selection to all agent nodes
    // Agents execute in parallel based on activeAgents list
    .addConditionalEdges(
      'dynamic_agent_selection',
      () => {
        // Always proceed to agents (even if only MVP agents are active)
        return 'agents';
      },
      {
        agents: 'market_microstructure_agent',
      }
    )

    // Add parallel edges from dynamic_agent_selection to all agent nodes
    // MVP agents (always active)
    .addEdge('dynamic_agent_selection', 'market_microstructure_agent')
    .addEdge('dynamic_agent_selection', 'probability_baseline_agent')
    .addEdge('dynamic_agent_selection', 'risk_assessment_agent')
    
    // Advanced agents (conditionally active based on dynamic selection)
    .addEdge('dynamic_agent_selection', 'breaking_news_agent')
    .addEdge('dynamic_agent_selection', 'event_impact_agent')
    .addEdge('dynamic_agent_selection', 'polling_intelligence_agent')
    .addEdge('dynamic_agent_selection', 'historical_pattern_agent')
    .addEdge('dynamic_agent_selection', 'media_sentiment_agent')
    .addEdge('dynamic_agent_selection', 'social_sentiment_agent')
    .addEdge('dynamic_agent_selection', 'narrative_velocity_agent')
    .addEdge('dynamic_agent_selection', 'momentum_agent')
    .addEdge('dynamic_agent_selection', 'mean_reversion_agent')
    .addEdge('dynamic_agent_selection', 'catalyst_agent')
    .addEdge('dynamic_agent_selection', 'tail_risk_agent')

    // Add edges from all agents to signal fusion
    // LangGraph waits for all parallel nodes to complete before proceeding
    .addEdge('market_microstructure_agent', 'agent_signal_fusion')
    .addEdge('probability_baseline_agent', 'agent_signal_fusion')
    .addEdge('risk_assessment_agent', 'agent_signal_fusion')
    .addEdge('breaking_news_agent', 'agent_signal_fusion')
    .addEdge('event_impact_agent', 'agent_signal_fusion')
    .addEdge('polling_intelligence_agent', 'agent_signal_fusion')
    .addEdge('historical_pattern_agent', 'agent_signal_fusion')
    .addEdge('media_sentiment_agent', 'agent_signal_fusion')
    .addEdge('social_sentiment_agent', 'agent_signal_fusion')
    .addEdge('narrative_velocity_agent', 'agent_signal_fusion')
    .addEdge('momentum_agent', 'agent_signal_fusion')
    .addEdge('mean_reversion_agent', 'agent_signal_fusion')
    .addEdge('catalyst_agent', 'agent_signal_fusion')
    .addEdge('tail_risk_agent', 'agent_signal_fusion')

    // Add edge from signal fusion to thesis construction
    .addEdge('agent_signal_fusion', 'thesis_construction')

    // Add sequential edges through debate protocol
    .addEdge('thesis_construction', 'cross_examination')
    .addEdge('cross_examination', 'consensus_engine')
    
    // Add parallel edges from consensus to risk philosophy agents
    .addEdge('consensus_engine', 'risk_philosophy_aggressive')
    .addEdge('consensus_engine', 'risk_philosophy_conservative')
    .addEdge('consensus_engine', 'risk_philosophy_neutral')
    
    // Add edges from risk philosophy agents to recommendation generation
    .addEdge('risk_philosophy_aggressive', 'recommendation_generation')
    .addEdge('risk_philosophy_conservative', 'recommendation_generation')
    .addEdge('risk_philosophy_neutral', 'recommendation_generation')

    // Add edge from recommendation to END
    .addEdge('recommendation_generation', END);

  // Create checkpointer based on configuration
  const checkpointer = await createCheckpointer(config, supabaseManager);

  // Compile the graph with checkpointer
  const app = workflow.compile({
    checkpointer,
  });

  // Initialize OpikCallbackHandler
  const opikHandler = new OpikCallbackHandler({
    projectName: config.opik.projectName,
  });

  // Return the compiled app and handler
  // Note: Opik integration happens at invocation time via callbacks
  return {
    app,
    opikHandler,
  };
}

/**
 * Create checkpointer based on configuration
 *
 * @param config - Engine configuration
 * @param supabaseManager - Optional Supabase client manager for PostgreSQL checkpointing
 * @returns Checkpointer instance
 */
async function createCheckpointer(
  config: EngineConfig,
  supabaseManager?: SupabaseClientManager
): Promise<BaseCheckpointSaver> {
  switch (config.langgraph.checkpointer) {
    case 'memory':
      return new MemorySaver();
    case 'sqlite':
      // TODO: Implement SqliteSaver when needed
      throw new Error('SqliteSaver not yet implemented');
    case 'postgres':
      if (!supabaseManager) {
        throw new Error(
          'PostgreSQL checkpointer requires Supabase client manager. Pass supabaseManager to createWorkflow().'
        );
      }
      return await createPostgresCheckpointer(supabaseManager);
    default:
      return new MemorySaver();
  }
}

/**
 * Get checkpointer instance for audit trail retrieval
 *
 * This function creates a checkpointer instance that can be used
 * to retrieve audit trails and inspect graph state.
 *
 * @param config - Engine configuration
 * @param supabaseManager - Optional Supabase client manager for PostgreSQL checkpointing
 * @returns Checkpointer instance
 */
export async function getCheckpointer(
  config: EngineConfig,
  supabaseManager?: SupabaseClientManager
): Promise<BaseCheckpointSaver> {
  return await createCheckpointer(config, supabaseManager);
}

/**
 * Analyze a prediction market
 *
 * This is the main entry point for the Market Intelligence Engine.
 * It executes the complete workflow for a given market condition ID.
 *
 * @param conditionId - Polymarket condition ID to analyze
 * @param config - Engine configuration
 * @param polymarketClient - Polymarket API client
 * @param supabaseManager - Optional Supabase client manager for PostgreSQL checkpointing
 * @returns Trade recommendation
 */
export async function analyzeMarket(
  conditionId: string,
  config: EngineConfig,
  polymarketClient: PolymarketClient,
  supabaseManager?: SupabaseClientManager
): Promise<TradeRecommendation | null> {
  // Create structured logger for this execution
  const logger = new GraphExecutionLogger();
  logger.info('workflow', 'Starting market analysis', { conditionId });

  // Create the workflow
  const { app, opikHandler } = await createWorkflow(config, polymarketClient, supabaseManager);

  try {
    // Execute the workflow with thread_id for checkpointing and tracing
    logger.info('workflow', 'Invoking LangGraph workflow');
    const result = await app.invoke(
      { conditionId },
      {
        configurable: {
          thread_id: conditionId, // Used for both LangGraph checkpointing and Opik thread tracking
        },
        callbacks: [opikHandler], // Add Opik handler as callback for automatic tracing
      }
    );

    // Flush Opik traces before returning
    logger.info('workflow', 'Flushing Opik traces');
    await opikHandler.flushAsync();

    logger.info('workflow', 'Market analysis completed successfully', {
      action: result.recommendation?.action,
      expectedValue: result.recommendation?.expectedValue,
    });

    // Return the final recommendation
    return result.recommendation;
  } catch (error) {
    logger.error('workflow', 'Market analysis failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Attempt to flush Opik traces even on error
    try {
      await opikHandler.flushAsync();
    } catch (flushError) {
      logger.error('workflow', 'Failed to flush Opik traces', {
        error: flushError instanceof Error ? flushError.message : String(flushError),
      });
    }

    throw error;
  }
}
