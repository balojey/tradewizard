/**
 * Error handling and fallback mechanisms for Polymarket API integration
 * Provides comprehensive error recovery and graceful degradation
 */

import {
  ProcessedEvent,
  ProcessedOutcome,
  DataProcessingError,
  ProcessingConfig,
  DEFAULT_PROCESSING_CONFIG,
} from './polymarket-types';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Enhanced error interface with context
export interface EnhancedError extends DataProcessingError {
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
}

// Error categories for better handling
export enum ErrorCategory {
  NETWORK = 'network',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  API_LIMIT = 'api_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

// Error handler class for centralized error management
export class PolymarketErrorHandler {
  private errors: EnhancedError[] = [];
  private config: ProcessingConfig;

  constructor(config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG) {
    this.config = config;
  }

  /**
   * Log an error with context
   */
  logError(error: DataProcessingError, severity: ErrorSeverity = 'medium', context?: Record<string, any>): void {
    const enhancedError: EnhancedError = {
      ...error,
      severity,
      timestamp: new Date(),
      context,
      recoverable: this.isRecoverable(error),
      retryable: this.isRetryable(error),
    };

    this.errors.push(enhancedError);

    if (this.config.logErrors) {
      console.warn(`[PolymarketError:${severity}]`, enhancedError);
    }
  }

  /**
   * Check if an error is recoverable
   */
  private isRecoverable(error: DataProcessingError): boolean {
    switch (error.type) {
      case 'parsing':
      case 'validation':
        return true; // Can use fallbacks
      case 'network':
        return true; // Can retry or use cache
      default:
        return false;
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: DataProcessingError): boolean {
    switch (error.type) {
      case 'network':
        return true;
      case 'parsing':
      case 'validation':
        return false; // Data issue, retrying won't help
      default:
        return false;
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): EnhancedError[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear error history
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recoverable: number;
    retryable: number;
  } {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<ErrorSeverity, number>,
      recoverable: 0,
      retryable: 0,
    };

    for (const error of this.errors) {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity]++;
      if (error.recoverable) stats.recoverable++;
      if (error.retryable) stats.retryable++;
    }

    return stats;
  }
}

// Global error handler instance
export const globalErrorHandler = new PolymarketErrorHandler();

/**
 * Create fallback event data for when API fails completely
 */
export function createFallbackEvent(
  id: string = 'fallback',
  title: string = 'Market data temporarily unavailable',
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedEvent {
  return {
    id,
    title,
    description: 'We are experiencing temporary issues loading market data. Please try again later.',
    image: '', // Will trigger gradient fallback in UI
    volume: 0,
    volumeFormatted: '$0',
    isNew: false,
    active: false,
    closed: false,
    marketType: 'simple',
    outcomes: [
      { name: 'Yes', probability: config.defaultProbability, color: 'yes' },
      { name: 'No', probability: config.defaultProbability, color: 'no' },
    ],
    tags: [],
    tagLabels: [],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    startDate: new Date().toISOString(),
    slug: 'fallback',
    ticker: 'fallback',
  };
}

/**
 * Create fallback outcomes for malformed market data
 */
export function createFallbackOutcomes(
  marketType: 'simple' | 'complex' = 'simple',
  config: ProcessingConfig = DEFAULT_PROCESSING_CONFIG
): ProcessedOutcome[] {
  if (marketType === 'simple') {
    return [
      { name: 'Yes', probability: config.defaultProbability, color: 'yes' },
      { name: 'No', probability: config.defaultProbability, color: 'no' },
    ];
  } else {
    // For complex markets, create a few generic categories
    return [
      { name: 'Yes', probability: config.defaultProbability, color: 'yes', category: 'Option A' },
      { name: 'Yes', probability: config.defaultProbability, color: 'yes', category: 'Option B' },
      { name: 'Yes', probability: config.defaultProbability, color: 'yes', category: 'Option C' },
    ];
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker pattern for API calls
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

// Global circuit breaker for Polymarket API
export const polymarketCircuitBreaker = new CircuitBreaker();

/**
 * Validate network response
 */
export function validateNetworkResponse(response: Response): void {
  if (!response.ok) {
    const error: DataProcessingError = {
      type: 'network',
      message: `HTTP ${response.status}: ${response.statusText}`,
    };

    globalErrorHandler.logError(error, response.status >= 500 ? 'high' : 'medium', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });

    throw new Error(error.message);
  }
}

/**
 * Handle API rate limiting
 */
export function handleRateLimit(response: Response): void {
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');

  if (rateLimitRemaining === '0') {
    const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : new Date(Date.now() + 60000);
    
    const error: DataProcessingError = {
      type: 'network',
      message: `Rate limit exceeded. Resets at ${resetTime.toISOString()}`,
    };

    globalErrorHandler.logError(error, 'high', {
      rateLimitRemaining,
      rateLimitReset,
      resetTime: resetTime.toISOString(),
    });

    throw new Error(error.message);
  }
}

/**
 * Safe JSON parsing with detailed error context
 */
export function safeJsonParseWithContext<T>(
  jsonString: string,
  context: string,
  fallback?: T
): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const parseError: DataProcessingError = {
      type: 'parsing',
      message: `Failed to parse JSON in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalData: jsonString,
      field: context,
    };

    globalErrorHandler.logError(parseError, 'medium', { context, jsonString });

    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(parseError.message);
  }
}

/**
 * Monitor API health and performance
 */
export class APIHealthMonitor {
  private requestTimes: number[] = [];
  private errorCount: number = 0;
  private totalRequests: number = 0;

  recordRequest(duration: number, success: boolean): void {
    this.requestTimes.push(duration);
    this.totalRequests++;
    
    if (!success) {
      this.errorCount++;
    }

    // Keep only last 100 requests for performance
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
  }

  getHealthMetrics(): {
    averageResponseTime: number;
    errorRate: number;
    totalRequests: number;
    recentRequests: number;
  } {
    const recentRequests = this.requestTimes.length;
    const averageResponseTime = recentRequests > 0 
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / recentRequests 
      : 0;
    const errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;

    return {
      averageResponseTime,
      errorRate,
      totalRequests: this.totalRequests,
      recentRequests,
    };
  }

  reset(): void {
    this.requestTimes = [];
    this.errorCount = 0;
    this.totalRequests = 0;
  }
}

// Global API health monitor
export const apiHealthMonitor = new APIHealthMonitor();