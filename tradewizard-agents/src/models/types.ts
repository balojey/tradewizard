/**
 * Core data models for the Market Intelligence Engine
 *
 * This module defines all TypeScript interfaces and types used throughout
 * the multi-agent debate protocol.
 */

// ============================================================================
// Result Type for Error Handling
// ============================================================================

/**
 * Result type for functional error handling
 * Represents either a success (Ok) or failure (Err)
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// ============================================================================
// Error Types
// ============================================================================

/**
 * Errors that can occur during market data ingestion
 */
export type IngestionError =
  | { type: 'API_UNAVAILABLE'; message: string }
  | { type: 'RATE_LIMIT_EXCEEDED'; retryAfter: number }
  | { type: 'INVALID_MARKET_ID'; marketId: string }
  | { type: 'VALIDATION_FAILED'; field: string; reason: string };

/**
 * Errors that can occur during agent execution
 */
export type AgentError =
  | { type: 'TIMEOUT'; agentName: string; timeoutMs: number }
  | { type: 'EXECUTION_FAILED'; agentName: string; error: Error };

/**
 * Errors that can occur during recommendation generation
 */
export type RecommendationError =
  | { type: 'INSUFFICIENT_DATA'; reason: string }
  | { type: 'CONSENSUS_FAILED'; reason: string }
  | { type: 'NO_EDGE'; edge: number };

// ============================================================================
// Market Briefing Document (MBD)
// ============================================================================

/**
 * Event type classification for prediction markets
 */
export type EventType =
  | 'election'
  | 'policy'
  | 'court'
  | 'geopolitical'
  | 'economic'
  | 'other';

/**
 * Volatility regime classification
 */
export type VolatilityRegime = 'low' | 'medium' | 'high';

/**
 * Catalyst event with timing
 */
export interface Catalyst {
  event: string;
  timestamp: number;
}

/**
 * Market Briefing Document - standardized market data structure
 * This is the primary input to all intelligence agents
 */
export interface MarketBriefingDocument {
  marketId: string;
  conditionId: string;
  eventType: EventType;
  question: string;
  resolutionCriteria: string;
  expiryTimestamp: number;
  currentProbability: number; // Market-implied probability (0-1)
  liquidityScore: number; // 0-10 scale
  bidAskSpread: number; // In cents
  volatilityRegime: VolatilityRegime;
  volume24h: number;
  metadata: {
    ambiguityFlags: string[];
    keyCatalysts: Catalyst[];
  };
}

// ============================================================================
// Agent Signal
// ============================================================================

/**
 * Agent signal direction
 */
export type SignalDirection = 'YES' | 'NO' | 'NEUTRAL';

/**
 * Agent Signal - output from individual intelligence agents
 */
export interface AgentSignal {
  agentName: string;
  timestamp: number;
  confidence: number; // 0-1, agent's confidence in its analysis
  direction: SignalDirection;
  fairProbability: number; // Agent's estimate of true probability (0-1)
  keyDrivers: string[]; // Top 3-5 factors influencing the signal
  riskFactors: string[]; // Identified risks or uncertainties
  metadata: Record<string, unknown>; // Agent-specific data
}

// ============================================================================
// Thesis
// ============================================================================

/**
 * Thesis - structured argument for or against a market outcome
 */
export interface Thesis {
  direction: 'YES' | 'NO';
  fairProbability: number;
  marketProbability: number;
  edge: number; // |fairProbability - marketProbability|
  coreArgument: string;
  catalysts: string[];
  failureConditions: string[];
  supportingSignals: string[]; // Agent names that support this thesis
}

// ============================================================================
// Debate Record
// ============================================================================

/**
 * Test type for cross-examination
 */
export type DebateTestType =
  | 'evidence'
  | 'causality'
  | 'timing'
  | 'liquidity'
  | 'tail-risk';

/**
 * Outcome of a debate test
 */
export type DebateTestOutcome = 'survived' | 'weakened' | 'refuted';

/**
 * Individual debate test result
 */
export interface DebateTest {
  testType: DebateTestType;
  claim: string;
  challenge: string;
  outcome: DebateTestOutcome;
  score: number; // -1 to 1
}

/**
 * Debate Record - result of cross-examination between theses
 */
export interface DebateRecord {
  tests: DebateTest[];
  bullScore: number; // Aggregate score for bull thesis
  bearScore: number; // Aggregate score for bear thesis
  keyDisagreements: string[];
}

// ============================================================================
// Consensus Probability
// ============================================================================

/**
 * Probability regime classification
 */
export type ProbabilityRegime =
  | 'high-confidence'
  | 'moderate-confidence'
  | 'high-uncertainty';

/**
 * Consensus Probability - final probability estimate with uncertainty
 */
export interface ConsensusProbability {
  consensusProbability: number; // 0-1
  confidenceBand: [number, number]; // [lower, upper]
  disagreementIndex: number; // 0-1, higher = more agent disagreement
  regime: ProbabilityRegime;
  contributingSignals: string[]; // Agent names
}

// ============================================================================
// Trade Recommendation
// ============================================================================

/**
 * Trade action
 */
export type TradeAction = 'LONG_YES' | 'LONG_NO' | 'NO_TRADE';

/**
 * Liquidity risk level
 */
export type LiquidityRisk = 'low' | 'medium' | 'high';

/**
 * Trade recommendation explanation
 */
export interface TradeExplanation {
  summary: string; // 2-3 sentence plain language explanation
  coreThesis: string;
  keyCatalysts: string[];
  failureScenarios: string[];
  uncertaintyNote?: string; // Present if disagreementIndex > 0.15
}

/**
 * Trade recommendation metadata
 */
export interface TradeMetadata {
  consensusProbability: number;
  marketProbability: number;
  edge: number;
  confidenceBand: [number, number];
}

/**
 * Trade Recommendation - final actionable output
 */
export interface TradeRecommendation {
  marketId: string;
  action: TradeAction;
  entryZone: [number, number]; // [min, max] price
  targetZone: [number, number];
  expectedValue: number; // In dollars per $100 invested
  winProbability: number;
  liquidityRisk: LiquidityRisk;
  explanation: TradeExplanation;
  metadata: TradeMetadata;
}

// ============================================================================
// Audit Trail
// ============================================================================

/**
 * Audit log entry for pipeline stage
 */
export interface AuditEntry {
  stage: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Complete audit trail for a market analysis
 */
export interface AuditTrail {
  marketId: string;
  timestamp: number;
  stages: Array<{
    name: string;
    timestamp: number;
    duration: number;
    data: unknown;
    errors?: unknown[];
  }>;
}
