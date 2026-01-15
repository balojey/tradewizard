/**
 * Cost Optimization Utilities
 *
 * This module provides cost estimation and optimization for agent execution.
 * It helps manage LLM API costs by:
 * - Estimating costs before agent activation
 * - Skipping low-impact agents when budget is constrained
 * - Prioritizing MVP and high-value agents
 * - Tracking actual costs via Opik integration
 */

import type { EngineConfig } from '../config/index.js';

/**
 * Cost estimates per agent type (in USD)
 * 
 * These are rough estimates based on typical LLM API costs:
 * - GPT-4: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
 * - Claude: ~$0.015 per 1K input tokens, ~$0.075 per 1K output tokens
 * - Gemini: ~$0.00025 per 1K input tokens, ~$0.0005 per 1K output tokens
 * 
 * Average agent call: ~2K input tokens, ~500 output tokens
 */
const AGENT_COST_ESTIMATES: Record<string, number> = {
  // MVP agents (always run, higher priority)
  'market_microstructure': 0.10,
  'probability_baseline': 0.08,
  'risk_assessment': 0.10,
  
  // Event Intelligence agents (high value)
  'breaking_news': 0.12,
  'event_impact': 0.12,
  
  // Polling & Statistical agents (high value for elections)
  'polling_intelligence': 0.15,
  'historical_pattern': 0.10,
  
  // Sentiment & Narrative agents (medium value, can be noisy)
  'media_sentiment': 0.10,
  'social_sentiment': 0.10,
  'narrative_velocity': 0.10,
  
  // Price Action agents (medium value, market-dependent)
  'momentum': 0.08,
  'mean_reversion': 0.08,
  
  // Event Scenario agents (medium value)
  'catalyst': 0.10,
  'tail_risk': 0.10,
  
  // Risk Philosophy agents (lower cost, run after consensus)
  'aggressive': 0.06,
  'conservative': 0.06,
  'neutral': 0.06,
};

/**
 * Agent priority levels for cost optimization
 * 
 * When budget is constrained, agents are prioritized:
 * 1. CRITICAL: MVP agents (always run)
 * 2. HIGH: Event intelligence, polling (high signal value)
 * 3. MEDIUM: Catalysts, historical patterns, price action
 * 4. LOW: Sentiment, narrative velocity (can be noisy)
 */
export enum AgentPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
}

const AGENT_PRIORITIES: Record<string, AgentPriority> = {
  // MVP agents - always run
  'market_microstructure': AgentPriority.CRITICAL,
  'probability_baseline': AgentPriority.CRITICAL,
  'risk_assessment': AgentPriority.CRITICAL,
  
  // High-value advanced agents
  'breaking_news': AgentPriority.HIGH,
  'event_impact': AgentPriority.HIGH,
  'polling_intelligence': AgentPriority.HIGH,
  
  // Medium-value agents
  'catalyst': AgentPriority.MEDIUM,
  'historical_pattern': AgentPriority.MEDIUM,
  'momentum': AgentPriority.MEDIUM,
  'mean_reversion': AgentPriority.MEDIUM,
  'tail_risk': AgentPriority.MEDIUM,
  
  // Lower-priority agents (can be skipped if budget tight)
  'media_sentiment': AgentPriority.LOW,
  'social_sentiment': AgentPriority.LOW,
  'narrative_velocity': AgentPriority.LOW,
  
  // Risk philosophy agents (run after consensus, lower cost)
  'aggressive': AgentPriority.MEDIUM,
  'conservative': AgentPriority.MEDIUM,
  'neutral': AgentPriority.MEDIUM,
};

/**
 * Estimate cost for a set of agents
 * 
 * @param agentNames - Array of agent names to estimate cost for
 * @returns Estimated total cost in USD
 */
export function estimateAgentCost(agentNames: string[]): number {
  return agentNames.reduce((total, agentName) => {
    const cost = AGENT_COST_ESTIMATES[agentName] ?? 0.10; // Default to $0.10 if unknown
    return total + cost;
  }, 0);
}

/**
 * Get priority for an agent
 * 
 * @param agentName - Agent name
 * @returns Priority level
 */
export function getAgentPriority(agentName: string): AgentPriority {
  return AGENT_PRIORITIES[agentName] ?? AgentPriority.LOW;
}

/**
 * Filter agents based on cost budget
 * 
 * This function implements cost-aware agent selection:
 * 1. Always include CRITICAL priority agents (MVP)
 * 2. Add HIGH priority agents if budget allows
 * 3. Add MEDIUM priority agents if budget allows
 * 4. Add LOW priority agents if budget allows
 * 5. Within each priority level, sort by estimated value/cost ratio
 * 
 * @param candidateAgents - Array of candidate agent names
 * @param maxCost - Maximum cost budget in USD
 * @param skipLowImpact - Whether to skip low-impact agents
 * @returns Object with selected agents and cost breakdown
 */
export function filterAgentsByCost(
  candidateAgents: string[],
  maxCost: number,
  skipLowImpact: boolean
): {
  selectedAgents: string[];
  skippedAgents: string[];
  estimatedCost: number;
  remainingBudget: number;
  costBreakdown: Record<string, number>;
} {
  // Separate agents by priority
  const agentsByPriority: Record<AgentPriority, string[]> = {
    [AgentPriority.CRITICAL]: [],
    [AgentPriority.HIGH]: [],
    [AgentPriority.MEDIUM]: [],
    [AgentPriority.LOW]: [],
  };

  for (const agent of candidateAgents) {
    const priority = getAgentPriority(agent);
    agentsByPriority[priority].push(agent);
  }

  const selectedAgents: string[] = [];
  const skippedAgents: string[] = [];
  const costBreakdown: Record<string, number> = {};
  let currentCost = 0;
  let hasSkippedHigherPriority = false; // Track if we've skipped a higher priority agent

  // Helper function to try adding agents from a priority level
  const tryAddAgents = (agents: string[], canSkip: boolean): void => {
    for (const agent of agents) {
      const agentCost = AGENT_COST_ESTIMATES[agent] ?? 0.10;
      
      // If we've already skipped a higher priority agent due to budget,
      // we must skip all lower priority agents to maintain priority ordering
      if (hasSkippedHigherPriority && canSkip && skipLowImpact) {
        skippedAgents.push(agent);
        continue;
      }
      
      // Check if we can afford this agent
      if (currentCost + agentCost <= maxCost) {
        selectedAgents.push(agent);
        costBreakdown[agent] = agentCost;
        currentCost += agentCost;
      } else if (canSkip && skipLowImpact) {
        // Skip this agent if we're over budget and skipping is allowed
        skippedAgents.push(agent);
        hasSkippedHigherPriority = true; // Mark that we've skipped an agent
      } else {
        // For critical agents, we must include them even if over budget
        selectedAgents.push(agent);
        costBreakdown[agent] = agentCost;
        currentCost += agentCost;
      }
    }
  };

  // Add agents by priority
  tryAddAgents(agentsByPriority[AgentPriority.CRITICAL], false); // Never skip critical
  tryAddAgents(agentsByPriority[AgentPriority.HIGH], true);
  tryAddAgents(agentsByPriority[AgentPriority.MEDIUM], true);
  tryAddAgents(agentsByPriority[AgentPriority.LOW], true);

  return {
    selectedAgents,
    skippedAgents,
    estimatedCost: currentCost,
    remainingBudget: Math.max(0, maxCost - currentCost),
    costBreakdown,
  };
}

/**
 * Apply cost optimization to agent selection
 * 
 * This is the main entry point for cost optimization.
 * It filters agents based on configuration and budget constraints.
 * 
 * @param candidateAgents - Array of candidate agent names
 * @param config - Engine configuration
 * @returns Object with optimization results
 */
export function applyCostOptimization(
  candidateAgents: string[],
  config: EngineConfig
): {
  selectedAgents: string[];
  skippedAgents: string[];
  estimatedCost: number;
  maxCost: number;
  costBreakdown: Record<string, number>;
  optimizationApplied: boolean;
} {
  const maxCost = config.costOptimization.maxCostPerAnalysis;
  const skipLowImpact = config.costOptimization.skipLowImpactAgents;

  // If cost optimization is disabled, return all agents
  if (!skipLowImpact) {
    const estimatedCost = estimateAgentCost(candidateAgents);
    const costBreakdown: Record<string, number> = {};
    candidateAgents.forEach(agent => {
      costBreakdown[agent] = AGENT_COST_ESTIMATES[agent] ?? 0.10;
    });

    return {
      selectedAgents: candidateAgents,
      skippedAgents: [],
      estimatedCost,
      maxCost,
      costBreakdown,
      optimizationApplied: false,
    };
  }

  // Apply cost-based filtering
  const result = filterAgentsByCost(candidateAgents, maxCost, skipLowImpact);

  return {
    ...result,
    maxCost,
    optimizationApplied: result.skippedAgents.length > 0,
  };
}

/**
 * Log cost optimization decision
 * 
 * Creates an audit log entry for cost optimization decisions.
 * 
 * @param result - Cost optimization result
 * @returns Audit log entry data
 */
export function createCostOptimizationAuditEntry(result: {
  selectedAgents: string[];
  skippedAgents: string[];
  estimatedCost: number;
  maxCost: number;
  costBreakdown: Record<string, number>;
  optimizationApplied: boolean;
}): Record<string, any> {
  return {
    optimizationApplied: result.optimizationApplied,
    maxCost: result.maxCost,
    estimatedCost: result.estimatedCost,
    remainingBudget: result.maxCost - result.estimatedCost,
    selectedAgentCount: result.selectedAgents.length,
    skippedAgentCount: result.skippedAgents.length,
    selectedAgents: result.selectedAgents,
    skippedAgents: result.skippedAgents,
    costBreakdown: result.costBreakdown,
    budgetUtilization: (result.estimatedCost / result.maxCost) * 100,
  };
}

/**
 * Track actual agent cost
 * 
 * This function would integrate with Opik to track actual costs.
 * For now, it returns the estimated cost.
 * 
 * @param agentName - Agent name
 * @param actualTokens - Actual token usage (if available)
 * @returns Actual or estimated cost
 */
export function trackAgentCost(
  agentName: string,
  actualTokens?: { input: number; output: number }
): number {
  // If actual token usage is provided, calculate precise cost
  if (actualTokens) {
    // These rates are approximations for GPT-4
    const inputCostPer1K = 0.03;
    const outputCostPer1K = 0.06;
    
    const inputCost = (actualTokens.input / 1000) * inputCostPer1K;
    const outputCost = (actualTokens.output / 1000) * outputCostPer1K;
    
    return inputCost + outputCost;
  }

  // Otherwise, return estimated cost
  return AGENT_COST_ESTIMATES[agentName] ?? 0.10;
}
