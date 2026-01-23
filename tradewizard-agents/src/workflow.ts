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
import type { TradeRecommendation, AgentSignal } from './models/types.js';
import { GraphExecutionLogger } from './utils/audit-logger.js';
import { createDataIntegrationLayer } from './utils/data-integration.js';
import { createPostgresCheckpointer } from './database/postgres-checkpointer.js';
import type { SupabaseClientManager } from './database/supabase-client.js';
import {
  createMarketIngestionNode,
  createKeywordExtractionNode,
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
 * edges, and Opik tracing integration. Includes NewsData.io integration
 * when enabled.
 *
 * @param config - Engine configuration
 * @param polymarketClient - Polymarket API client
 * @param supabaseManager - Optional Supabase client manager for PostgreSQL checkpointing
 * @returns Compiled and traced LangGraph application
 */
export async function createWorkflow(
  config: EngineConfig,
  polymarketClient: PolymarketClient,
  supabaseManager?: SupabaseClientManager,
  existingOpikHandler?: any
) {
  // Create data integration layer for external data sources
  // Filter out 'newsdata' provider as it's handled separately by enhanced agents
  const legacyExternalDataConfig = {
    ...config.externalData,
    news: {
      ...config.externalData.news,
      provider: config.externalData.news.provider === 'newsdata' ? 'none' : config.externalData.news.provider,
    },
  };
  const dataLayer = createDataIntegrationLayer(legacyExternalDataConfig);

  // Create enhanced agent factory for NewsData.io integration
  let enhancedAgentFactory;
  let useEnhancedAgents = false;
  
  if (process.env.NEWSDATA_INTEGRATION_ENABLED === 'true') {
    try {
      const { createEnhancedAgentFactory } = await import('./utils/enhanced-agent-factory.js');
      enhancedAgentFactory = createEnhancedAgentFactory(config);
      useEnhancedAgents = true;
      console.log('[Workflow] NewsData.io integration enabled - using enhanced agents');
    } catch (error) {
      console.warn('[Workflow] Enhanced agent factory not available, using standard agents:', error);
    }
  }

  // Create all node functions
  const marketIngestion = createMarketIngestionNode(polymarketClient);
  const keywordExtraction = createKeywordExtractionNode(config, existingOpikHandler);
  
  // Create agents (enhanced or standard based on configuration)
  let agents;
  let breakingNewsAgent;
  let mediaSentimentAgent;
  
  if (useEnhancedAgents && enhancedAgentFactory) {
    // Use enhanced agents with NewsData.io integration
    const { 
      createEnhancedBreakingNewsAgent,
      createEnhancedMediaSentimentAgent,
      createEnhancedMarketMicrostructureAgent
    } = await import('./utils/enhanced-agent-factory.js');
    
    // Create enhanced versions of key agents
    const enhancedMarketAgent = createEnhancedMarketMicrostructureAgent(enhancedAgentFactory);
    breakingNewsAgent = createEnhancedBreakingNewsAgent(enhancedAgentFactory);
    mediaSentimentAgent = createEnhancedMediaSentimentAgent(enhancedAgentFactory);
    
    // Create standard agents for others
    const standardAgents = createAgentNodes(config);
    
    agents = {
      marketMicrostructureAgent: enhancedMarketAgent,
      probabilityBaselineAgent: standardAgents.probabilityBaselineAgent,
      riskAssessmentAgent: standardAgents.riskAssessmentAgent,
    };
  } else {
    // Use standard agents
    agents = createAgentNodes(config);
    breakingNewsAgent = createBreakingNewsAgentNode(config);
    mediaSentimentAgent = createMediaSentimentAgentNode(config);
  }
  
  const thesisConstruction = createThesisConstructionNode(config);
  const crossExamination = createCrossExaminationNode(config);
  const consensusEngine = createConsensusEngineNode(config);
  const recommendationGeneration = createRecommendationGenerationNode(config);

  // Create advanced agent nodes
  const dynamicAgentSelection = createDynamicAgentSelectionNode(config, dataLayer);
  const eventImpactAgent = createEventImpactAgentNode(config);
  const pollingIntelligenceAgent = createPollingIntelligenceAgentNode(config);
  const historicalPatternAgent = createHistoricalPatternAgentNode(config);
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
    .addNode('keyword_extraction', keywordExtraction)
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
        // Otherwise, proceed to keyword extraction
        return 'keyword_extraction';
      },
      {
        keyword_extraction: 'keyword_extraction',
        error: END,
      }
    )

    // Add edge from keyword extraction to dynamic agent selection
    .addEdge('keyword_extraction', 'dynamic_agent_selection')

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

  // Initialize OpikCallbackHandler (use existing or create new)
  const opikHandler = existingOpikHandler || new OpikCallbackHandler({
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
      try {
        return await createPostgresCheckpointer(supabaseManager);
      } catch (error) {
        console.warn('[Workflow] PostgreSQL checkpointer failed, falling back to memory:', error.message);
        return new MemorySaver();
      }
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
 * Analysis result containing recommendation and agent signals
 */
export interface AnalysisResult {
  recommendation: TradeRecommendation | null;
  agentSignals: AgentSignal[];
  cost?: number;
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
 * @returns Analysis result with recommendation and agent signals
 */
export async function analyzeMarket(
  conditionId: string,
  config: EngineConfig,
  polymarketClient: PolymarketClient,
  supabaseManager?: SupabaseClientManager,
  existingOpikHandler?: any
): Promise<AnalysisResult> {
  // Create structured logger for this execution
  const logger = new GraphExecutionLogger();
  logger.info('workflow', 'Starting market analysis', { conditionId });

  // Create the workflow
  const { app, opikHandler } = await createWorkflow(config, polymarketClient, supabaseManager, existingOpikHandler);

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
      agentSignalsCount: result.agentSignals?.length || 0,
    });

    // Return the analysis result with recommendation and agent signals
    return {
      recommendation: result.recommendation,
      agentSignals: result.agentSignals || [],
      cost: 0, // TODO: Extract cost from Opik traces
    };
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
