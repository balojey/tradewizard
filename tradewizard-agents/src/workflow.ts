/**
 * LangGraph Workflow Definition
 *
 * This module defines the Market Intelligence Engine workflow as a LangGraph StateGraph.
 * The workflow orchestrates the multi-agent debate protocol with Opik tracing.
 */

import { StateGraph, END, MemorySaver } from '@langchain/langgraph';
import { OpikCallbackHandler } from 'opik-langchain';
import { GraphState, type GraphStateType } from './models/state.js';
import type { EngineConfig } from './config/index.js';
import type { PolymarketClient } from './utils/polymarket-client.js';
import type { TradeRecommendation } from './models/types.js';
import { GraphExecutionLogger } from './utils/audit-logger.js';
import {
  createMarketIngestionNode,
  createAgentNodes,
  createThesisConstructionNode,
  createCrossExaminationNode,
  createConsensusEngineNode,
  createRecommendationGenerationNode,
} from './nodes/index.js';

/**
 * Create the Market Intelligence Engine workflow
 *
 * This function builds the complete LangGraph StateGraph with all nodes,
 * edges, and Opik tracing integration.
 *
 * @param config - Engine configuration
 * @param polymarketClient - Polymarket API client
 * @returns Compiled and traced LangGraph application
 */
export function createWorkflow(config: EngineConfig, polymarketClient: PolymarketClient) {
  // Create all node functions
  const marketIngestion = createMarketIngestionNode(polymarketClient);
  const agents = createAgentNodes(config);
  const thesisConstruction = createThesisConstructionNode(config);
  const crossExamination = createCrossExaminationNode(config);
  const consensusEngine = createConsensusEngineNode(config);
  const recommendationGeneration = createRecommendationGenerationNode(config);

  // Create the StateGraph
  const workflow = new StateGraph(GraphState)
    // Add all nodes to the graph
    .addNode('market_ingestion', marketIngestion)
    .addNode('market_microstructure_agent', agents.marketMicrostructureAgent)
    .addNode('probability_baseline_agent', agents.probabilityBaselineAgent)
    .addNode('risk_assessment_agent', agents.riskAssessmentAgent)
    .addNode('thesis_construction', thesisConstruction)
    .addNode('cross_examination', crossExamination)
    .addNode('consensus_engine', consensusEngine)
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
        // Otherwise, proceed to agents
        return 'agents';
      },
      {
        agents: 'market_microstructure_agent',
        error: END,
      }
    )

    // Add parallel edges from ingestion to all 3 agent nodes
    // Note: LangGraph executes nodes in parallel when they have no dependencies
    .addEdge('market_ingestion', 'market_microstructure_agent')
    .addEdge('market_ingestion', 'probability_baseline_agent')
    .addEdge('market_ingestion', 'risk_assessment_agent')

    // Add edges from all agents to thesis_construction
    // LangGraph waits for all parallel nodes to complete before proceeding
    .addEdge('market_microstructure_agent', 'thesis_construction')
    .addEdge('probability_baseline_agent', 'thesis_construction')
    .addEdge('risk_assessment_agent', 'thesis_construction')

    // Add sequential edges through debate protocol
    .addEdge('thesis_construction', 'cross_examination')
    .addEdge('cross_examination', 'consensus_engine')
    .addEdge('consensus_engine', 'recommendation_generation')

    // Add edge from recommendation to END
    .addEdge('recommendation_generation', END);

  // Create checkpointer based on configuration
  const checkpointer = createCheckpointer(config);

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
 * @returns Checkpointer instance
 */
function createCheckpointer(config: EngineConfig) {
  switch (config.langgraph.checkpointer) {
    case 'memory':
      return new MemorySaver();
    case 'sqlite':
      // TODO: Implement SqliteSaver when needed
      throw new Error('SqliteSaver not yet implemented');
    case 'postgres':
      // TODO: Implement PostgresSaver when needed
      throw new Error('PostgresSaver not yet implemented');
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
 * @returns Checkpointer instance
 */
export function getCheckpointer(config: EngineConfig) {
  return createCheckpointer(config);
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
 * @returns Trade recommendation
 */
export async function analyzeMarket(
  conditionId: string,
  config: EngineConfig,
  polymarketClient: PolymarketClient
): Promise<TradeRecommendation | null> {
  // Create structured logger for this execution
  const logger = new GraphExecutionLogger();
  logger.info('workflow', 'Starting market analysis', { conditionId });

  // Create the workflow
  const { app, opikHandler } = createWorkflow(config, polymarketClient);

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
