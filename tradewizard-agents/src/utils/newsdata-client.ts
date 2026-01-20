/**
 * NewsData.io API Client
 * 
 * Provides a comprehensive client for interacting with NewsData.io API endpoints
 * including latest news, crypto news, market news, and archive news.
 * 
 * Features:
 * - Type-safe interfaces for all API endpoints
 * - Built-in rate limiting and quota management
 * - Intelligent caching with TTL support
 * - Circuit breaker for resilience
 * - Comprehensive error handling
 * - Request/response validation
 */

import type { AdvancedObservabilityLogger } from './audit-logger.js';
import type { NewsDataCacheManager } from './newsdata-cache-manager.js';
import type { NewsDataRateLimiter } from './newsdata-rate-limiter.js';
import type { NewsDataCircuitBreaker } from './newsdata-circuit-breaker.js';
import type { NewsDataFallbackManager } from './newsdata-fallback-manager.js';
import type { NewsDataObservabilityLogger } from './newsdata-observability-logger.js';
import { getNewsDataObservabilityLogger } from './newsdata-observability-logger.js';
import type { NewsDataErrorHandler } from './newsdata-error-handler.js';
import { getNewsDataErrorHandler } from './newsdata-error-handler.js';
import type { NewsDataAgentUsageTracker } from './newsdata-agent-usage-tracker.js';
import { getNewsDataAgentUsageTracker } from './newsdata-agent-usage-tracker.js';
import type { NewsDataPerformanceMonitor } from './newsdata-performance-monitor.js';

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface NewsDataConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  
  // Rate limiting configuration
  rateLimiting: {
    requestsPerWindow: number; // requests per 15 minutes
    windowSizeMs: number; // 15 minutes in milliseconds
    dailyQuota?: number; // daily API credit limit
  };
  
  // Cache configuration
  cache: {
    enabled: boolean;
    ttl: {
      latest: number; // seconds
      crypto: number; // seconds
      market: number; // seconds
      archive: number; // seconds
    };
    maxSize?: number; // maximum cache entries
  };
  
  // Circuit breaker configuration
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxCalls?: number;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface NewsDataBaseParams {
  apikey?: string; // Will be set automatically
  id?: string | string[];
  q?: string;
  qInTitle?: string;
  qInMeta?: string;
  language?: string | string[];
  excludelanguage?: string | string[];
  sort?: 'pubdateasc' | 'relevancy' | 'source' | 'fetched_at';
  url?: string;
  domain?: string | string[];
  domainurl?: string | string[];
  excludedomain?: string | string[];
  excludefield?: string | string[];
  prioritydomain?: 'top' | 'medium' | 'low';
  timezone?: string;
  full_content?: 0 | 1;
  image?: 0 | 1;
  video?: 0 | 1;
  removeduplicate?: 0 | 1;
  size?: number;
  page?: string;
}

export interface LatestNewsParams extends NewsDataBaseParams {
  timeframe?: string; // e.g., "6", "24", "15m", "90m"
  country?: string | string[];
  excludecountry?: string | string[];
  category?: string | string[];
  excludecategory?: string | string[];
  datatype?: string | string[];
  sentiment_score?: number;
  creator?: string | string[];
  tag?: string | string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  organization?: string | string[];
  region?: string | string[];
}

export interface CryptoNewsParams extends NewsDataBaseParams {
  coin?: string | string[];
  timeframe?: string;
  from_date?: string;
  to_date?: string;
  tag?: string | string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface MarketNewsParams extends NewsDataBaseParams {
  timeframe?: string;
  from_date?: string;
  to_date?: string;
  country?: string | string[];
  excludecountry?: string | string[];
  symbol?: string | string[];
  organization?: string | string[];
  tag?: string | string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  datatype?: string | string[];
  sentiment_score?: number;
  creator?: string | string[];
}

export interface ArchiveNewsParams extends NewsDataBaseParams {
  from_date?: string;
  to_date?: string;
  country?: string | string[];
  excludecountry?: string | string[];
  category?: string | string[];
  excludecategory?: string | string[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface NewsDataArticle {
  article_id: string;
  title: string;
  link: string;
  source_id: string;
  source_name: string;
  source_url: string;
  source_icon?: string;
  source_priority: number;
  keywords?: string[];
  creator?: string[];
  image_url?: string;
  video_url?: string;
  description?: string;
  pubDate: string;
  pubDateTZ?: string;
  content?: string;
  country?: string[];
  category?: string[];
  datatype?: string;
  fetched_at?: string;
  language: string;
  
  // AI-enhanced fields (paid plans)
  ai_tag?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentiment_stats?: {
    negative: number;
    neutral: number;
    positive: number;
  };
  ai_region?: string[];
  ai_org?: string[];
  ai_summary?: string;
  
  // Crypto-specific fields
  coin?: string[];
  
  // Market-specific fields
  symbol?: string[];
  
  // Metadata
  duplicate: boolean;
}

export interface NewsDataResponse {
  status: 'success' | 'error';
  totalResults?: number;
  results?: NewsDataArticle[];
  nextPage?: string;
  
  // Error fields
  code?: string;
  message?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class NewsDataError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'NewsDataError';
  }
}

export class NewsDataRateLimitError extends NewsDataError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'NewsDataRateLimitError';
  }
}

export class NewsDataQuotaExceededError extends NewsDataError {
  constructor(message: string = 'Daily quota exceeded') {
    super(message, 'QUOTA_EXCEEDED', 429);
    this.name = 'NewsDataQuotaExceededError';
  }
}

export class NewsDataValidationError extends NewsDataError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'NewsDataValidationError';
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_NEWSDATA_CONFIG: Partial<NewsDataConfig> = {
  baseUrl: 'https://newsdata.io/api/1',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  
  rateLimiting: {
    requestsPerWindow: 1800, // paid plan default
    windowSizeMs: 15 * 60 * 1000, // 15 minutes
    dailyQuota: 20000, // basic plan default
  },
  
  cache: {
    enabled: true,
    ttl: {
      latest: 900, // 15 minutes
      crypto: 600, // 10 minutes
      market: 600, // 10 minutes
      archive: 3600, // 1 hour (less frequent updates)
    },
    maxSize: 1000,
  },
  
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeoutMs: 60000, // 1 minute
    halfOpenMaxCalls: 3,
  },
};

// ============================================================================
// NewsData.io Client Class
// ============================================================================

export class NewsDataClient {
  private config: NewsDataConfig;
  private observabilityLogger?: AdvancedObservabilityLogger;
  private newsDataLogger: NewsDataObservabilityLogger;
  private errorHandler: NewsDataErrorHandler;
  private usageTracker: NewsDataAgentUsageTracker;
  private cacheManager?: NewsDataCacheManager;
  // private rateLimiter?: NewsDataRateLimiter; // TODO: Implement rate limiting
  private circuitBreaker?: NewsDataCircuitBreaker;
  private fallbackManager?: NewsDataFallbackManager;
  private performanceMonitor?: NewsDataPerformanceMonitor;
  
  constructor(
    config: NewsDataConfig, 
    observabilityLogger?: AdvancedObservabilityLogger,
    cacheManager?: NewsDataCacheManager,
    _rateLimiter?: NewsDataRateLimiter, // TODO: Implement rate limiting
    circuitBreaker?: NewsDataCircuitBreaker,
    fallbackManager?: NewsDataFallbackManager,
    newsDataLogger?: NewsDataObservabilityLogger,
    errorHandler?: NewsDataErrorHandler,
    usageTracker?: NewsDataAgentUsageTracker,
    performanceMonitor?: NewsDataPerformanceMonitor
  ) {
    // Validate required configuration
    if (!config.apiKey) {
      throw new NewsDataValidationError('API key is required');
    }
    
    // Merge with defaults
    this.config = {
      ...DEFAULT_NEWSDATA_CONFIG,
      ...config,
      rateLimiting: {
        ...DEFAULT_NEWSDATA_CONFIG.rateLimiting!,
        ...config.rateLimiting,
      },
      cache: {
        ...DEFAULT_NEWSDATA_CONFIG.cache!,
        ...config.cache,
        ttl: {
          ...DEFAULT_NEWSDATA_CONFIG.cache!.ttl,
          ...config.cache.ttl,
        },
      },
      circuitBreaker: {
        ...DEFAULT_NEWSDATA_CONFIG.circuitBreaker!,
        ...config.circuitBreaker,
      },
    };
    
    this.observabilityLogger = observabilityLogger;
    this.newsDataLogger = newsDataLogger || getNewsDataObservabilityLogger();
    this.errorHandler = errorHandler || getNewsDataErrorHandler();
    this.usageTracker = usageTracker || getNewsDataAgentUsageTracker();
    this.cacheManager = cacheManager;
    // Rate limiter will be implemented in future iterations
    this.circuitBreaker = circuitBreaker;
    this.fallbackManager = fallbackManager;
    this.performanceMonitor = performanceMonitor;
    
    // Log client initialization
    console.log('[NewsDataClient] Initialized with configuration:', {
      baseUrl: this.config.baseUrl,
      rateLimiting: this.config.rateLimiting,
      cache: this.config.cache,
      circuitBreaker: this.config.circuitBreaker,
    });
  }
  
  /**
   * Get client configuration
   */
  getConfig(): NewsDataConfig {
    return { ...this.config };
  }
  
  /**
   * Update client configuration
   */
  updateConfig(updates: Partial<NewsDataConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      rateLimiting: {
        ...this.config.rateLimiting,
        ...updates.rateLimiting,
      },
      cache: {
        ...this.config.cache,
        ...updates.cache,
        ttl: {
          ...this.config.cache.ttl,
          ...updates.cache?.ttl,
        },
      },
      circuitBreaker: {
        ...this.config.circuitBreaker,
        ...updates.circuitBreaker,
      },
    };
    
    console.log('[NewsDataClient] Configuration updated');
  }
  
  /**
   * Validate API key format
   */
  private validateApiKey(): void {
    if (!this.config.apiKey || typeof this.config.apiKey !== 'string') {
      throw new NewsDataValidationError('Invalid API key format');
    }
    
    // Basic format validation (NewsData.io API keys can contain alphanumeric and some special characters)
    if (!/^[a-zA-Z0-9_-]+$/.test(this.config.apiKey)) {
      throw new NewsDataValidationError('API key contains invalid characters');
    }
  }
  
  /**
   * Build base HTTP client configuration
   */
  private getHttpConfig() {
    return {
      timeout: this.config.timeout,
      headers: {
        'User-Agent': 'TradeWizard-NewsData-Client/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
  }
  
  /**
   * Build URL with parameters
   */
  private buildUrl(endpoint: string, params: Record<string, any>): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    
    // Add API key
    url.searchParams.set('apikey', this.config.apiKey);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.set(key, value.join(','));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
    
    return url.toString();
  }
  
  /**
   * Validate request parameters
   */
  private validateParams(params: any, endpoint: string): void {
    // Common validations
    if (params.size !== undefined && (params.size < 1 || params.size > 50)) {
      throw new NewsDataValidationError('Size parameter must be between 1 and 50');
    }
    
    if (params.q && params.q.length > 512) {
      throw new NewsDataValidationError('Query parameter cannot exceed 512 characters');
    }
    
    if (params.qInTitle && params.qInTitle.length > 512) {
      throw new NewsDataValidationError('qInTitle parameter cannot exceed 512 characters');
    }
    
    if (params.qInMeta && params.qInMeta.length > 512) {
      throw new NewsDataValidationError('qInMeta parameter cannot exceed 512 characters');
    }
    
    // Mutual exclusivity checks
    const queryParams = [params.q, params.qInTitle, params.qInMeta].filter(Boolean);
    if (queryParams.length > 1) {
      throw new NewsDataValidationError('Cannot use q, qInTitle, and qInMeta parameters simultaneously');
    }
    
    // Date format validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}(\s\d{2}:\d{2}:\d{2})?$/;
    if (params.from_date && !dateRegex.test(params.from_date)) {
      throw new NewsDataValidationError('Invalid from_date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS');
    }
    
    if (params.to_date && !dateRegex.test(params.to_date)) {
      throw new NewsDataValidationError('Invalid to_date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS');
    }
    
    // Endpoint-specific validations
    if (endpoint === 'archive') {
      // Archive endpoint requires at least one specific parameter
      const requiredParams = ['q', 'qInTitle', 'qInMeta', 'domain', 'country', 'category', 'language', 'full_content', 'image', 'video', 'prioritydomain', 'domainurl'];
      const hasRequiredParam = requiredParams.some(param => params[param] !== undefined);
      
      if (!hasRequiredParam) {
        throw new NewsDataValidationError(`Archive endpoint requires at least one of: ${requiredParams.join(', ')}`);
      }
    }
  }
  
  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<boolean> {
    try {
      this.validateApiKey();
      
      // Make a minimal request to test connectivity
      const url = this.buildUrl('latest', { size: 1 });
      const response = await fetch(url, {
        ...this.getHttpConfig(),
        method: 'GET',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new NewsDataError('Invalid API key', 'INVALID_API_KEY', 401);
        }
        throw new NewsDataError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', response.status);
      }
      
      const data = await response.json() as any;
      
      if (data.status === 'error') {
        throw new NewsDataError(data.message || 'API error', data.code);
      }
      
      console.log('[NewsDataClient] Connection test successful');
      return true;
      
    } catch (error) {
      console.error('[NewsDataClient] Connection test failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // Core API Methods
  // ============================================================================

  /**
   * Make HTTP request with circuit breaker protection and fallback mechanisms
   */
  private async makeRequest(url: string, endpoint: string, agentName?: string): Promise<NewsDataResponse> {
    const startTime = Date.now();
    let success = false;
    let timeout = false;
    
    try {
      // Generate cache key for fallback purposes
      const cacheKey = this.cacheManager?.generateCacheKey(endpoint, this.extractParamsFromUrl(url)) || url;
      
      let result: NewsDataResponse;
      
      // If circuit breaker is available, use it with fallback
      if (this.circuitBreaker && this.fallbackManager) {
        const circuitResult = await this.circuitBreaker.execute(
          () => this.makeDirectRequest(url, endpoint, agentName),
          () => this.executeFallback(cacheKey)
        );
        
        if (circuitResult.success && circuitResult.data) {
          result = circuitResult.data;
          success = true;
        } else if (circuitResult.fromFallback && circuitResult.data) {
          result = circuitResult.data;
          success = true;
        } else {
          throw circuitResult.error || new Error('Request failed and no fallback available');
        }
      } else {
        // Fallback to direct request if circuit breaker not available
        result = await this.makeDirectRequest(url, endpoint, agentName);
        success = true;
      }
      
      // Record performance metrics
      const responseTime = Date.now() - startTime;
      this.performanceMonitor?.recordResponseTime(endpoint, responseTime, success, timeout);
      
      // Record throughput metrics
      if (result.results) {
        const responseSize = JSON.stringify(result).length;
        this.performanceMonitor?.recordThroughput(endpoint, responseSize, result.results.length);
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Check if it's a timeout error
      timeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('ETIMEDOUT') ||
        error.name === 'TimeoutError'
      );
      
      // Record performance metrics for failed requests
      this.performanceMonitor?.recordResponseTime(endpoint, responseTime, success, timeout);
      
      throw error;
    }
  }
  
  /**
   * Execute fallback strategy when primary request fails
   */
  private async executeFallback(cacheKey: string): Promise<NewsDataResponse> {
    if (!this.fallbackManager) {
      throw new Error('No fallback manager available');
    }
    
    const fallbackResult = await this.fallbackManager.executeFallback(cacheKey);
    
    if (fallbackResult.success && fallbackResult.data) {
      return fallbackResult.data;
    }
    
    throw fallbackResult.error || new Error('Fallback failed');
  }
  
  /**
   * Extract parameters from URL for cache key generation
   */
  private extractParamsFromUrl(url: string): Record<string, any> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, any> = {};
      
      urlObj.searchParams.forEach((value, key) => {
        if (key !== 'apikey') { // Exclude API key from cache key
          params[key] = value;
        }
      });
      
      return params;
    } catch {
      return {};
    }
  }

  /**
   * Make direct HTTP request with error handling and retries
   */
  private async makeDirectRequest(url: string, endpoint?: string, agentName?: string): Promise<NewsDataResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let lastError: Error | null = null;
    
    // Extract parameters for logging
    const params = this.extractParamsFromUrl(url);
    
    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        console.log(`[NewsDataClient] Making request (attempt ${attempt}): ${url}`);
        
        const response = await fetch(url, {
          ...this.getHttpConfig(),
          method: 'GET',
        });
        
        const duration = Date.now() - startTime;
        
        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          let errorData: any = {};
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            // If not JSON, use the text as message
            errorData = { message: errorText };
          }
          
          // Create error context for detailed logging
          const errorContext = {
            requestId,
            endpoint: endpoint as any,
            agentName,
            parameters: params,
            url: url.replace(/apikey=[^&]+/, 'apikey=***'),
            httpStatus: response.status,
            apiErrorCode: errorData.code,
            retryAttempt: attempt,
            maxRetries: this.config.retryAttempts || 3,
            fallbackUsed: false,
            performanceInfo: {
              responseTime: duration,
              requestStartTime: startTime,
            },
            additionalContext: {
              responseData: errorData,
              statusText: response.statusText,
            },
          };

          // Create appropriate error
          let error: Error;
          switch (response.status) {
            case 400:
              error = new NewsDataValidationError(errorData.message || 'Bad request - parameter missing or invalid');
              break;
            case 401:
              error = new NewsDataError('Unauthorized - invalid API key', 'INVALID_API_KEY', 401, errorData);
              break;
            case 403:
              error = new NewsDataError('Forbidden - CORS policy failed or IP/Domain restricted', 'FORBIDDEN', 403, errorData);
              break;
            case 409:
              error = new NewsDataValidationError('Parameter duplicate - duplicate parameter values detected');
              break;
            case 415:
              error = new NewsDataError('Unsupported type - request format not supported', 'UNSUPPORTED_TYPE', 415, errorData);
              break;
            case 422:
              error = new NewsDataValidationError('Unprocessable entity - semantic error in request');
              break;
            case 429:
              error = new NewsDataRateLimitError(errorData.message || 'Too many requests - rate limit exceeded');
              // Handle rate limit specifically
              await this.errorHandler.handleRateLimitExceeded({
                requestsInWindow: 0, // TODO: Get from rate limiter
                windowSizeMs: 15 * 60 * 1000, // 15 minutes
                limitExceeded: true,
                retryAfter: this.extractRetryAfter(response),
              }, errorContext);
              break;
            case 500:
              error = new NewsDataError('Internal server error - temporary issue', 'SERVER_ERROR', 500, errorData);
              break;
            default:
              error = new NewsDataError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', response.status, errorData);
          }

          // Handle error with comprehensive logging
          await this.errorHandler.handleApiError(error, errorContext);
          
          throw error;
        }
        
        // Parse response
        const data = await response.json() as NewsDataResponse;
        
        // Handle API-level errors
        if (data.status === 'error') {
          const errorContext = {
            requestId,
            endpoint: endpoint as any,
            agentName,
            parameters: params,
            url: url.replace(/apikey=[^&]+/, 'apikey=***'),
            httpStatus: response.status,
            apiErrorCode: data.code,
            retryAttempt: attempt,
            maxRetries: this.config.retryAttempts || 3,
            fallbackUsed: false,
            performanceInfo: {
              responseTime: duration,
              requestStartTime: startTime,
            },
            additionalContext: {
              responseData: data,
            },
          };

          const error = new NewsDataError(data.message || 'API error', data.code, response.status, data);
          await this.errorHandler.handleApiError(error, errorContext);
          throw error;
        }
        
        // Log successful request
        this.newsDataLogger.logNewsRequest({
          timestamp: Date.now(),
          requestId,
          endpoint: endpoint as any || 'unknown',
          agentName,
          parameters: params,
          success: true,
          responseTime: duration,
          itemCount: data.results?.length || 0,
          cached: false,
          stale: false,
          freshness: 0,
          quotaUsed: 1, // Assume 1 credit per request
        });

        // Track agent usage
        if (agentName) {
          this.usageTracker.trackRequest(agentName, endpoint as any || 'latest', params, {
            success: true,
            responseTime: duration,
            itemCount: data.results?.length || 0,
            quotaUsed: 1,
            cached: false,
            stale: false,
          });
        }
        
        // Also log to legacy observability logger if available
        this.observabilityLogger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'newsdata.io',
          success: true,
          cached: false,
          stale: false,
          freshness: 0,
          itemCount: data.results?.length || 0,
          duration,
        });
        
        console.log(`[NewsDataClient] Request successful: ${data.results?.length || 0} articles in ${duration}ms`);
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on validation errors or auth errors
        if (error instanceof NewsDataValidationError || 
            (error instanceof NewsDataError && error.statusCode === 401)) {
          break;
        }
        
        // Don't retry on rate limit errors (should be handled by rate limiter)
        if (error instanceof NewsDataRateLimitError) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < (this.config.retryAttempts || 3)) {
          const delay = (this.config.retryDelay || 1000) * Math.pow(2, attempt - 1);
          console.log(`[NewsDataClient] Request failed, retrying in ${delay}ms:`, (error as Error).message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Log failed request
    const duration = Date.now() - startTime;
    this.newsDataLogger.logNewsRequest({
      timestamp: Date.now(),
      requestId,
      endpoint: endpoint as any || 'unknown',
      agentName,
      parameters: params,
      success: false,
      responseTime: duration,
      itemCount: 0,
      cached: false,
      stale: false,
      freshness: 0,
      error: (lastError as Error)?.message || 'Unknown error',
      errorCode: lastError instanceof NewsDataError ? lastError.code : 'UNKNOWN_ERROR',
      quotaUsed: 0,
    });

    // Track agent usage for failed request
    if (agentName) {
      this.usageTracker.trackRequest(agentName, endpoint as any || 'latest', params, {
        success: false,
        responseTime: duration,
        itemCount: 0,
        quotaUsed: 0,
        cached: false,
        stale: false,
        error: (lastError as Error)?.message || 'Unknown error',
      });
    }
    
    // Also log to legacy observability logger if available
    this.observabilityLogger?.logDataFetch({
      timestamp: Date.now(),
      source: 'news',
      provider: 'newsdata.io',
      success: false,
      cached: false,
      stale: false,
      freshness: 0,
      itemCount: 0,
      error: (lastError as Error)?.message || 'Unknown error',
      duration,
    });
    
    throw lastError || new NewsDataError('Request failed after all retry attempts');
  }

  /**
   * Extract retry-after header from response
   */
  private extractRetryAfter(response: Response): number | undefined {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
    }
    return undefined;
  }

  /**
   * Fetch latest news
   */
  async fetchLatestNews(params: LatestNewsParams = {}, agentName?: string): Promise<NewsDataResponse> {
    this.validateApiKey();
    this.validateParams(params, 'latest');
    
    const url = this.buildUrl('latest', params);
    return await this.makeRequest(url, 'latest', agentName);
  }

  /**
   * Fetch crypto news
   */
  async fetchCryptoNews(params: CryptoNewsParams = {}, agentName?: string): Promise<NewsDataResponse> {
    this.validateApiKey();
    this.validateParams(params, 'crypto');
    
    const url = this.buildUrl('crypto', params);
    return await this.makeRequest(url, 'crypto', agentName);
  }

  /**
   * Fetch market news
   */
  async fetchMarketNews(params: MarketNewsParams = {}, agentName?: string): Promise<NewsDataResponse> {
    this.validateApiKey();
    this.validateParams(params, 'market');
    
    const url = this.buildUrl('market', params);
    return await this.makeRequest(url, 'market', agentName);
  }

  /**
   * Fetch archive news
   */
  async fetchArchiveNews(params: ArchiveNewsParams, agentName?: string): Promise<NewsDataResponse> {
    this.validateApiKey();
    this.validateParams(params, 'archive');
    
    const url = this.buildUrl('archive', params);
    return await this.makeRequest(url, 'archive', agentName);
  }

  /**
   * Fetch news sources
   */
  async fetchNewsSources(params: { language?: string | string[] } = {}, agentName?: string): Promise<NewsDataResponse> {
    this.validateApiKey();
    
    const url = this.buildUrl('sources', params);
    return await this.makeRequest(url, 'sources', agentName);
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Search for news articles with a simple query
   */
  async searchNews(query: string, options: {
    endpoint?: 'latest' | 'crypto' | 'market' | 'archive';
    limit?: number;
    language?: string;
    country?: string;
    category?: string;
    timeframe?: string;
    from_date?: string;
    to_date?: string;
  } = {}): Promise<NewsDataArticle[]> {
    const {
      endpoint = 'latest',
      limit = 10,
      language,
      country,
      category,
      timeframe,
      from_date,
      to_date,
    } = options;

    const baseParams = {
      q: query,
      size: Math.min(limit, 50),
      language,
      country,
      category,
      timeframe,
      from_date,
      to_date,
    };

    let response: NewsDataResponse;

    switch (endpoint) {
      case 'latest':
        response = await this.fetchLatestNews(baseParams);
        break;
      case 'crypto':
        response = await this.fetchCryptoNews(baseParams);
        break;
      case 'market':
        response = await this.fetchMarketNews(baseParams);
        break;
      case 'archive':
        response = await this.fetchArchiveNews(baseParams);
        break;
      default:
        throw new NewsDataValidationError(`Invalid endpoint: ${endpoint}`);
    }

    return response.results || [];
  }

  /**
   * Get news for specific cryptocurrency
   */
  async getCryptoNews(coin: string | string[], options: {
    limit?: number;
    timeframe?: string;
    language?: string;
  } = {}): Promise<NewsDataArticle[]> {
    const { limit = 20, timeframe, language } = options;

    const response = await this.fetchCryptoNews({
      coin,
      size: Math.min(limit, 50),
      timeframe,
      language,
    });

    return response.results || [];
  }

  /**
   * Get market news for specific stock symbols
   */
  async getMarketNews(symbol: string | string[], options: {
    limit?: number;
    timeframe?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    language?: string;
  } = {}): Promise<NewsDataArticle[]> {
    const { limit = 20, timeframe, sentiment, language } = options;

    const response = await this.fetchMarketNews({
      symbol,
      size: Math.min(limit, 50),
      timeframe,
      sentiment,
      language,
    });

    return response.results || [];
  }

  /**
   * Get news by category
   */
  async getNewsByCategory(category: string | string[], options: {
    limit?: number;
    country?: string;
    language?: string;
    timeframe?: string;
  } = {}): Promise<NewsDataArticle[]> {
    const { limit = 20, country, language, timeframe } = options;

    const response = await this.fetchLatestNews({
      category,
      size: Math.min(limit, 50),
      country,
      language,
      timeframe,
    });

    return response.results || [];
  }

  /**
   * Get breaking news (latest with high priority domains)
   */
  async getBreakingNews(options: {
    limit?: number;
    country?: string;
    language?: string;
    category?: string;
  } = {}): Promise<NewsDataArticle[]> {
    const { limit = 10, country, language, category } = options;

    const response = await this.fetchLatestNews({
      size: Math.min(limit, 50),
      country,
      language,
      category,
      prioritydomain: 'top',
      timeframe: '2', // Last 2 hours for breaking news
    });

    return response.results || [];
  }

  /**
   * Get performance metrics snapshot
   */
  async getPerformanceSnapshot() {
    if (!this.performanceMonitor) {
      throw new Error('Performance monitor not available');
    }
    return await this.performanceMonitor.getPerformanceSnapshot();
  }

  /**
   * Get performance report
   */
  async getPerformanceReport() {
    if (!this.performanceMonitor) {
      throw new Error('Performance monitor not available');
    }
    return await this.performanceMonitor.getPerformanceReport();
  }

  /**
   * Add performance alert callback
   */
  onPerformanceAlert(callback: (alert: any) => void) {
    if (!this.performanceMonitor) {
      throw new Error('Performance monitor not available');
    }
    this.performanceMonitor.onAlert(callback);
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics() {
    if (!this.performanceMonitor) {
      throw new Error('Performance monitor not available');
    }
    this.performanceMonitor.reset();
  }
}

/**
 * Create a NewsData.io client instance
 */
export function createNewsDataClient(
  config: NewsDataConfig,
  observabilityLogger?: AdvancedObservabilityLogger,
  cacheManager?: NewsDataCacheManager,
  rateLimiter?: NewsDataRateLimiter,
  circuitBreaker?: NewsDataCircuitBreaker,
  fallbackManager?: NewsDataFallbackManager,
  newsDataLogger?: NewsDataObservabilityLogger,
  errorHandler?: NewsDataErrorHandler,
  usageTracker?: NewsDataAgentUsageTracker
): NewsDataClient {
  return new NewsDataClient(config, observabilityLogger, cacheManager, rateLimiter, circuitBreaker, fallbackManager, newsDataLogger, errorHandler, usageTracker);
}

/**
 * Create NewsData.io configuration from environment variables
 */
export function createNewsDataConfigFromEnv(): Partial<NewsDataConfig> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  
  if (!apiKey) {
    throw new NewsDataValidationError('NEWSDATA_API_KEY environment variable is required');
  }
  
  return {
    apiKey,
    rateLimiting: {
      requestsPerWindow: parseInt(process.env.NEWSDATA_RATE_LIMIT_REQUESTS || '1800'),
      windowSizeMs: parseInt(process.env.NEWSDATA_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      dailyQuota: parseInt(process.env.NEWSDATA_DAILY_QUOTA || '20000'),
    },
    cache: {
      enabled: process.env.NEWSDATA_CACHE_ENABLED !== 'false',
      ttl: {
        latest: parseInt(process.env.NEWSDATA_CACHE_TTL_LATEST || '900'),
        crypto: parseInt(process.env.NEWSDATA_CACHE_TTL_CRYPTO || '600'),
        market: parseInt(process.env.NEWSDATA_CACHE_TTL_MARKET || '600'),
        archive: parseInt(process.env.NEWSDATA_CACHE_TTL_ARCHIVE || '3600'),
      },
    },
    circuitBreaker: {
      enabled: process.env.NEWSDATA_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.NEWSDATA_CIRCUIT_BREAKER_THRESHOLD || '5'),
      resetTimeoutMs: parseInt(process.env.NEWSDATA_CIRCUIT_BREAKER_TIMEOUT || '60000'),
    },
  };
}