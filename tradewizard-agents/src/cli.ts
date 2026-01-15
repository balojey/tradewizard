#!/usr/bin/env node
/**
 * CLI Interface for Market Intelligence Engine
 *
 * This CLI provides a command-line interface for analyzing prediction markets,
 * displaying trade recommendations, and inspecting Opik traces.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeMarket, getCheckpointer } from './workflow.js';
import { loadConfig, createConfig, type EngineConfig } from './config/index.js';
import { PolymarketClient } from './utils/polymarket-client.js';
import type { TradeRecommendation } from './models/types.js';
import type { GraphStateType } from './models/state.js';

const program = new Command();

// ============================================================================
// CLI Configuration
// ============================================================================

program
  .name('tradewizard-cli')
  .description('Market Intelligence Engine CLI - Analyze prediction markets with AI agents')
  .version('1.0.0');

// ============================================================================
// Analyze Command
// ============================================================================

program
  .command('analyze')
  .description('Analyze a prediction market by condition ID')
  .argument('<conditionId>', 'Polymarket condition ID to analyze')
  .option('-d, --debug', 'Show debug information and graph state')
  .option('-v, --visualize', 'Generate LangGraph workflow visualization (Mermaid)')
  .option('--opik-trace', 'Open Opik trace in browser after analysis')
  .option('--single-provider <provider>', 'Use single LLM provider (openai|anthropic|google)')
  .option('--model <model>', 'Override default model for single-provider mode')
  .option('--project <name>', 'Override Opik project name')
  .option('--show-costs', 'Display LLM cost tracking from Opik')
  .option('--replay', 'Replay from checkpoint (if available)')
  .action(async (conditionId: string, options) => {
    const spinner = ora('Initializing Market Intelligence Engine...').start();

    try {
      // Build configuration with overrides
      const configOverrides: Partial<EngineConfig> = {};

      if (options.singleProvider) {
        const provider = options.singleProvider as 'openai' | 'anthropic' | 'google';
        configOverrides.llm = {
          singleProvider: provider,
        };

        // Add provider-specific config if model is specified
        if (options.model) {
          if (provider === 'openai') {
            configOverrides.llm.openai = {
              apiKey: process.env.OPENAI_API_KEY || '',
              defaultModel: options.model,
            };
          } else if (provider === 'anthropic') {
            configOverrides.llm.anthropic = {
              apiKey: process.env.ANTHROPIC_API_KEY || '',
              defaultModel: options.model,
            };
          } else if (provider === 'google') {
            configOverrides.llm.google = {
              apiKey: process.env.GOOGLE_API_KEY || '',
              defaultModel: options.model,
            };
          }
        }
      }

      if (options.project) {
        configOverrides.opik = {
          projectName: options.project,
          tags: [],
          trackCosts: true,
        };
      }

      const config = Object.keys(configOverrides).length > 0
        ? createConfig(configOverrides)
        : loadConfig();

      // Display configuration
      spinner.text = 'Configuration loaded';
      if (options.debug) {
        console.log(chalk.dim('\nConfiguration:'));
        console.log(chalk.dim(`  LLM Mode: ${config.llm.singleProvider ? 'Single-Provider (' + config.llm.singleProvider + ')' : 'Multi-Provider'}`));
        console.log(chalk.dim(`  Opik Project: ${config.opik.projectName}`));
        console.log(chalk.dim(`  Min Agents: ${config.agents.minAgentsRequired}`));
        console.log(chalk.dim(`  Edge Threshold: ${(config.consensus.minEdgeThreshold * 100).toFixed(1)}%`));
      }

      // Initialize Polymarket client
      spinner.text = 'Connecting to Polymarket...';
      const polymarketClient = new PolymarketClient(config.polymarket);

      // Analyze market
      spinner.text = `Analyzing market ${conditionId}...`;
      const recommendation = await analyzeMarket(conditionId, config, polymarketClient);

      spinner.succeed(chalk.green('Analysis complete!'));

      // Display recommendation
      if (recommendation) {
        displayRecommendation(recommendation);
      } else {
        console.log(chalk.yellow('\n⚠️  No recommendation generated'));
      }

      // Show debug information if requested
      if (options.debug) {
        await displayDebugInfo(conditionId, config);
      }

      // Show visualization if requested
      if (options.visualize) {
        displayVisualization();
      }

      // Show costs if requested
      if (options.showCosts) {
        displayCostInfo(config);
      }

      // Open Opik trace if requested
      if (options.opikTrace) {
        openOpikTrace(conditionId, config);
      }

    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      if (options.debug && error instanceof Error) {
        console.error(chalk.dim('\nStack trace:'));
        console.error(chalk.dim(error.stack));
      }
      process.exit(1);
    }
  });

// ============================================================================
// History Command
// ============================================================================

program
  .command('history')
  .description('Query historical traces from Opik by market ID')
  .argument('<conditionId>', 'Polymarket condition ID to query')
  .option('--project <name>', 'Override Opik project name')
  .action(async (conditionId: string, options) => {
    const spinner = ora('Querying Opik traces...').start();

    try {
      const configOverrides: Partial<EngineConfig> = {};
      if (options.project) {
        configOverrides.opik = {
          projectName: options.project,
          tags: [],
          trackCosts: true,
        };
      }

      const config = Object.keys(configOverrides).length > 0
        ? createConfig(configOverrides)
        : loadConfig();

      spinner.succeed(chalk.green('Query complete!'));

      console.log(chalk.cyan('\n📊 Historical Traces'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(chalk.yellow('\nNote: To view detailed traces, use the Opik web UI:'));
      console.log(chalk.dim(`  Project: ${config.opik.projectName}`));
      console.log(chalk.dim(`  Thread ID: ${conditionId}`));
      
      if (config.opik.baseUrl) {
        console.log(chalk.dim(`  URL: ${config.opik.baseUrl}/projects/${config.opik.projectName}/traces?thread_id=${conditionId}`));
      } else {
        console.log(chalk.dim(`  URL: https://www.comet.com/opik/projects/${config.opik.projectName}/traces?thread_id=${conditionId}`));
      }

    } catch (error) {
      spinner.fail(chalk.red('Query failed'));
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============================================================================
// Checkpoint Command
// ============================================================================

program
  .command('checkpoint')
  .description('Inspect checkpoint state for a market analysis')
  .argument('<conditionId>', 'Polymarket condition ID to inspect')
  .option('--project <name>', 'Override Opik project name')
  .action(async (conditionId: string, options) => {
    const spinner = ora('Loading checkpoint...').start();

    try {
      const configOverrides: Partial<EngineConfig> = {};
      if (options.project) {
        configOverrides.opik = {
          projectName: options.project,
          tags: [],
          trackCosts: true,
        };
      }

      const config = Object.keys(configOverrides).length > 0
        ? createConfig(configOverrides)
        : loadConfig();

      const checkpointer = getCheckpointer(config);

      // Try to get checkpoint state
      const checkpoint = await checkpointer.get({
        configurable: { thread_id: conditionId },
      });

      spinner.succeed(chalk.green('Checkpoint loaded!'));

      if (checkpoint) {
        console.log(chalk.cyan('\n📦 Checkpoint State'));
        console.log(chalk.dim('─'.repeat(60)));
        
        const state = checkpoint.channel_values as GraphStateType;
        
        console.log(chalk.bold('\nMarket:'), state.conditionId || 'N/A');
        console.log(chalk.bold('MBD:'), state.mbd ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Agent Signals:'), state.agentSignals?.length || 0);
        console.log(chalk.bold('Bull Thesis:'), state.bullThesis ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Bear Thesis:'), state.bearThesis ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Debate Record:'), state.debateRecord ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Consensus:'), state.consensus ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Recommendation:'), state.recommendation ? '✓ Present' : '✗ Missing');
        console.log(chalk.bold('Audit Log Entries:'), state.auditLog?.length || 0);
        
        if (state.ingestionError) {
          console.log(chalk.red('\n⚠️  Ingestion Error:'), state.ingestionError.type);
        }
        
        if (state.agentErrors && state.agentErrors.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Agent Errors: ${state.agentErrors.length}`));
        }
        
        if (state.consensusError) {
          console.log(chalk.red('\n⚠️  Consensus Error:'), state.consensusError.type);
        }
      } else {
        console.log(chalk.yellow('\n⚠️  No checkpoint found for this market'));
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to load checkpoint'));
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Display formatted trade recommendation
 */
function displayRecommendation(rec: TradeRecommendation): void {
  console.log(chalk.cyan('\n📈 Trade Recommendation'));
  console.log(chalk.dim('─'.repeat(60)));

  // Action
  const actionColor = rec.action === 'LONG_YES' ? chalk.green : rec.action === 'LONG_NO' ? chalk.red : chalk.yellow;
  console.log(chalk.bold('\nAction:'), actionColor(rec.action));

  // Expected Value
  const evColor = rec.expectedValue > 0 ? chalk.green : chalk.red;
  console.log(chalk.bold('Expected Value:'), evColor(`$${rec.expectedValue.toFixed(2)} per $100`));

  // Win Probability
  console.log(chalk.bold('Win Probability:'), `${(rec.winProbability * 100).toFixed(1)}%`);

  // Entry Zone
  console.log(chalk.bold('Entry Zone:'), `${rec.entryZone[0].toFixed(2)}¢ - ${rec.entryZone[1].toFixed(2)}¢`);

  // Target Zone
  console.log(chalk.bold('Target Zone:'), `${rec.targetZone[0].toFixed(2)}¢ - ${rec.targetZone[1].toFixed(2)}¢`);

  // Liquidity Risk
  const riskColor = rec.liquidityRisk === 'low' ? chalk.green : rec.liquidityRisk === 'medium' ? chalk.yellow : chalk.red;
  console.log(chalk.bold('Liquidity Risk:'), riskColor(rec.liquidityRisk.toUpperCase()));

  // Explanation
  console.log(chalk.cyan('\n💡 Explanation'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold('\nSummary:'));
  console.log(rec.explanation.summary);

  console.log(chalk.bold('\nCore Thesis:'));
  console.log(rec.explanation.coreThesis);

  if (rec.explanation.keyCatalysts.length > 0) {
    console.log(chalk.bold('\nKey Catalysts:'));
    rec.explanation.keyCatalysts.forEach((catalyst, i) => {
      console.log(`  ${i + 1}. ${catalyst}`);
    });
  }

  if (rec.explanation.failureScenarios.length > 0) {
    console.log(chalk.bold('\nFailure Scenarios:'));
    rec.explanation.failureScenarios.forEach((scenario, i) => {
      console.log(`  ${i + 1}. ${scenario}`);
    });
  }

  if (rec.explanation.uncertaintyNote) {
    console.log(chalk.yellow('\n⚠️  Uncertainty Note:'));
    console.log(rec.explanation.uncertaintyNote);
  }

  // Metadata
  console.log(chalk.cyan('\n📊 Metadata'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold('Market Probability:'), `${(rec.metadata.marketProbability * 100).toFixed(1)}%`);
  console.log(chalk.bold('Consensus Probability:'), `${(rec.metadata.consensusProbability * 100).toFixed(1)}%`);
  console.log(chalk.bold('Edge:'), `${(rec.metadata.edge * 100).toFixed(1)}%`);
  console.log(chalk.bold('Confidence Band:'), `${(rec.metadata.confidenceBand[0] * 100).toFixed(1)}% - ${(rec.metadata.confidenceBand[1] * 100).toFixed(1)}%`);
}

/**
 * Display debug information and graph state
 */
async function displayDebugInfo(conditionId: string, config: EngineConfig): Promise<void> {
  console.log(chalk.cyan('\n🔍 Debug Information'));
  console.log(chalk.dim('─'.repeat(60)));

  try {
    const checkpointer = getCheckpointer(config);
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: conditionId },
    });

    if (checkpoint) {
      const state = checkpoint.channel_values as GraphStateType;

      // Display audit log
      if (state.auditLog && state.auditLog.length > 0) {
        console.log(chalk.bold('\nAudit Log:'));
        state.auditLog.forEach((entry, i) => {
          const timestamp = new Date(entry.timestamp).toISOString();
          console.log(chalk.dim(`  ${i + 1}. [${timestamp}] ${entry.stage}`));
        });
      }

      // Display agent signals
      if (state.agentSignals && state.agentSignals.length > 0) {
        console.log(chalk.bold('\nAgent Signals:'));
        state.agentSignals.forEach((signal) => {
          console.log(chalk.dim(`  - ${signal.agentName}: ${signal.direction} (confidence: ${(signal.confidence * 100).toFixed(1)}%, fair prob: ${(signal.fairProbability * 100).toFixed(1)}%)`));
        });
      }

      // Display errors
      if (state.agentErrors && state.agentErrors.length > 0) {
        console.log(chalk.yellow('\nAgent Errors:'));
        state.agentErrors.forEach((error) => {
          console.log(chalk.dim(`  - ${error.agentName}: ${error.type}`));
        });
      }

      // Display debate record
      if (state.debateRecord) {
        console.log(chalk.bold('\nDebate Scores:'));
        console.log(chalk.dim(`  Bull: ${state.debateRecord.bullScore.toFixed(2)}`));
        console.log(chalk.dim(`  Bear: ${state.debateRecord.bearScore.toFixed(2)}`));
      }

      // Display consensus
      if (state.consensus) {
        console.log(chalk.bold('\nConsensus:'));
        console.log(chalk.dim(`  Probability: ${(state.consensus.consensusProbability * 100).toFixed(1)}%`));
        console.log(chalk.dim(`  Regime: ${state.consensus.regime}`));
        console.log(chalk.dim(`  Disagreement: ${(state.consensus.disagreementIndex * 100).toFixed(1)}%`));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  No checkpoint data available'));
    }
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to load debug information'));
    console.error(chalk.dim(error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Display LangGraph workflow visualization
 */
function displayVisualization(): void {
  console.log(chalk.cyan('\n🎨 LangGraph Workflow Visualization'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.dim('\nMermaid Diagram:'));
  console.log(chalk.dim(`
graph TD
    START[START] --> MI[Market Ingestion]
    MI -->|Success| MMA[Market Microstructure Agent]
    MI -->|Success| PBA[Probability Baseline Agent]
    MI -->|Success| RAA[Risk Assessment Agent]
    MI -->|Error| END[END]
    MMA --> TC[Thesis Construction]
    PBA --> TC
    RAA --> TC
    TC --> CE[Cross Examination]
    CE --> CON[Consensus Engine]
    CON --> RG[Recommendation Generation]
    RG --> END
  `));
  console.log(chalk.yellow('\nNote: Copy the Mermaid diagram above to visualize at https://mermaid.live'));
}

/**
 * Display cost information from Opik
 */
function displayCostInfo(config: EngineConfig): void {
  console.log(chalk.cyan('\n💰 Cost Tracking'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.yellow('\nNote: Detailed cost tracking is available in the Opik web UI'));
  console.log(chalk.dim(`  Project: ${config.opik.projectName}`));
  console.log(chalk.dim('  Opik automatically tracks token usage and costs for all LLM calls'));
}

/**
 * Open Opik trace in browser
 */
function openOpikTrace(conditionId: string, config: EngineConfig): void {
  const baseUrl = config.opik.baseUrl || 'https://www.comet.com/opik';
  const url = `${baseUrl}/projects/${config.opik.projectName}/traces?thread_id=${conditionId}`;

  console.log(chalk.cyan('\n🔗 Opik Trace'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.bold('\nTrace URL:'));
  console.log(chalk.blue(url));
  console.log(chalk.dim('\nOpen this URL in your browser to view the detailed trace'));
}

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse();
