/**
 * NewsData.io Error Handling Framework
 * 
 * Implements comprehensive error categorization and handling strategies
 * for NewsData.io API integration with graceful degradation.
 * 
 * Features:
 * - Error categorization (API, network, data, system errors)
 * - Error handler classes for each error type
 * - Graceful degradation strategies
 * - Fallback mechanisms with cached data
 * - Structured error responses
 * 
 * Requirements: 1.6, 6.6
 */

import type { AdvancedObservabilityLogger } from './audit-logger.js';
import type { NewsDataCacheManager } from './newsdata-cache-manager.js';
import type { NewsDataResponse, NewsDataArticle } from './newsdata-client.js';
import { getLogger } from './logger.js';

// ============================================================================
// Error Classification Types
// ============================================================================

export enum ErrorCategory {
  API = 'api',
  NETWORK = 'network',
  DATA = 'data',
  SYSTEM = 'system',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  QUOTA = 'quota'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  timestamp: number;
  endpoint?: string;
  operation?: string;
  requestId?: string;
  userId?: string;
  parameters?: Record<string, any>;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorHandlingResult {
  success: boolean;
  data?: NewsDataResponse;
  error?: ProcessedError;
  fallbackUsed: boolean;
  degradationLevel: DegradationLevel;
  retryable: boolean;
  retryAfter?: number;
}

export enum DegradationLevel {
  NONE = 'none',           // Full functionality
  PARTIAL = 'partial',     // Some features disabled
  CACHED_ONLY = 'cached_only', // Only cached data available
  MINIMAL = 'minimal',     // Basic functionality only
  UNAVAILABLE = 'unavailable'  // Service unavailable
}

// ============================================================================
// Base Error Classes
// ============================================================================

export abstract class NewsDataBaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly degradationLevel: DegradationLevel;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    retryable: boolean = false,
    degradationLevel: DegradationLevel = DegradationLevel.UNAVAILABLE,
    context: Partial<ErrorContext> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.retryable = retryable;
    this.degradationLevel = degradationLevel;
    this.context = {
      timestamp: Date.now(),
      ...context
    };
  }

  abstract getRecoveryStrategy(): RecoveryStrategy;
  abstract shouldUseFallback(): boolean;
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'degrade' | 'fail';
  retryAfter?: number;
  fallbackOptions?: string[];
  degradationLevel?: DegradationLevel;
  maxRetries?: number;
}

// ============================================================================
// Specific Error Classes
// ============================================================================

export class NewsDataApiError extends NewsDataBaseError {
  constructor(
    message: string,
    public statusCode: number,
    public apiCode?: string,
    context: Partial<ErrorContext> = {}
  ) {
    const severity = NewsDataApiError.determineSeverity(statusCode);
    const retryable = NewsDataApiError.isRetryable(statusCode);
    const degradationLevel = NewsDataApiError.getDegradationLevel(statusCode);

    super(message, ErrorCategory.API, severity, retryable, degradationLevel, context);
  }

  static determineSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode === 429) return ErrorSeverity.MEDIUM;
    if (statusCode >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.LOW;
  }

  static isRetryable(statusCode: number): boolean {
    // Retry on server errors and rate limits
    return statusCode >= 500 || statusCode === 429;
  }

  static getDegradationLevel(statusCode: number): DegradationLevel {
    switch (statusCode) {
      case 429: return DegradationLevel.CACHED_ONLY;
      case 500:
      case 502:
      case 503:
      case 504: return DegradationLevel.PARTIAL;
      case 401:
      case 403: return DegradationLevel.UNAVAILABLE;
      default: return DegradationLevel.MINIMAL;
    }
  }

  getRecoveryStrategy(): RecoveryStrategy {
    switch (this.statusCode) {
      case 429:
        return {
          type: 'fallback',
          fallbackOptions: ['cached_data', 'stale_data'],
          degradationLevel: DegradationLevel.CACHED_ONLY,
          retryAfter: 60000 // 1 minute
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'retry',
          maxRetries: 3,
          retryAfter: 5000,
          degradationLevel: DegradationLevel.PARTIAL
        };
      case 401:
      case 403:
        return {
          type: 'fail',
          degradationLevel: DegradationLevel.UNAVAILABLE
        };
      default:
        return {
          type: 'degrade',
          degradationLevel: DegradationLevel.MINIMAL
        };
    }
  }

  shouldUseFallback(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }
}

export class NewsDataNetworkError extends NewsDataBaseError {
  constructor(
    message: string,
    public networkCode?: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      true, // Network errors are generally retryable
      DegradationLevel.CACHED_ONLY,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'retry',
      maxRetries: 3,
      retryAfter: 2000,
      fallbackOptions: ['cached_data', 'stale_data'],
      degradationLevel: DegradationLevel.CACHED_ONLY
    };
  }

  shouldUseFallback(): boolean {
    return true;
  }
}

export class NewsDataValidationError extends NewsDataBaseError {
  constructor(
    message: string,
    public validationErrors: string[],
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      false, // Validation errors are not retryable
      DegradationLevel.NONE,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'fail',
      degradationLevel: DegradationLevel.NONE
    };
  }

  shouldUseFallback(): boolean {
    return false;
  }
}

export class NewsDataSystemError extends NewsDataBaseError {
  constructor(
    message: string,
    public systemComponent: string,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      true,
      DegradationLevel.PARTIAL,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'fallback',
      fallbackOptions: ['cached_data', 'stale_data', 'minimal_service'],
      degradationLevel: DegradationLevel.PARTIAL,
      retryAfter: 30000 // 30 seconds
    };
  }

  shouldUseFallback(): boolean {
    return true;
  }
}

export class NewsDataDataError extends NewsDataBaseError {
  constructor(
    message: string,
    public validArticles: NewsDataArticle[],
    public invalidCount: number,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.DATA,
      ErrorSeverity.LOW,
      false,
      DegradationLevel.PARTIAL,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'degrade',
      degradationLevel: DegradationLevel.PARTIAL
    };
  }

  shouldUseFallback(): boolean {
    return false; // We have valid data to return
  }
}

export class NewsDataRateLimitError extends NewsDataBaseError {
  constructor(
    message: string,
    public retryAfterSeconds?: number,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      true,
      DegradationLevel.CACHED_ONLY,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'fallback',
      fallbackOptions: ['cached_data', 'stale_data'],
      degradationLevel: DegradationLevel.CACHED_ONLY,
      retryAfter: (this.retryAfterSeconds || 60) * 1000
    };
  }

  shouldUseFallback(): boolean {
    return true;
  }
}

export class NewsDataQuotaError extends NewsDataBaseError {
  constructor(
    message: string,
    public quotaType: 'daily' | 'monthly',
    public resetTime?: number,
    context: Partial<ErrorContext> = {}
  ) {
    super(
      message,
      ErrorCategory.QUOTA,
      ErrorSeverity.HIGH,
      false, // Don't retry quota errors
      DegradationLevel.CACHED_ONLY,
      context
    );
  }

  getRecoveryStrategy(): RecoveryStrategy {
    return {
      type: 'fallback',
      fallbackOptions: ['cached_data', 'stale_data'],
      degradationLevel: DegradationLevel.CACHED_ONLY,
      retryAfter: this.resetTime ? this.resetTime - Date.now() : 24 * 60 * 60 * 1000 // 24 hours default
    };
  }

  shouldUseFallback(): boolean {
    return true;
  }
}

// ============================================================================
// Processed Error Interface
// ============================================================================

export interface ProcessedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number;
  degradationLevel: DegradationLevel;
  context: ErrorContext;
  recoveryStrategy: RecoveryStrategy;
  originalError?: Error;
}

// ============================================================================
// Error Handler Interface
// ============================================================================

export interface ErrorHandler {
  canHandle(error: Error): boolean;
  handle(error: Error, context: Partial<ErrorContext>): Promise<ErrorHandlingResult>;
  getPriority(): number;
}

// ============================================================================
// Specific Error Handlers
// ============================================================================

export class ApiErrorHandler implements ErrorHandler {
  constructor(
    private cacheManager?: NewsDataCacheManager,
    private observabilityLogger?: AdvancedObservabilityLogger
  ) {}

  canHandle(error: Error): boolean {
    return error instanceof NewsDataApiError || 
           error.message.includes('HTTP') ||
           /\b[45]\d{2}\b/.test(error.message); // HTTP 4xx or 5xx status codes
  }

  async handle(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorHandlingResult> {
    let apiError: NewsDataApiError;

    if (error instanceof NewsDataApiError) {
      apiError = error;
    } else {
      // Parse HTTP error from message
      const statusMatch = error.message.match(/HTTP (\d{3})/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : 500;
      apiError = new NewsDataApiError(error.message, statusCode, undefined, context);
    }

    this.observabilityLogger?.logDataFetch({
      timestamp: Date.now(),
      source: 'news',
      provider: 'newsdata.io',
      success: false,
      cached: false,
      stale: false,
      freshness: 0,
      itemCount: 0,
      error: `API Error ${apiError.statusCode}: ${apiError.message}`,
      duration: 0,
    });

    // Try fallback if appropriate
    if (apiError.shouldUseFallback() && this.cacheManager && context.endpoint) {
      const fallbackData = await this.tryFallback(context.endpoint, context.parameters);
      if (fallbackData) {
        return {
          success: true,
          data: fallbackData,
          fallbackUsed: true,
          degradationLevel: apiError.degradationLevel,
          retryable: apiError.retryable,
          retryAfter: apiError.getRecoveryStrategy().retryAfter
        };
      }
    }

    return {
      success: false,
      error: this.processError(apiError),
      fallbackUsed: false,
      degradationLevel: apiError.degradationLevel,
      retryable: apiError.retryable,
      retryAfter: apiError.getRecoveryStrategy().retryAfter
    };
  }

  private async tryFallback(endpoint: string, parameters?: Record<string, any>): Promise<NewsDataResponse | null> {
    if (!this.cacheManager) return null;

    try {
      const cacheKey = this.cacheManager.generateCacheKey(endpoint, parameters || {});
      const cachedData = await this.cacheManager.get(cacheKey);
      
      if (cachedData && cachedData.data) {
        this.observabilityLogger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'newsdata.io',
          success: true,
          cached: true,
          stale: cachedData.isStale,
          freshness: Date.now() - cachedData.timestamp,
          itemCount: (cachedData.data as NewsDataResponse)?.results?.length || 0,
          duration: 0,
        });

        return cachedData.data as NewsDataResponse;
      }
    } catch (fallbackError) {
      console.warn('[ApiErrorHandler] Fallback failed:', fallbackError);
    }

    return null;
  }

  private processError(error: NewsDataApiError): ProcessedError {
    return {
      category: error.category,
      severity: error.severity,
      message: error.message,
      code: error.apiCode,
      retryable: error.retryable,
      retryAfter: error.getRecoveryStrategy().retryAfter,
      degradationLevel: error.degradationLevel,
      context: error.context,
      recoveryStrategy: error.getRecoveryStrategy(),
      originalError: error
    };
  }

  getPriority(): number {
    return 1; // High priority for API errors
  }
}

export class NetworkErrorHandler implements ErrorHandler {
  constructor(
    private cacheManager?: NewsDataCacheManager,
    private observabilityLogger?: AdvancedObservabilityLogger
  ) {}

  canHandle(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('econnreset') ||
           message.includes('enotfound') ||
           message.includes('etimedout') ||
           message.includes('connection') ||
           message.includes('fetch failed');
  }

  async handle(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorHandlingResult> {
    const networkError = new NewsDataNetworkError(error.message, undefined, context);

    this.observabilityLogger?.logDataFetch({
      timestamp: Date.now(),
      source: 'news',
      provider: 'newsdata.io',
      success: false,
      cached: false,
      stale: false,
      freshness: 0,
      itemCount: 0,
      error: `Network Error: ${networkError.message}`,
      duration: 0,
    });

    // Always try fallback for network errors
    if (this.cacheManager && context.endpoint) {
      const fallbackData = await this.tryFallback(context.endpoint, context.parameters);
      if (fallbackData) {
        return {
          success: true,
          data: fallbackData,
          fallbackUsed: true,
          degradationLevel: networkError.degradationLevel,
          retryable: networkError.retryable,
          retryAfter: networkError.getRecoveryStrategy().retryAfter
        };
      }
    }

    return {
      success: false,
      error: this.processError(networkError),
      fallbackUsed: false,
      degradationLevel: networkError.degradationLevel,
      retryable: networkError.retryable,
      retryAfter: networkError.getRecoveryStrategy().retryAfter
    };
  }

  private async tryFallback(endpoint: string, parameters?: Record<string, any>): Promise<NewsDataResponse | null> {
    if (!this.cacheManager) return null;

    try {
      const cacheKey = this.cacheManager.generateCacheKey(endpoint, parameters || {});
      const cachedData = await this.cacheManager.get(cacheKey);
      
      if (cachedData && cachedData.data) {
        this.observabilityLogger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'newsdata.io',
          success: true,
          cached: true,
          stale: cachedData.isStale,
          freshness: Date.now() - cachedData.timestamp,
          itemCount: (cachedData.data as NewsDataResponse)?.results?.length || 0,
          duration: 0,
        });

        return cachedData.data as NewsDataResponse;
      }
    } catch (fallbackError) {
      console.warn('[NetworkErrorHandler] Fallback failed:', fallbackError);
    }

    return null;
  }

  private processError(error: NewsDataNetworkError): ProcessedError {
    return {
      category: error.category,
      severity: error.severity,
      message: error.message,
      retryable: error.retryable,
      retryAfter: error.getRecoveryStrategy().retryAfter,
      degradationLevel: error.degradationLevel,
      context: error.context,
      recoveryStrategy: error.getRecoveryStrategy(),
      originalError: error
    };
  }

  getPriority(): number {
    return 2; // Medium priority for network errors
  }
}

export class DataErrorHandler implements ErrorHandler {
  constructor(
    private observabilityLogger?: AdvancedObservabilityLogger
  ) {}

  canHandle(error: Error): boolean {
    return error instanceof NewsDataDataError ||
           error.message.includes('validation') ||
           error.message.includes('invalid data') ||
           error.message.includes('malformed');
  }

  async handle(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorHandlingResult> {
    let dataError: NewsDataDataError;

    if (error instanceof NewsDataDataError) {
      dataError = error;
    } else {
      // Create a data error with empty valid articles
      dataError = new NewsDataDataError(error.message, [], 0, context);
    }

    this.observabilityLogger?.logDataFetch({
      timestamp: Date.now(),
      source: 'news',
      provider: 'newsdata.io',
      success: dataError.validArticles.length > 0,
      cached: false,
      stale: false,
      freshness: 0,
      itemCount: dataError.validArticles.length,
      error: `Data Error: ${dataError.message} (${dataError.invalidCount} invalid articles)`,
      duration: 0,
    });

    // If we have valid articles, return partial success
    if (dataError.validArticles.length > 0) {
      return {
        success: true,
        data: {
          status: 'success',
          totalResults: dataError.validArticles.length,
          results: dataError.validArticles
        },
        fallbackUsed: false,
        degradationLevel: dataError.degradationLevel,
        retryable: dataError.retryable
      };
    }

    return {
      success: false,
      error: this.processError(dataError),
      fallbackUsed: false,
      degradationLevel: dataError.degradationLevel,
      retryable: dataError.retryable
    };
  }

  private processError(error: NewsDataDataError): ProcessedError {
    return {
      category: error.category,
      severity: error.severity,
      message: error.message,
      retryable: error.retryable,
      degradationLevel: error.degradationLevel,
      context: error.context,
      recoveryStrategy: error.getRecoveryStrategy(),
      originalError: error
    };
  }

  getPriority(): number {
    return 3; // Lower priority for data errors
  }
}

export class SystemErrorHandler implements ErrorHandler {
  constructor(
    private cacheManager?: NewsDataCacheManager,
    private observabilityLogger?: AdvancedObservabilityLogger
  ) {}

  canHandle(error: Error): boolean {
    return error instanceof NewsDataSystemError ||
           error.message.includes('system') ||
           error.message.includes('internal') ||
           error.message.includes('cache') ||
           error.message.includes('database');
  }

  async handle(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorHandlingResult> {
    let systemError: NewsDataSystemError;

    if (error instanceof NewsDataSystemError) {
      systemError = error;
    } else {
      systemError = new NewsDataSystemError(error.message, 'unknown', context);
    }

    this.observabilityLogger?.logDataFetch({
      timestamp: Date.now(),
      source: 'news',
      provider: 'newsdata.io',
      success: false,
      cached: false,
      stale: false,
      freshness: 0,
      itemCount: 0,
      error: `System Error: ${systemError.message}`,
      duration: 0,
    });

    // Try fallback for system errors
    if (this.cacheManager && context.endpoint) {
      const fallbackData = await this.tryFallback(context.endpoint, context.parameters);
      if (fallbackData) {
        return {
          success: true,
          data: fallbackData,
          fallbackUsed: true,
          degradationLevel: systemError.degradationLevel,
          retryable: systemError.retryable,
          retryAfter: systemError.getRecoveryStrategy().retryAfter
        };
      }
    }

    return {
      success: false,
      error: this.processError(systemError),
      fallbackUsed: false,
      degradationLevel: systemError.degradationLevel,
      retryable: systemError.retryable,
      retryAfter: systemError.getRecoveryStrategy().retryAfter
    };
  }

  private async tryFallback(endpoint: string, parameters?: Record<string, any>): Promise<NewsDataResponse | null> {
    if (!this.cacheManager) return null;

    try {
      const cacheKey = this.cacheManager.generateCacheKey(endpoint, parameters || {});
      const cachedData = await this.cacheManager.get(cacheKey);
      
      if (cachedData && cachedData.data) {
        this.observabilityLogger?.logDataFetch({
          timestamp: Date.now(),
          source: 'news',
          provider: 'newsdata.io',
          success: true,
          cached: true,
          stale: cachedData.isStale,
          freshness: Date.now() - cachedData.timestamp,
          itemCount: (cachedData.data as NewsDataResponse)?.results?.length || 0,
          duration: 0,
        });

        return cachedData.data as NewsDataResponse;
      }
    } catch (fallbackError) {
      console.warn('[SystemErrorHandler] Fallback failed:', fallbackError);
    }

    return null;
  }

  private processError(error: NewsDataSystemError): ProcessedError {
    return {
      category: error.category,
      severity: error.severity,
      message: error.message,
      retryable: error.retryable,
      retryAfter: error.getRecoveryStrategy().retryAfter,
      degradationLevel: error.degradationLevel,
      context: error.context,
      recoveryStrategy: error.getRecoveryStrategy(),
      originalError: error
    };
  }

  getPriority(): number {
    return 4; // Lower priority for system errors
  }
}

// ============================================================================
// Main Error Handler Manager
// ============================================================================

export class NewsDataErrorHandlerManager {
  private handlers: ErrorHandler[] = [];
  private logger;

  constructor(
    cacheManager?: NewsDataCacheManager,
    observabilityLogger?: AdvancedObservabilityLogger
  ) {
    this.logger = getLogger();

    // Register default handlers in priority order
    this.registerHandler(new ApiErrorHandler(cacheManager, observabilityLogger));
    this.registerHandler(new NetworkErrorHandler(cacheManager, observabilityLogger));
    this.registerHandler(new DataErrorHandler(observabilityLogger));
    this.registerHandler(new SystemErrorHandler(cacheManager, observabilityLogger));

    this.logger.info('[NewsDataErrorHandlerManager] Initialized with default handlers');
  }

  registerHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
    // Sort by priority (lower number = higher priority)
    this.handlers.sort((a, b) => a.getPriority() - b.getPriority());
  }

  async handleError(error: Error, context: Partial<ErrorContext> = {}): Promise<ErrorHandlingResult> {
    this.logger.debug(`[NewsDataErrorHandlerManager] Handling error: ${error.message}`);

    // Find the first handler that can handle this error
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        this.logger.debug(`[NewsDataErrorHandlerManager] Using handler: ${handler.constructor.name}`);
        return await handler.handle(error, context);
      }
    }

    // No specific handler found, use generic handling
    this.logger.warn(`[NewsDataErrorHandlerManager] No specific handler found for error: ${error.message}`);
    return this.handleGenericError(error, context);
  }

  private async handleGenericError(error: Error, context: Partial<ErrorContext>): Promise<ErrorHandlingResult> {
    const genericError: ProcessedError = {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      retryable: false,
      degradationLevel: DegradationLevel.UNAVAILABLE,
      context: {
        timestamp: Date.now(),
        ...context
      },
      recoveryStrategy: {
        type: 'fail',
        degradationLevel: DegradationLevel.UNAVAILABLE
      },
      originalError: error
    };

    return {
      success: false,
      error: genericError,
      fallbackUsed: false,
      degradationLevel: DegradationLevel.UNAVAILABLE,
      retryable: false
    };
  }

  getRegisteredHandlers(): string[] {
    return this.handlers.map(handler => handler.constructor.name);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a NewsData error handler manager
 */
export function createNewsDataErrorHandler(
  cacheManager?: NewsDataCacheManager,
  observabilityLogger?: AdvancedObservabilityLogger
): NewsDataErrorHandlerManager {
  return new NewsDataErrorHandlerManager(cacheManager, observabilityLogger);
}

/**
 * Classify error into appropriate category
 */
export function classifyError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();

  if (message.includes('rate limit') || message.includes('429')) {
    return ErrorCategory.RATE_LIMIT;
  }

  if (message.includes('quota') || message.includes('exceeded')) {
    return ErrorCategory.QUOTA;
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
    return ErrorCategory.AUTHENTICATION;
  }

  if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
    return ErrorCategory.VALIDATION;
  }

  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return ErrorCategory.NETWORK;
  }

  if (message.includes('http') || /\b[45]\d{2}\b/.test(message)) {
    return ErrorCategory.API;
  }

  if (message.includes('data') || message.includes('malformed') || message.includes('parse')) {
    return ErrorCategory.DATA;
  }

  return ErrorCategory.SYSTEM;
}

/**
 * Create error context from request information
 */
export function createErrorContext(
  endpoint?: string,
  operation?: string,
  parameters?: Record<string, any>,
  additionalInfo?: Record<string, any>
): ErrorContext {
  return {
    timestamp: Date.now(),
    endpoint,
    operation,
    parameters,
    additionalInfo
  };
}