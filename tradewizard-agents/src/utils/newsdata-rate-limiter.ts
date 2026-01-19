/**
 * NewsData.io Rate Limiter
 * 
 * Implements token bucket algorithm with configurable capacity and refill rate
 * for managing API quota across multiple endpoints and concurrent requests.
 * 
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Multiple buckets for different endpoints (latest, archive, crypto, market)
 * - Daily quota tracking and reset logic
 * - Concurrent request coordination
 * - Exponential backoff retry logic
 */

import type { AdvancedObservabilityLogger } from './audit-logger.js';

// ============================================================================
// Configuration Types
// ============================================================================

export interface TokenBucketConfig {
  capacity: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per second
  dailyQuota: number; // Daily API credit limit
  resetHour?: number; // Hour of day to reset (0-23, default: 0 for midnight UTC)
}

export interface RateLimiterConfig {
  buckets: {
    latest: TokenBucketConfig;
    archive: TokenBucketConfig;
    crypto: TokenBucketConfig;
    market: TokenBucketConfig;
  };
  
  // Global settings
  defaultRetryDelay: number; // Base delay for exponential backoff (ms)
  maxRetryAttempts: number; // Maximum retry attempts
  jitterFactor: number; // Jitter factor for backoff (0-1)
  
  // Coordination settings
  coordinationEnabled: boolean; // Enable multi-agent coordination
  coordinationWindow: number; // Time window for coordination (ms)
}

export interface RateLimitStatus {
  bucket: string;
  tokensAvailable: number;
  capacity: number;
  refillRate: number;
  dailyUsage: number;
  dailyQuota: number;
  quotaPercentage: number;
  nextRefillTime: number;
  nextResetTime: number;
  isThrottled: boolean;
}

export interface RequestResult {
  allowed: boolean;
  tokensConsumed: number;
  retryAfter?: number; // Milliseconds to wait before retry
  reason?: string;
}

// ============================================================================
// Token Bucket Implementation
// ============================================================================

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private dailyUsage: number;
  private lastReset: number;
  
  constructor(private config: TokenBucketConfig) {
    this.tokens = config.capacity;
    this.lastRefill = Date.now();
    this.dailyUsage = 0;
    this.lastReset = this.getResetTime();
  }
  
  /**
   * Get the next reset time based on configured hour
   */
  private getResetTime(): number {
    const now = new Date();
    const resetHour = this.config.resetHour || 0;
    
    const resetTime = new Date(now);
    resetTime.setUTCHours(resetHour, 0, 0, 0);
    
    // If reset time has passed today, set for tomorrow
    if (resetTime.getTime() <= now.getTime()) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    
    return resetTime.getTime();
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    
    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.config.refillRate;
      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
  
  /**
   * Check if daily quota needs reset
   */
  private checkDailyReset(): void {
    const now = Date.now();
    
    if (now >= this.lastReset) {
      this.dailyUsage = 0;
      this.lastReset = this.getResetTime();
    }
  }
  
  /**
   * Try to consume tokens from the bucket
   */
  tryConsume(tokens: number = 1): RequestResult {
    this.refill();
    this.checkDailyReset();
    
    // Check daily quota first
    if (this.dailyUsage + tokens > this.config.dailyQuota) {
      const timeUntilReset = this.lastReset - Date.now();
      return {
        allowed: false,
        tokensConsumed: 0,
        retryAfter: timeUntilReset,
        reason: 'Daily quota exceeded',
      };
    }
    
    // Check token availability
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      this.dailyUsage += tokens;
      
      return {
        allowed: true,
        tokensConsumed: tokens,
      };
    }
    
    // Calculate time until enough tokens are available
    const tokensNeeded = tokens - this.tokens;
    const timeToWait = (tokensNeeded / this.config.refillRate) * 1000; // Convert to ms
    
    return {
      allowed: false,
      tokensConsumed: 0,
      retryAfter: Math.ceil(timeToWait),
      reason: 'Insufficient tokens',
    };
  }
  
  /**
   * Get current bucket status
   */
  getStatus(): {
    tokensAvailable: number;
    capacity: number;
    refillRate: number;
    dailyUsage: number;
    dailyQuota: number;
    quotaPercentage: number;
    nextRefillTime: number;
    nextResetTime: number;
  } {
    this.refill();
    this.checkDailyReset();
    
    const quotaPercentage = (this.dailyUsage / this.config.dailyQuota) * 100;
    const nextRefillTime = this.tokens < this.config.capacity 
      ? Date.now() + (1000 / this.config.refillRate)
      : 0;
    
    return {
      tokensAvailable: Math.floor(this.tokens),
      capacity: this.config.capacity,
      refillRate: this.config.refillRate,
      dailyUsage: this.dailyUsage,
      dailyQuota: this.config.dailyQuota,
      quotaPercentage,
      nextRefillTime,
      nextResetTime: this.lastReset,
    };
  }
  
  /**
   * Reset bucket to full capacity (for testing)
   */
  reset(): void {
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
  }
  
  /**
   * Reset daily usage counter
   */
  resetDailyUsage(): void {
    this.dailyUsage = 0;
    // Set lastReset to the next reset time to prevent automatic reset
    this.lastReset = this.getResetTime();
  }
}

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

export class NewsDataRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private coordinationQueue: Map<string, number[]> = new Map(); // Track request timestamps per bucket
  private observabilityLogger?: AdvancedObservabilityLogger;
  
  constructor(
    private config: RateLimiterConfig,
    observabilityLogger?: AdvancedObservabilityLogger
  ) {
    this.observabilityLogger = observabilityLogger;
    
    // Initialize buckets
    Object.entries(config.buckets).forEach(([name, bucketConfig]) => {
      this.buckets.set(name, new TokenBucket(bucketConfig));
      this.coordinationQueue.set(name, []);
    });
    
    // Start coordination cleanup interval
    if (config.coordinationEnabled) {
      this.startCoordinationCleanup();
    }
    
    console.log('[NewsDataRateLimiter] Initialized with buckets:', Object.keys(config.buckets));
  }
  
  /**
   * Start periodic cleanup of coordination queue
   */
  private startCoordinationCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.coordinationWindow;
      
      this.coordinationQueue.forEach((timestamps, bucket) => {
        const filtered = timestamps.filter(ts => ts > cutoff);
        this.coordinationQueue.set(bucket, filtered);
      });
    }, this.config.coordinationWindow / 2); // Clean up twice per window
  }
  
  /**
   * Check coordination queue for concurrent requests
   */
  private checkCoordination(bucket: string): boolean {
    if (!this.config.coordinationEnabled) {
      return true;
    }
    
    const now = Date.now();
    const cutoff = now - this.config.coordinationWindow;
    const timestamps = this.coordinationQueue.get(bucket) || [];
    
    // Filter recent requests
    const recentRequests = timestamps.filter(ts => ts > cutoff);
    
    // Update queue
    this.coordinationQueue.set(bucket, recentRequests);
    
    // Check if too many concurrent requests
    const maxConcurrent = Math.max(1, Math.floor(this.config.buckets[bucket as keyof typeof this.config.buckets]?.capacity / 10));
    
    if (recentRequests.length >= maxConcurrent) {
      return false;
    }
    
    // Add current request to queue
    recentRequests.push(now);
    this.coordinationQueue.set(bucket, recentRequests);
    
    return true;
  }
  
  /**
   * Try to consume tokens from specified bucket
   */
  async tryConsume(bucket: string, tokens: number = 1): Promise<RequestResult> {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      throw new Error(`Unknown bucket: ${bucket}`);
    }
    
    // Check coordination first
    if (!this.checkCoordination(bucket)) {
      return {
        allowed: false,
        tokensConsumed: 0,
        retryAfter: Math.random() * 1000 + 500, // Random delay 500-1500ms
        reason: 'Too many concurrent requests',
      };
    }
    
    const result = tokenBucket.tryConsume(tokens);
    
    // Log rate limiting events
    if (!result.allowed) {
      this.observabilityLogger?.logDataFetch({
        timestamp: Date.now(),
        source: 'news',
        provider: 'newsdata.io',
        success: false,
        cached: false,
        stale: false,
        freshness: 0,
        itemCount: 0,
        error: `Rate limited on bucket ${bucket}: ${result.reason}`,
        duration: result.retryAfter || 0,
      });
      
      console.log(`[NewsDataRateLimiter] Rate limited on bucket ${bucket}: ${result.reason}`);
    }
    
    return result;
  }
  
  /**
   * Get current token count for bucket
   */
  getTokens(bucket: string): number {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      throw new Error(`Unknown bucket: ${bucket}`);
    }
    
    return tokenBucket.getStatus().tokensAvailable;
  }
  
  /**
   * Check if request would be allowed without consuming tokens
   */
  canMakeRequest(bucket: string, tokens: number = 1): boolean {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      return false;
    }
    
    const status = tokenBucket.getStatus();
    
    // Check daily quota
    if (status.dailyUsage + tokens > status.dailyQuota) {
      return false;
    }
    
    // Check token availability
    return status.tokensAvailable >= tokens;
  }
  
  /**
   * Get time until next token available
   */
  getTimeUntilToken(bucket: string): number {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      return 0;
    }
    
    const status = tokenBucket.getStatus();
    
    if (status.tokensAvailable > 0) {
      return 0;
    }
    
    // Calculate time for next token
    return Math.ceil(1000 / status.refillRate);
  }
  
  /**
   * Reset bucket to full capacity
   */
  resetBucket(bucket: string): void {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      throw new Error(`Unknown bucket: ${bucket}`);
    }
    
    tokenBucket.reset();
    
    // Also reset coordination queue for this bucket
    this.coordinationQueue.set(bucket, []);
    
    console.log(`[NewsDataRateLimiter] Reset bucket: ${bucket}`);
  }
  
  /**
   * Reset daily usage for bucket
   */
  resetDailyUsage(bucket: string): void {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      throw new Error(`Unknown bucket: ${bucket}`);
    }
    
    tokenBucket.resetDailyUsage();
    
    // Also reset coordination queue for this bucket
    this.coordinationQueue.set(bucket, []);
    
    console.log(`[NewsDataRateLimiter] Reset daily usage for bucket: ${bucket}`);
  }
  
  /**
   * Reset all buckets
   */
  resetAllBuckets(): void {
    this.buckets.forEach((bucket) => {
      bucket.reset();
    });
    
    console.log('[NewsDataRateLimiter] Reset all buckets');
  }
  
  /**
   * Reset daily usage for all buckets
   */
  resetAllDailyUsage(): void {
    this.buckets.forEach((bucket) => {
      bucket.resetDailyUsage();
    });
    
    console.log('[NewsDataRateLimiter] Reset daily usage for all buckets');
  }
  
  /**
   * Get status for specific bucket
   */
  getBucketStatus(bucket: string): RateLimitStatus {
    const tokenBucket = this.buckets.get(bucket);
    
    if (!tokenBucket) {
      throw new Error(`Unknown bucket: ${bucket}`);
    }
    
    const status = tokenBucket.getStatus();
    
    return {
      bucket,
      tokensAvailable: status.tokensAvailable,
      capacity: status.capacity,
      refillRate: status.refillRate,
      dailyUsage: status.dailyUsage,
      dailyQuota: status.dailyQuota,
      quotaPercentage: status.quotaPercentage,
      nextRefillTime: status.nextRefillTime,
      nextResetTime: status.nextResetTime,
      isThrottled: status.quotaPercentage > 80, // Throttle when over 80% quota
    };
  }
  
  /**
   * Get status for all buckets
   */
  getAllBucketStatus(): RateLimitStatus[] {
    return Array.from(this.buckets.keys()).map(bucket => this.getBucketStatus(bucket));
  }
  
  /**
   * Implement exponential backoff with jitter
   */
  calculateBackoffDelay(attempt: number, baseDelay?: number): number {
    const delay = baseDelay || this.config.defaultRetryDelay;
    const exponentialDelay = delay * Math.pow(2, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    
    return Math.floor(exponentialDelay + jitter);
  }
  
  /**
   * Execute function with rate limiting and retry logic
   */
  async executeWithRateLimit<T>(
    bucket: string,
    fn: () => Promise<T>,
    options: {
      tokens?: number;
      maxRetries?: number;
      onRetry?: (attempt: number, delay: number, reason: string) => void;
    } = {}
  ): Promise<T> {
    const {
      tokens = 1,
      maxRetries = this.config.maxRetryAttempts,
      onRetry,
    } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // Try to consume tokens
        const result = await this.tryConsume(bucket, tokens);
        
        if (result.allowed) {
          // Execute function
          return await fn();
        }
        
        // Rate limited - calculate retry delay
        if (attempt <= maxRetries) {
          const retryDelay = result.retryAfter || this.calculateBackoffDelay(attempt);
          
          onRetry?.(attempt, retryDelay, result.reason || 'Rate limited');
          
          console.log(`[NewsDataRateLimiter] Rate limited, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${result.reason}`);
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on non-rate-limit errors
        if (attempt <= maxRetries && this.isRetryableError(lastError)) {
          const retryDelay = this.calculateBackoffDelay(attempt);
          
          onRetry?.(attempt, retryDelay, lastError.message);
          
          console.log(`[NewsDataRateLimiter] Error occurred, retrying in ${retryDelay}ms (attempt ${attempt}/${maxRetries}):`, lastError.message);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Maximum retry attempts exceeded');
  }
  
  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Retry on network errors, timeouts, and server errors
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /500/,
      /502/,
      /503/,
      /504/,
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  buckets: {
    latest: {
      capacity: 30, // 30 requests burst
      refillRate: 2, // 2 requests per second (7200/hour)
      dailyQuota: 5000, // 5000 requests per day
      resetHour: 0, // Reset at midnight UTC
    },
    archive: {
      capacity: 10, // 10 requests burst
      refillRate: 0.5, // 0.5 requests per second (1800/hour)
      dailyQuota: 1000, // 1000 requests per day
      resetHour: 0,
    },
    crypto: {
      capacity: 20, // 20 requests burst
      refillRate: 1, // 1 request per second (3600/hour)
      dailyQuota: 3000, // 3000 requests per day
      resetHour: 0,
    },
    market: {
      capacity: 20, // 20 requests burst
      refillRate: 1, // 1 request per second (3600/hour)
      dailyQuota: 3000, // 3000 requests per day
      resetHour: 0,
    },
  },
  
  defaultRetryDelay: 1000, // 1 second base delay
  maxRetryAttempts: 3,
  jitterFactor: 0.1, // 10% jitter
  
  coordinationEnabled: true,
  coordinationWindow: 5000, // 5 second window
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a NewsData rate limiter instance
 */
export function createNewsDataRateLimiter(
  config?: Partial<RateLimiterConfig>,
  observabilityLogger?: AdvancedObservabilityLogger
): NewsDataRateLimiter {
  const mergedConfig: RateLimiterConfig = {
    ...DEFAULT_RATE_LIMITER_CONFIG,
    ...config,
    buckets: {
      ...DEFAULT_RATE_LIMITER_CONFIG.buckets,
      ...config?.buckets,
    },
  };
  
  return new NewsDataRateLimiter(mergedConfig, observabilityLogger);
}

/**
 * Create rate limiter configuration from environment variables
 */
export function createRateLimiterConfigFromEnv(): Partial<RateLimiterConfig> {
  return {
    buckets: {
      latest: {
        capacity: parseInt(process.env.NEWSDATA_RATE_LIMIT_LATEST_CAPACITY || '30'),
        refillRate: parseFloat(process.env.NEWSDATA_RATE_LIMIT_LATEST_REFILL || '2'),
        dailyQuota: parseInt(process.env.NEWSDATA_RATE_LIMIT_LATEST_QUOTA || '5000'),
        resetHour: parseInt(process.env.NEWSDATA_RATE_LIMIT_RESET_HOUR || '0'),
      },
      archive: {
        capacity: parseInt(process.env.NEWSDATA_RATE_LIMIT_ARCHIVE_CAPACITY || '10'),
        refillRate: parseFloat(process.env.NEWSDATA_RATE_LIMIT_ARCHIVE_REFILL || '0.5'),
        dailyQuota: parseInt(process.env.NEWSDATA_RATE_LIMIT_ARCHIVE_QUOTA || '1000'),
        resetHour: parseInt(process.env.NEWSDATA_RATE_LIMIT_RESET_HOUR || '0'),
      },
      crypto: {
        capacity: parseInt(process.env.NEWSDATA_RATE_LIMIT_CRYPTO_CAPACITY || '20'),
        refillRate: parseFloat(process.env.NEWSDATA_RATE_LIMIT_CRYPTO_REFILL || '1'),
        dailyQuota: parseInt(process.env.NEWSDATA_RATE_LIMIT_CRYPTO_QUOTA || '3000'),
        resetHour: parseInt(process.env.NEWSDATA_RATE_LIMIT_RESET_HOUR || '0'),
      },
      market: {
        capacity: parseInt(process.env.NEWSDATA_RATE_LIMIT_MARKET_CAPACITY || '20'),
        refillRate: parseFloat(process.env.NEWSDATA_RATE_LIMIT_MARKET_REFILL || '1'),
        dailyQuota: parseInt(process.env.NEWSDATA_RATE_LIMIT_MARKET_QUOTA || '3000'),
        resetHour: parseInt(process.env.NEWSDATA_RATE_LIMIT_RESET_HOUR || '0'),
      },
    },
    
    defaultRetryDelay: parseInt(process.env.NEWSDATA_RETRY_DELAY || '1000'),
    maxRetryAttempts: parseInt(process.env.NEWSDATA_MAX_RETRIES || '3'),
    jitterFactor: parseFloat(process.env.NEWSDATA_JITTER_FACTOR || '0.1'),
    
    coordinationEnabled: process.env.NEWSDATA_COORDINATION_ENABLED !== 'false',
    coordinationWindow: parseInt(process.env.NEWSDATA_COORDINATION_WINDOW || '5000'),
  };
}