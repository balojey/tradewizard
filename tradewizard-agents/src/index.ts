/**
 * Market Intelligence Engine
 *
 * Multi-agent system for prediction market analysis using LangGraph
 */

import { config } from './config/index.js';

console.log('Market Intelligence Engine initialized');
console.log('Configuration loaded:', {
  polymarket: config.polymarket.gammaApiUrl,
  opik: config.opik.projectName,
  agents: config.agents.minAgentsRequired,
});

export { config };
