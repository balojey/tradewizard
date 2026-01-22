/**
 * LLM Factory Utility
 * 
 * Provides consistent LLM instance creation that respects single/multi LLM mode configuration.
 * This ensures all agents use the correct LLM provider based on the configuration.
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { EngineConfig } from '../config/index.js';

/**
 * Type for supported LLM instances
 */
export type LLMInstance = ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

/**
 * LLM provider types
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google';

/**
 * Create an LLM instance respecting single/multi provider mode
 * 
 * @param config - Engine configuration
 * @param preferredProvider - Preferred provider (ignored in single mode)
 * @param fallbackProviders - Fallback providers in order of preference (ignored in single mode)
 * @returns LLM instance
 */
export function createLLMInstance(
  config: EngineConfig,
  preferredProvider: LLMProvider = 'openai',
  fallbackProviders: LLMProvider[] = ['anthropic', 'google']
): LLMInstance {
  // Single provider mode: use the configured single provider for all agents
  if (config.llm.singleProvider) {
    const provider = config.llm.singleProvider;
    
    if (provider === 'openai' && config.llm.openai) {
      return new ChatOpenAI({
        apiKey: config.llm.openai.apiKey,
        model: config.llm.openai.defaultModel,
      });
    } else if (provider === 'anthropic' && config.llm.anthropic) {
      return new ChatAnthropic({
        apiKey: config.llm.anthropic.apiKey,
        model: config.llm.anthropic.defaultModel,
      });
    } else if (provider === 'google' && config.llm.google) {
      return new ChatGoogleGenerativeAI({
        apiKey: config.llm.google.apiKey,
        model: config.llm.google.defaultModel,
      });
    } else {
      throw new Error(`Single provider mode configured for '${provider}' but provider not available`);
    }
  }

  // Multi-provider mode: use preferred provider with fallbacks
  const providers = [preferredProvider, ...fallbackProviders];
  
  for (const provider of providers) {
    if (provider === 'openai' && config.llm.openai) {
      return new ChatOpenAI({
        apiKey: config.llm.openai.apiKey,
        model: config.llm.openai.defaultModel,
      });
    } else if (provider === 'anthropic' && config.llm.anthropic) {
      return new ChatAnthropic({
        apiKey: config.llm.anthropic.apiKey,
        model: config.llm.anthropic.defaultModel,
      });
    } else if (provider === 'google' && config.llm.google) {
      return new ChatGoogleGenerativeAI({
        apiKey: config.llm.google.apiKey,
        model: config.llm.google.defaultModel,
      });
    }
  }

  throw new Error(`No available LLM providers found. Tried: ${providers.join(', ')}`);
}

/**
 * Get the effective provider being used (useful for logging/debugging)
 */
export function getEffectiveProvider(
  config: EngineConfig,
  preferredProvider: LLMProvider = 'openai',
  fallbackProviders: LLMProvider[] = ['anthropic', 'google']
): LLMProvider {
  if (config.llm.singleProvider) {
    return config.llm.singleProvider;
  }

  const providers = [preferredProvider, ...fallbackProviders];
  
  for (const provider of providers) {
    if (provider === 'openai' && config.llm.openai) return 'openai';
    if (provider === 'anthropic' && config.llm.anthropic) return 'anthropic';
    if (provider === 'google' && config.llm.google) return 'google';
  }

  throw new Error(`No available LLM providers found. Tried: ${providers.join(', ')}`);
}