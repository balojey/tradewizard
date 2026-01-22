/**
 * Enhanced Agent Factory
 * 
 * Creates agent nodes with integrated NewsData.io tools for direct news access.
 * Enhances existing agents with news fetching capabilities while maintaining
 * backward compatibility with the existing agent framework.
 */

import type { GraphStateType } from '../models/state.js';
import type { EngineConfig } from '../config/index.js';
import type { AdvancedObservabilityLogger } from './audit-logger.js';
import { getLogger } from './logger.js';
import { 
  AgentNewsToolsManager,
  createAgentNewsToolsManagerFromConfig,
  createAgentNewsToolFunctions,
  type AgentNewsToolFunctions
} from './agent-news-tools-config.js';
import { createNewsDataClient } from './newsdata-client.js';

// ============================================================================
// Enhanced Agent Context
// ============================================================================

/**
 * Enhanced context provided to agents with news tools
 */
export interface EnhancedAgentContext {
  // Original state
  state: GraphStateType;
  
  // News tools for direct access
  newsTools: AgentNewsToolFunctions;
  
  // Utility methods
  utils: {
    extractKeywords: (text: string) => string[];
    inferCategories: (text: string) => string[];
    calculateTimeWindow: (market: any) => number;
  };
  
  // Logger for enhanced agents
  logger: ReturnType<typeof getLogger>;
}

/**
 * Enhanced agent node function type
 */
export type EnhancedAgentNodeFunction = (
  context: EnhancedAgentContext
) => Promise<Partial<GraphStateType>>;

// ============================================================================
// Enhanced Agent Factory
// ============================================================================

/**
 * Factory for creating enhanced agents with NewsData.io integration
 */
export class EnhancedAgentFactory {
  private newsToolsManager: AgentNewsToolsManager;
  private config: EngineConfig;
  private logger?: AdvancedObservabilityLogger;

  constructor(
    config: EngineConfig,
    logger?: AdvancedObservabilityLogger
  ) {
    this.config = config;
    this.logger = logger;
    
    // Create NewsData client if integration is enabled
    if (process.env.NEWSDATA_INTEGRATION_ENABLED === 'true') {
      const newsDataClient = createNewsDataClient({
        apiKey: process.env.NEWSDATA_API_KEY || '',
        rateLimiting: {
          requestsPerWindow: 100,
          windowSizeMs: 15 * 60 * 1000,
          dailyQuota: 1000,
        },
        cache: {
          enabled: true,
          ttl: {
            latest: 300, // 5 minutes
            crypto: 300,
            market: 300,
            archive: 1800, // 30 minutes
          },
        },
        circuitBreaker: {
          enabled: true,
          failureThreshold: 5,
          resetTimeoutMs: 60000,
        },
      });
      
      this.newsToolsManager = createAgentNewsToolsManagerFromConfig(
        config,
        newsDataClient,
        logger
      );
    } else {
      // Create a mock manager for disabled integration
      this.newsToolsManager = this.createMockNewsToolsManager();
    }
  }

  /**
   * Create an enhanced agent node with news tools
   */
  createEnhancedAgentNode(
    agentName: string,
    agentFunction: EnhancedAgentNodeFunction
  ): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
    return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
      const startTime = Date.now();
      
      try {
        // Create news tools for this agent
        const newsTools = createAgentNewsToolFunctions(agentName, this.newsToolsManager);
        
        // Create enhanced context
        const context: EnhancedAgentContext = {
          state,
          newsTools,
          utils: {
            extractKeywords: this.extractKeywords,
            inferCategories: this.inferCategories,
            calculateTimeWindow: this.calculateTimeWindow,
          },
          logger: getLogger(),
        };
        
        // Execute the enhanced agent function
        const result = await agentFunction(context);
        
        // Add audit log entry for successful execution
        const auditEntry = {
          stage: `enhanced_agent_${agentName}`,
          timestamp: Date.now(),
          data: {
            agentName,
            success: true,
            newsToolsEnabled: process.env.NEWSDATA_INTEGRATION_ENABLED === 'true',
            duration: Date.now() - startTime,
          },
        };
        
        return {
          ...result,
          auditLog: [...(result.auditLog || []), auditEntry],
        };
        
      } catch (error) {
        this.logger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'enhanced-agent',
          success: false,
          cached: false,
          stale: false,
          freshness: 0,
          itemCount: 0,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
        
        // Return error state
        return {
          agentErrors: [
            {
              type: 'EXECUTION_FAILED',
              agentName,
              error: error instanceof Error ? error : new Error('Unknown error'),
            },
          ],
          auditLog: [
            {
              stage: `enhanced_agent_${agentName}`,
              timestamp: Date.now(),
              data: {
                agentName,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
              },
            },
          ],
        };
      }
    };
  }

  /**
   * Create an enhanced version of an existing agent
   */
  enhanceExistingAgent(
    agentName: string,
    originalAgentFunction: (state: GraphStateType) => Promise<Partial<GraphStateType>>,
    newsEnhancement?: (context: EnhancedAgentContext) => Promise<any>
  ): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
    return async (state: GraphStateType): Promise<Partial<GraphStateType>> => {
      const startTime = Date.now();
      
      try {
        // If NewsData integration is disabled, just run the original agent
        if (process.env.NEWSDATA_INTEGRATION_ENABLED !== 'true') {
          return await originalAgentFunction(state);
        }
        
        // Create enhanced context
        const newsTools = createAgentNewsToolFunctions(agentName, this.newsToolsManager);
        const context: EnhancedAgentContext = {
          state,
          newsTools,
          utils: {
            extractKeywords: this.extractKeywords,
            inferCategories: this.inferCategories,
            calculateTimeWindow: this.calculateTimeWindow,
          },
          logger: getLogger(),
        };
        
        // Fetch additional news data if enhancement function provided
        let enhancedState = state;
        if (newsEnhancement) {
          try {
            const newsData = await newsEnhancement(context);
            
            // Merge news data into state
            enhancedState = {
              ...state,
              externalData: {
                ...state.externalData,
                news: newsData || state.externalData?.news || [],
                dataFreshness: state.externalData?.dataFreshness || {}
              },
            };
          } catch (newsError) {
            console.warn('[Enhanced Agent] News enhancement failed, continuing with original agent', {
              agentName,
              error: newsError instanceof Error ? newsError.message : String(newsError),
            });
          }
        }
        
        // Execute original agent with enhanced state
        const result = await originalAgentFunction(enhancedState);
        
        // Add audit log entry
        const auditEntry = {
          stage: `enhanced_${agentName}`,
          timestamp: Date.now(),
          data: {
            agentName,
            enhanced: true,
            newsEnhancementUsed: !!newsEnhancement,
            duration: Date.now() - startTime,
          },
        };
        
        return {
          ...result,
          auditLog: [...(result.auditLog || []), auditEntry],
        };
        
      } catch (error) {
        this.logger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'enhanced-agent-wrapper',
          success: false,
          cached: false,
          stale: false,
          freshness: 0,
          itemCount: 0,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        });
        
        // Fallback to original agent
        return await originalAgentFunction(state);
      }
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // Extract proper names (capitalized words)
    const properNames = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    keywords.push(...properNames);
    
    // Extract acronyms
    const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
    keywords.push(...acronyms);
    
    // Extract stock symbols
    const stockSymbols = text.match(/\$[A-Z]{1,5}\b/g) || [];
    keywords.push(...stockSymbols);
    
    // Extract quoted phrases
    const quotedPhrases = text.match(/"([^"]+)"/g) || [];
    keywords.push(...quotedPhrases.map(phrase => phrase.replace(/"/g, '')));
    
    // Remove duplicates and limit to 10 keywords
    return [...new Set(keywords)].slice(0, 10);
  }

  private inferCategories(text: string): string[] {
    const lowerText = text.toLowerCase();
    const categories: string[] = [];
    
    const categoryKeywords = {
      politics: ['election', 'vote', 'president', 'congress', 'senate', 'political', 'campaign', 'policy'],
      business: ['stock', 'company', 'earnings', 'revenue', 'market', 'ipo', 'merger', 'financial'],
      technology: ['tech', 'ai', 'software', 'apple', 'google', 'microsoft', 'tesla', 'innovation'],
      sports: ['game', 'team', 'player', 'championship', 'season', 'nfl', 'nba', 'olympics'],
      entertainment: ['movie', 'film', 'actor', 'music', 'album', 'concert', 'award', 'celebrity'],
      health: ['health', 'medical', 'drug', 'vaccine', 'hospital', 'doctor', 'disease'],
      environment: ['climate', 'environment', 'energy', 'renewable', 'carbon', 'pollution'],
      world: ['international', 'global', 'country', 'nation', 'foreign', 'diplomatic'],
    };
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        categories.push(category);
      }
    });
    
    return categories.length > 0 ? categories : ['business']; // Default to business
  }

  private calculateTimeWindow(market: any): number {
    if (!market?.endDate) {
      return 24; // Default 24 hours
    }
    
    const endDate = new Date(market.endDate);
    const now = new Date();
    const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Adjust time window based on time until market resolution
    if (hoursUntilEnd <= 24) {
      return 6; // Last day - focus on recent news
    } else if (hoursUntilEnd <= 168) { // 1 week
      return 12;
    } else if (hoursUntilEnd <= 720) { // 1 month
      return 24;
    } else {
      return 48; // Longer term markets
    }
  }

  private createMockNewsToolsManager(): AgentNewsToolsManager {
    // Create a mock manager that returns empty results when integration is disabled
    return {
      getAvailableToolsForAgent: () => [],
      executeToolForAgent: async () => [],
      getToolConfigForAgent: () => null,
      getRequestStats: () => ({ count: 0, limit: 0, resetTime: Date.now() }),
    } as any;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create enhanced agent factory from engine configuration
 */
export function createEnhancedAgentFactory(
  config: EngineConfig,
  logger?: AdvancedObservabilityLogger
): EnhancedAgentFactory {
  return new EnhancedAgentFactory(config, logger);
}

// ============================================================================
// Pre-built Enhanced Agents
// ============================================================================

/**
 * Create enhanced breaking news agent with direct news access
 */
export function createEnhancedBreakingNewsAgent(
  factory: EnhancedAgentFactory
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  return factory.createEnhancedAgentNode('breaking_news_agent', async (context) => {
    const { state, newsTools, utils, logger } = context;
    
    if (!state.mbd) {
      throw new Error('No Market Briefing Document available');
    }
    
    // Use AI-enhanced keywords if available, otherwise fall back to simple extraction
    let keywords: string[];
    if (state.marketKeywords?.ranked) {
      // Use AI-enhanced keywords for better news relevance
      keywords = state.marketKeywords.ranked
        .slice(0, 8) // Use top 8 keywords for better search precision
        .map(rk => rk.keyword);
      
      logger.info({
        agentName: 'breaking_news_agent',
        keywordSource: 'ai-enhanced',
        keywordCount: keywords.length,
        topKeywords: keywords.slice(0, 5)
      }, 'Using AI-enhanced keywords for news search');
    } else {
      // Fallback to simple extraction
      keywords = utils.extractKeywords(`${state.mbd.question} ${state.mbd.resolutionCriteria || ''}`);
      
      logger.warn({
        agentName: 'breaking_news_agent',
        keywordSource: 'fallback',
        keywordCount: keywords.length
      }, 'Using fallback keyword extraction - AI keywords not available');
    }
    
    // Fetch latest news using NewsData.io tools with enhanced keywords
    const newsArticles = await newsTools.fetchLatestNews({
      query: keywords.slice(0, 5).join(' OR '), // Use top 5 keywords for better precision
      size: 10, // Reduced for free tier
      removeDuplicates: true,
      sort: 'relevancy',
      categories: ['politics', 'business', 'world'],
      countries: ['us']
    });
    
    // Convert to legacy format for compatibility with existing agent logic
    const legacyNewsFormat = newsArticles.map((article: any) => ({
      title: article.title,
      source: article.source.name,
      publishedAt: new Date(article.metadata.publishedAt).getTime(),
      url: article.url,
      summary: article.content.description || article.content.fullContent || article.title,
      sentiment: article.ai?.sentiment || 'neutral',
      relevanceScore: 0.8, // High relevance since we filtered by keywords
    }));
    
    // Update state with fetched news
    const enhancedState = {
      ...state,
      externalData: {
        ...state.externalData,
        news: legacyNewsFormat,
        dataFreshness: state.externalData?.dataFreshness || {}
      },
    };
    
    // Import and use the original breaking news agent logic
    const { createBreakingNewsAgentNode } = await import('../nodes/event-intelligence.js');
    const originalAgent = createBreakingNewsAgentNode(factory['config']);
    
    return await originalAgent(enhancedState);
  });
}

/**
 * Create enhanced media sentiment agent with direct news access
 */
export function createEnhancedMediaSentimentAgent(
  factory: EnhancedAgentFactory
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  return factory.createEnhancedAgentNode('media_sentiment_agent', async (context) => {
    const { state, newsTools, utils, logger } = context;
    
    if (!state.mbd) {
      throw new Error('No Market Briefing Document available');
    }
    
    // Use AI-enhanced keywords if available, otherwise fall back to simple extraction
    let keywords: string[];
    if (state.marketKeywords?.ranked) {
      // Use AI-enhanced keywords for better news relevance
      keywords = state.marketKeywords.ranked
        .slice(0, 8) // Use top 8 keywords for better search precision
        .map(rk => rk.keyword);
      
      logger.info({
        agentName: 'media_sentiment_agent',
        keywordSource: 'ai-enhanced',
        keywordCount: keywords.length,
        topKeywords: keywords.slice(0, 5)
      }, 'Using AI-enhanced keywords for news search');
    } else {
      // Fallback to simple extraction
      keywords = utils.extractKeywords(`${state.mbd.question} ${state.mbd.resolutionCriteria || ''}`);
      
      logger.warn({
        agentName: 'media_sentiment_agent',
        keywordSource: 'fallback',
        keywordCount: keywords.length
      }, 'Using fallback keyword extraction - AI keywords not available');
    }
    
    // Fetch news for sentiment analysis
    const newsArticles = await newsTools.fetchLatestNews({
      query: keywords.slice(0, 5).join(' OR '),
      size: 10, // Reduced for free tier
      removeDuplicates: true,
      sort: 'relevancy',
      categories: ['politics', 'business', 'world'],
      countries: ['us']
    });
    
    // Convert to legacy format
    const legacyNewsFormat = newsArticles.map((article: any) => ({
      title: article.title,
      source: article.source.name,
      publishedAt: new Date(article.metadata.publishedAt).getTime(),
      url: article.url,
      summary: article.content.description || article.title,
      sentiment: article.ai?.sentiment || 'neutral',
      relevanceScore: 0.7,
    }));
    
    // Update state with fetched news
    const enhancedState = {
      ...state,
      externalData: {
        ...state.externalData,
        news: legacyNewsFormat,
        dataFreshness: state.externalData?.dataFreshness || {}
      },
    };
    
    // Import and use the original media sentiment agent logic
    const { createMediaSentimentAgentNode } = await import('../nodes/sentiment-narrative.js');
    const originalAgent = createMediaSentimentAgentNode(factory['config']);
    
    return await originalAgent(enhancedState);
  });
}

/**
 * Create enhanced market microstructure agent with market news access
 */
export function createEnhancedMarketMicrostructureAgent(
  factory: EnhancedAgentFactory
): (state: GraphStateType) => Promise<Partial<GraphStateType>> {
  return factory.createEnhancedAgentNode('market_microstructure_agent', async (context) => {
    const { state, newsTools, utils, logger } = context;
    
    if (!state.mbd) {
      throw new Error('No Market Briefing Document available');
    }
    
    // Use AI-enhanced keywords if available, otherwise fall back to simple extraction
    let keywords: string[];
    if (state.marketKeywords?.ranked) {
      // Use AI-enhanced keywords for better news relevance
      keywords = state.marketKeywords.ranked
        .slice(0, 8) // Use top 8 keywords for better search precision
        .map(rk => rk.keyword);
      
      logger.info({
        agentName: 'market_microstructure_agent',
        keywordSource: 'ai-enhanced',
        keywordCount: keywords.length,
        topKeywords: keywords.slice(0, 5)
      }, 'Using AI-enhanced keywords for news search');
    } else {
      // Fallback to simple extraction
      keywords = utils.extractKeywords(`${state.mbd.question} ${state.mbd.resolutionCriteria || ''}`);
      
      logger.warn({
        agentName: 'market_microstructure_agent',
        keywordSource: 'fallback',
        keywordCount: keywords.length
      }, 'Using fallback keyword extraction - AI keywords not available');
    }
    
    // Fetch market-specific news
    const marketNews = await newsTools.fetchMarketNews({
      query: keywords.slice(0, 5).join(' OR '),
      size: 10, // Reduced for free tier
      removeDuplicates: true,
      sort: 'relevancy',
      countries: ['us']
    });
    
    // Convert to legacy format
    const legacyNewsFormat = marketNews.map((article: any) => ({
      title: article.title,
      source: article.source.name,
      publishedAt: new Date(article.metadata.publishedAt).getTime(),
      url: article.url,
      summary: article.content.description || article.content.fullContent || article.title,
      sentiment: article.ai?.sentiment || 'neutral',
      relevanceScore: 0.8,
    }));
    
    // Update state with market news
    const enhancedState = {
      ...state,
      externalData: {
        ...state.externalData,
        news: legacyNewsFormat,
        dataFreshness: state.externalData?.dataFreshness || {}
      },
    };
    
    // Import and use the original market microstructure agent logic
    const { createAgentNodes } = await import('../nodes/agents.js');
    const agents = createAgentNodes(factory['config']);
    
    return await agents.marketMicrostructureAgent(enhancedState);
  });
}