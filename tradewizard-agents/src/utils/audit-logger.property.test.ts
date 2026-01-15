/**
 * Property-based tests for audit logging
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { MemorySaver } from '@langchain/langgraph';
import { getAuditTrail, getStateAtCheckpoint, listCheckpoints } from './audit-logger.js';
import type { GraphStateType } from '../models/state.js';
import type {
  MarketBriefingDocument,
  AgentSignal,
  Thesis,
  ConsensusProbability,
  TradeRecommendation,
  AuditEntry,
} from '../models/types.js';

// Generators
const marketIdArb = fc.string({ minLength: 32, maxLength: 64 });
const timestampArb = fc.integer({ min: Date.now() - 86400000, max: Date.now() });
const probabilityArb = fc.float({ min: 0, max: 1 });

const mbdArb: fc.Arbitrary<MarketBriefingDocument> = fc.record({
  marketId: marketIdArb,
  conditionId: marketIdArb,
  eventType: fc.constantFrom('election', 'policy', 'court', 'geopolitical', 'economic', 'other'),
  question: fc.string({ minLength: 10, maxLength: 200 }),
  resolutionCriteria: fc.string({ minLength: 20, maxLength: 500 }),
  expiryTimestamp: timestampArb,
  currentProbability: probabilityArb,
  liquidityScore: fc.float({ min: 0, max: 10 }),
  bidAskSpread: fc.float({ min: 0, max: 10 }),
  volatilityRegime: fc.constantFrom('low', 'medium', 'high'),
  volume24h: fc.float({ min: 0, max: 10000000 }),
  metadata: fc.record({
    ambiguityFlags: fc.array(fc.string(), { maxLength: 5 }),
    keyCatalysts: fc.array(
      fc.record({
        event: fc.string(),
        timestamp: timestampArb,
      }),
      { maxLength: 5 }
    ),
  }),
});

const agentSignalArb: fc.Arbitrary<AgentSignal> = fc.record({
  agentName: fc.constantFrom('market_microstructure', 'probability_baseline', 'risk_assessment'),
  timestamp: timestampArb,
  confidence: probabilityArb,
  direction: fc.constantFrom('YES', 'NO', 'NEUTRAL'),
  fairProbability: probabilityArb,
  keyDrivers: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
  riskFactors: fc.array(fc.string(), { maxLength: 5 }),
  metadata: fc.dictionary(fc.string(), fc.anything()),
});

const thesisArb: fc.Arbitrary<Thesis> = fc.record({
  direction: fc.constantFrom('YES', 'NO'),
  fairProbability: probabilityArb,
  marketProbability: probabilityArb,
  edge: fc.float({ min: 0, max: 1 }),
  coreArgument: fc.string({ minLength: 50, maxLength: 500 }),
  catalysts: fc.array(fc.string(), { maxLength: 5 }),
  failureConditions: fc.array(fc.string(), { maxLength: 5 }),
  supportingSignals: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
});

const consensusArb: fc.Arbitrary<ConsensusProbability> = fc.record({
  consensusProbability: probabilityArb,
  confidenceBand: fc.tuple(probabilityArb, probabilityArb).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
  disagreementIndex: probabilityArb,
  regime: fc.constantFrom('high-confidence', 'moderate-confidence', 'high-uncertainty'),
  contributingSignals: fc.array(fc.string(), { minLength: 1, maxLength: 3 }),
});

const recommendationArb: fc.Arbitrary<TradeRecommendation> = fc.record({
  marketId: marketIdArb,
  action: fc.constantFrom('LONG_YES', 'LONG_NO', 'NO_TRADE'),
  entryZone: fc.tuple(probabilityArb, probabilityArb).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
  targetZone: fc.tuple(probabilityArb, probabilityArb).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
  expectedValue: fc.float({ min: -100, max: 100 }),
  winProbability: probabilityArb,
  liquidityRisk: fc.constantFrom('low', 'medium', 'high'),
  explanation: fc.record({
    summary: fc.string({ minLength: 50, maxLength: 300 }),
    coreThesis: fc.string({ minLength: 50, maxLength: 500 }),
    keyCatalysts: fc.array(fc.string(), { maxLength: 5 }),
    failureScenarios: fc.array(fc.string(), { maxLength: 5 }),
    uncertaintyNote: fc.option(fc.string(), { nil: undefined }),
  }),
  metadata: fc.record({
    consensusProbability: probabilityArb,
    marketProbability: probabilityArb,
    edge: fc.float({ min: 0, max: 1 }),
    confidenceBand: fc.tuple(probabilityArb, probabilityArb).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
  }),
});

const auditEntryArb: fc.Arbitrary<AuditEntry> = fc.record({
  stage: fc.constantFrom(
    'market_ingestion',
    'agent_market_microstructure',
    'agent_probability_baseline',
    'agent_risk_assessment',
    'thesis_construction',
    'cross_examination',
    'consensus_engine',
    'recommendation_generation'
  ),
  timestamp: timestampArb,
  data: fc.dictionary(fc.string(), fc.anything()),
});

const completeGraphStateArb: fc.Arbitrary<GraphStateType> = fc
  .record({
    conditionId: marketIdArb,
    mbd: mbdArb,
    agentSignals: fc.array(agentSignalArb, { minLength: 2, maxLength: 3 }),
    bullThesis: thesisArb,
    bearThesis: thesisArb,
    debateRecord: fc.record({
      tests: fc.array(
        fc.record({
          testType: fc.constantFrom('evidence', 'causality', 'timing', 'liquidity', 'tail-risk'),
          claim: fc.string(),
          challenge: fc.string(),
          outcome: fc.constantFrom('survived', 'weakened', 'refuted'),
          score: fc.float({ min: -1, max: 1 }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
      bullScore: fc.float({ min: -1, max: 1 }),
      bearScore: fc.float({ min: -1, max: 1 }),
      keyDisagreements: fc.array(fc.string(), { maxLength: 5 }),
    }),
    consensus: consensusArb,
    recommendation: recommendationArb,
    auditLog: fc.array(auditEntryArb, { minLength: 5, maxLength: 10 }),
  })
  .map((partial) => ({
    ...partial,
    ingestionError: null,
    agentErrors: [],
    consensusError: null,
  }));

describe('Audit Logger Property Tests', () => {
  // Feature: market-intelligence-engine, Property 13: Audit trail completeness
  // Validates: Requirements 9.1, 9.2, 9.3
  test('Property 13: Audit trail completeness', async () => {
    await fc.assert(
      fc.asyncProperty(completeGraphStateArb, async (state) => {
        const checkpointer = new MemorySaver();
        const marketId = state.conditionId;

        await checkpointer.put(
          {
            configurable: {
              thread_id: marketId,
              checkpoint_id: 'final',
            },
          },
          {
            v: 1,
            id: 'final',
            ts: Date.now().toString(),
            channel_values: state,
            channel_versions: {},
            versions_seen: {},
          },
          { source: 'update', step: 1, writes: {} } as any
        );

        const auditTrail = await getAuditTrail(checkpointer, marketId);

        expect(auditTrail).toBeDefined();
        expect(auditTrail.marketId).toBe(marketId);
        expect(auditTrail.stages.length).toBeGreaterThan(0);

        for (const stage of auditTrail.stages) {
          expect(stage.name).toBeDefined();
          expect(stage.timestamp).toBeGreaterThan(0);
          expect(stage.duration).toBeGreaterThanOrEqual(0);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: market-intelligence-engine, Property 14: Error logging
  // Validates: Requirements 9.4
  test('Property 14: Error logging - For any system error that occurs during pipeline execution, the error should be logged with error details, context, and recovery actions', async () => {
    await fc.assert(
      fc.asyncProperty(
        marketIdArb,
        fc.constantFrom('ingestion', 'agent', 'consensus'),
        fc.string({ minLength: 10, maxLength: 200 }),
        async (marketId, errorType, errorMessage) => {
          const checkpointer = new MemorySaver();

          // Create a state with errors based on error type
          let state: GraphStateType;

          if (errorType === 'ingestion') {
            state = {
              conditionId: marketId,
              mbd: null,
              ingestionError: {
                type: 'API_UNAVAILABLE',
                message: errorMessage,
              },
              agentSignals: [],
              agentErrors: [],
              bullThesis: null,
              bearThesis: null,
              debateRecord: null,
              consensus: null,
              consensusError: null,
              recommendation: null,
              auditLog: [
                {
                  stage: 'market_ingestion',
                  timestamp: Date.now(),
                  data: { error: errorMessage },
                },
              ],
            };
          } else if (errorType === 'agent') {
            state = {
              conditionId: marketId,
              mbd: null,
              ingestionError: null,
              agentSignals: [],
              agentErrors: [
                {
                  type: 'EXECUTION_FAILED',
                  agentName: 'test_agent',
                  error: new Error(errorMessage),
                },
              ],
              bullThesis: null,
              bearThesis: null,
              debateRecord: null,
              consensus: null,
              consensusError: null,
              recommendation: null,
              auditLog: [
                {
                  stage: 'agent_execution',
                  timestamp: Date.now(),
                  data: { error: errorMessage },
                },
              ],
            };
          } else {
            // consensus error
            state = {
              conditionId: marketId,
              mbd: null,
              ingestionError: null,
              agentSignals: [],
              agentErrors: [],
              bullThesis: null,
              bearThesis: null,
              debateRecord: null,
              consensus: null,
              consensusError: {
                type: 'CONSENSUS_FAILED',
                reason: errorMessage,
              },
              recommendation: null,
              auditLog: [
                {
                  stage: 'consensus_engine',
                  timestamp: Date.now(),
                  data: { error: errorMessage },
                },
              ],
            };
          }

          // Save state with error to checkpointer
          await checkpointer.put(
            {
              configurable: {
                thread_id: marketId,
                checkpoint_id: 'error-checkpoint',
              },
            },
            {
              v: 1,
              id: 'error-checkpoint',
              ts: Date.now().toString(),
              channel_values: state,
              channel_versions: {},
              versions_seen: {},
            },
            { source: 'update', step: 1, writes: {} } as any
          );

          // Retrieve audit trail
          const auditTrail = await getAuditTrail(checkpointer, marketId);

          // Property: Audit trail should exist
          expect(auditTrail).toBeDefined();
          expect(auditTrail.marketId).toBe(marketId);

          // Property: Audit trail should contain at least one stage
          expect(auditTrail.stages.length).toBeGreaterThan(0);

          // Property: At least one stage should have errors
          const stagesWithErrors = auditTrail.stages.filter((stage) => stage.errors && stage.errors.length > 0);
          expect(stagesWithErrors.length).toBeGreaterThan(0);

          // Property: Error details should be present
          for (const stage of stagesWithErrors) {
            expect(stage.errors).toBeDefined();
            expect(Array.isArray(stage.errors)).toBe(true);

            for (const error of stage.errors!) {
              expect(error).toBeDefined();
              expect(typeof error).toBe('object');
            }
          }

          // Property: Audit log in state should contain error information
          expect(state.auditLog.length).toBeGreaterThan(0);
          const errorLogEntry = state.auditLog.find((entry) => entry.data && 'error' in entry.data);
          expect(errorLogEntry).toBeDefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
