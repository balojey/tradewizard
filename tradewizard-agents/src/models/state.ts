/**
 * LangGraph State Definition
 *
 * This module defines the shared state that flows through the entire
 * Market Intelligence Engine workflow using LangGraph's Annotation API.
 */

import { Annotation } from '@langchain/langgraph';
import type {
  MarketBriefingDocument,
  AgentSignal,
  Thesis,
  DebateRecord,
  ConsensusProbability,
  TradeRecommendation,
  IngestionError,
  AgentError,
  RecommendationError,
  AuditEntry,
} from './types.js';

/**
 * LangGraph State Definition using Annotation API
 *
 * This state object flows through all nodes in the workflow.
 * Each node reads from and writes to this shared state.
 */
export const GraphState = Annotation.Root({
  // ============================================================================
  // Input
  // ============================================================================

  /**
   * Polymarket condition ID to analyze
   */
  conditionId: Annotation<string>,

  // ============================================================================
  // Market Ingestion Output
  // ============================================================================

  /**
   * Market Briefing Document created from Polymarket data
   */
  mbd: Annotation<MarketBriefingDocument | null>,

  /**
   * Error that occurred during market ingestion (if any)
   */
  ingestionError: Annotation<IngestionError | null>,

  // ============================================================================
  // Agent Signals Output
  // ============================================================================

  /**
   * Signals from intelligence agents (accumulated via reducer)
   */
  agentSignals: Annotation<AgentSignal[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  /**
   * Errors from agent execution (accumulated via reducer)
   */
  agentErrors: Annotation<AgentError[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // ============================================================================
  // Thesis Construction Output
  // ============================================================================

  /**
   * Bull thesis (arguing for YES outcome)
   */
  bullThesis: Annotation<Thesis | null>,

  /**
   * Bear thesis (arguing for NO outcome)
   */
  bearThesis: Annotation<Thesis | null>,

  // ============================================================================
  // Cross-Examination Output
  // ============================================================================

  /**
   * Debate record from cross-examination
   */
  debateRecord: Annotation<DebateRecord | null>,

  // ============================================================================
  // Consensus Output
  // ============================================================================

  /**
   * Consensus probability estimate
   */
  consensus: Annotation<ConsensusProbability | null>,

  /**
   * Error that occurred during consensus calculation (if any)
   */
  consensusError: Annotation<RecommendationError | null>,

  // ============================================================================
  // Final Recommendation
  // ============================================================================

  /**
   * Final trade recommendation
   */
  recommendation: Annotation<TradeRecommendation | null>,

  // ============================================================================
  // Audit Trail
  // ============================================================================

  /**
   * Audit log entries (accumulated via reducer)
   */
  auditLog: Annotation<AuditEntry[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

/**
 * TypeScript type for the graph state
 * Use this type for node function signatures
 */
export type GraphStateType = typeof GraphState.State;
