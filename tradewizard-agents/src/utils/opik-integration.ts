/**
 * Opik Integration for Automated Market Monitor
 *
 * This module provides Opik observability integration for the monitor service,
 * including custom spans for monitor operations, cost tracking per analysis cycle,
 * and agent performance tracking across cycles.
 */

import { OpikCallbackHandler } from 'opik-langchain';
import type { EngineConfig } from '../config/index.js';
import type { MarketId } from '../models/types.js';
import type { AgentSignal } from '../models/types.js';
import { getOpikTraceUrl } from './audit-logger.js';

/**
 * Opik span metadata for monitor operations
 */
export interface OpikSpanMetadata {
  operation: string;
  marketId?: MarketId;
  conditionId?: string;
  timestamp: number;
  duration?: number;
  cost?: number;
  status: 'success' | 'error' | 'in_progress';
  error?: string;
  [key: string]: unknown;
}

/**
 * Analysis cycle metrics for Opik tracking
 */
export interface AnalysisCycleMetrics {
  cycleId: string;
  timestamp: number;
  marketsDiscovered: number;
  marketsAnalyzed: number;
  marketsUpdated: number;
  totalDuration: number;
  totalCost: number;
  successCount: number;
  errorCount: number;
  agentMetrics: Record<string, AgentCycleMetrics>;
}

/**
 * Agent performance metrics per cycle
 */
export interface AgentCycleMetrics {
  agentName: string;
  executionCount: number;
  totalDuration: number;
  averageDuration: number;
  totalCost: number;
  averageCost: number;
  successCount: number;
  errorCount: number;
  averageConfidence: number;
}

/**
 * Opik integration manager for monitor service
 */
export class OpikMonitorIntegration {
  private config: EngineConfig;
  private currentCycleMetrics: AnalysisCycleMetrics | null = null;
  private cycleHistory: AnalysisCycleMetrics[] = [];

  constructor(config: EngineConfig) {
    this.config = config;
  }

  /**
   * Create Opik callback handler for workflow execution
   */
  createOpikHandler(): OpikCallbackHandler {
    return new OpikCallbackHandler({
      projectName: this.config.opik.projectName,
    });
  }

  /**
   * Start tracking an analysis cycle
   */
  startCycle(): string {
    const cycleId = `cycle_${Date.now()}`;
    this.currentCycleMetrics = {
      cycleId,
      timestamp: Date.now(),
      marketsDiscovered: 0,
      marketsAnalyzed: 0,
      marketsUpdated: 0,
      totalDuration: 0,
      totalCost: 0,
      successCount: 0,
      errorCount: 0,
      agentMetrics: {},
    };

    console.log(`[OpikMonitor] Started tracking cycle: ${cycleId}`);
    return cycleId;
  }

  /**
   * Record market discovery in current cycle
   */
  recordDiscovery(marketCount: number): void {
    if (!this.currentCycleMetrics) {
      console.warn('[OpikMonitor] No active cycle to record discovery');
      return;
    }

    this.currentCycleMetrics.marketsDiscovered = marketCount;
    console.log(`[OpikMonitor] Recorded discovery: ${marketCount} markets`);
  }

  /**
   * Record market analysis in current cycle
   */
  recordAnalysis(
    conditionId: string,
    duration: number,
    cost: number,
    success: boolean,
    agentSignals: AgentSignal[] = [],
    error?: string
  ): void {
    if (!this.currentCycleMetrics) {
      console.warn('[OpikMonitor] No active cycle to record analysis');
      return;
    }

    // Update cycle totals
    this.currentCycleMetrics.marketsAnalyzed++;
    this.currentCycleMetrics.totalDuration += duration;
    this.currentCycleMetrics.totalCost += cost;

    if (success) {
      this.currentCycleMetrics.successCount++;
    } else {
      this.currentCycleMetrics.errorCount++;
    }

    // Update agent metrics
    for (const signal of agentSignals) {
      this.updateAgentMetrics(signal, duration, cost, success);
    }

    // Log Opik trace URL
    const traceUrl = this.getTraceUrl(conditionId);
    console.log(`[OpikMonitor] Analysis recorded: ${conditionId}`);
    console.log(`[OpikMonitor] Opik Trace: ${traceUrl}`);

    if (error) {
      console.error(`[OpikMonitor] Analysis error: ${error}`);
    }
  }

  /**
   * Record market update in current cycle
   */
  recordUpdate(conditionId: string): void {
    if (!this.currentCycleMetrics) {
      console.warn('[OpikMonitor] No active cycle to record update');
      return;
    }

    this.currentCycleMetrics.marketsUpdated++;
    console.log(`[OpikMonitor] Recorded update: ${conditionId}`);
  }

  /**
   * End current cycle and store metrics
   */
  endCycle(): AnalysisCycleMetrics | null {
    if (!this.currentCycleMetrics) {
      console.warn('[OpikMonitor] No active cycle to end');
      return null;
    }

    const metrics = this.currentCycleMetrics;
    this.cycleHistory.push(metrics);

    // Keep only last 100 cycles
    if (this.cycleHistory.length > 100) {
      this.cycleHistory.shift();
    }

    console.log(`[OpikMonitor] Cycle ended: ${metrics.cycleId}`);
    console.log(`[OpikMonitor] Cycle summary:`, {
      discovered: metrics.marketsDiscovered,
      analyzed: metrics.marketsAnalyzed,
      updated: metrics.marketsUpdated,
      duration: `${(metrics.totalDuration / 1000).toFixed(2)}s`,
      cost: `$${metrics.totalCost.toFixed(4)}`,
      success: metrics.successCount,
      errors: metrics.errorCount,
    });

    this.currentCycleMetrics = null;
    return metrics;
  }

  /**
   * Get current cycle metrics
   */
  getCurrentCycleMetrics(): AnalysisCycleMetrics | null {
    return this.currentCycleMetrics;
  }

  /**
   * Get cycle history
   */
  getCycleHistory(): AnalysisCycleMetrics[] {
    return [...this.cycleHistory];
  }

  /**
   * Get aggregate metrics across all cycles
   */
  getAggregateMetrics(): {
    totalCycles: number;
    totalMarketsAnalyzed: number;
    totalCost: number;
    averageCostPerMarket: number;
    averageDurationPerMarket: number;
    successRate: number;
    topAgents: Array<{ agentName: string; averageCost: number; averageDuration: number }>;
  } {
    if (this.cycleHistory.length === 0) {
      return {
        totalCycles: 0,
        totalMarketsAnalyzed: 0,
        totalCost: 0,
        averageCostPerMarket: 0,
        averageDurationPerMarket: 0,
        successRate: 0,
        topAgents: [],
      };
    }

    const totalMarketsAnalyzed = this.cycleHistory.reduce(
      (sum, cycle) => sum + cycle.marketsAnalyzed,
      0
    );
    const totalCost = this.cycleHistory.reduce((sum, cycle) => sum + cycle.totalCost, 0);
    const totalDuration = this.cycleHistory.reduce((sum, cycle) => sum + cycle.totalDuration, 0);
    const totalSuccess = this.cycleHistory.reduce((sum, cycle) => sum + cycle.successCount, 0);
    const totalErrors = this.cycleHistory.reduce((sum, cycle) => sum + cycle.errorCount, 0);

    // Aggregate agent metrics
    const agentAggregates: Record<string, { totalCost: number; totalDuration: number; count: number }> = {};

    for (const cycle of this.cycleHistory) {
      for (const [agentName, metrics] of Object.entries(cycle.agentMetrics)) {
        if (!agentAggregates[agentName]) {
          agentAggregates[agentName] = { totalCost: 0, totalDuration: 0, count: 0 };
        }
        agentAggregates[agentName].totalCost += metrics.totalCost;
        agentAggregates[agentName].totalDuration += metrics.totalDuration;
        agentAggregates[agentName].count += metrics.executionCount;
      }
    }

    const topAgents = Object.entries(agentAggregates)
      .map(([agentName, data]) => ({
        agentName,
        averageCost: data.totalCost / data.count,
        averageDuration: data.totalDuration / data.count,
      }))
      .sort((a, b) => b.averageCost - a.averageCost)
      .slice(0, 10);

    return {
      totalCycles: this.cycleHistory.length,
      totalMarketsAnalyzed,
      totalCost,
      averageCostPerMarket: totalMarketsAnalyzed > 0 ? totalCost / totalMarketsAnalyzed : 0,
      averageDurationPerMarket: totalMarketsAnalyzed > 0 ? totalDuration / totalMarketsAnalyzed : 0,
      successRate: totalSuccess + totalErrors > 0 ? totalSuccess / (totalSuccess + totalErrors) : 0,
      topAgents,
    };
  }

  /**
   * Get Opik trace URL for a market analysis
   */
  getTraceUrl(conditionId: string): string {
    const workspace = process.env.OPIK_WORKSPACE;
    const baseUrl = process.env.OPIK_BASE_URL;

    return getOpikTraceUrl(this.config.opik.projectName, conditionId, workspace, baseUrl);
  }

  /**
   * Log Opik dashboard link
   */
  logDashboardLink(): void {
    const baseUrl = process.env.OPIK_BASE_URL || 'https://www.comet.com/opik';
    const workspace = process.env.OPIK_WORKSPACE || 'default';
    const projectName = this.config.opik.projectName;

    const dashboardUrl = `${baseUrl}/${workspace}/projects/${projectName}`;
    console.log(`[OpikMonitor] Opik Dashboard: ${dashboardUrl}`);
  }

  /**
   * Create custom Opik span metadata for monitor operations
   */
  createSpanMetadata(operation: string, data: Partial<OpikSpanMetadata> = {}): OpikSpanMetadata {
    return {
      operation,
      timestamp: Date.now(),
      status: 'in_progress',
      ...data,
    };
  }

  /**
   * Update agent metrics in current cycle
   */
  private updateAgentMetrics(
    signal: AgentSignal,
    duration: number,
    cost: number,
    success: boolean
  ): void {
    if (!this.currentCycleMetrics) return;

    const agentName = signal.agentName;
    const metrics = this.currentCycleMetrics.agentMetrics[agentName] || {
      agentName,
      executionCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalCost: 0,
      averageCost: 0,
      successCount: 0,
      errorCount: 0,
      averageConfidence: 0,
    };

    // Update counts
    metrics.executionCount++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    // Update totals
    metrics.totalDuration += duration;
    metrics.totalCost += cost;

    // Update averages
    metrics.averageDuration = metrics.totalDuration / metrics.executionCount;
    metrics.averageCost = metrics.totalCost / metrics.executionCount;

    // Update confidence (running average)
    const n = metrics.executionCount;
    metrics.averageConfidence =
      (metrics.averageConfidence * (n - 1) + signal.confidence) / n;

    this.currentCycleMetrics.agentMetrics[agentName] = metrics;
  }
}

/**
 * Create Opik monitor integration instance
 */
export function createOpikMonitorIntegration(config: EngineConfig): OpikMonitorIntegration {
  return new OpikMonitorIntegration(config);
}

/**
 * Format cycle metrics for logging
 */
export function formatCycleMetrics(metrics: AnalysisCycleMetrics): string {
  const lines = [
    `Cycle: ${metrics.cycleId}`,
    `Timestamp: ${new Date(metrics.timestamp).toISOString()}`,
    `Markets Discovered: ${metrics.marketsDiscovered}`,
    `Markets Analyzed: ${metrics.marketsAnalyzed}`,
    `Markets Updated: ${metrics.marketsUpdated}`,
    `Total Duration: ${(metrics.totalDuration / 1000).toFixed(2)}s`,
    `Total Cost: $${metrics.totalCost.toFixed(4)}`,
    `Success: ${metrics.successCount}`,
    `Errors: ${metrics.errorCount}`,
    `Success Rate: ${((metrics.successCount / (metrics.successCount + metrics.errorCount)) * 100).toFixed(1)}%`,
  ];

  if (Object.keys(metrics.agentMetrics).length > 0) {
    lines.push('\nAgent Performance:');
    for (const [agentName, agentMetrics] of Object.entries(metrics.agentMetrics)) {
      lines.push(
        `  ${agentName}: ${agentMetrics.executionCount} executions, ` +
        `avg ${agentMetrics.averageDuration.toFixed(0)}ms, ` +
        `avg $${agentMetrics.averageCost.toFixed(4)}, ` +
        `confidence ${agentMetrics.averageConfidence.toFixed(2)}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Format aggregate metrics for logging
 */
export function formatAggregateMetrics(metrics: ReturnType<OpikMonitorIntegration['getAggregateMetrics']>): string {
  const lines = [
    'Aggregate Metrics (All Cycles):',
    `Total Cycles: ${metrics.totalCycles}`,
    `Total Markets Analyzed: ${metrics.totalMarketsAnalyzed}`,
    `Total Cost: $${metrics.totalCost.toFixed(4)}`,
    `Average Cost per Market: $${metrics.averageCostPerMarket.toFixed(4)}`,
    `Average Duration per Market: ${(metrics.averageDurationPerMarket / 1000).toFixed(2)}s`,
    `Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`,
  ];

  if (metrics.topAgents.length > 0) {
    lines.push('\nTop Agents by Cost:');
    for (const agent of metrics.topAgents) {
      lines.push(
        `  ${agent.agentName}: avg $${agent.averageCost.toFixed(4)}, ` +
        `avg ${(agent.averageDuration / 1000).toFixed(2)}s`
      );
    }
  }

  return lines.join('\n');
}
