/**
 * Comprehensive error handling utilities for Polymarket data processing
 * Implements Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { 
  ProcessedEvent, 
  ProcessedOutcome, 
  MarketType,
  ProcessingResult,
  DataProcessingError 
} from './polymarket-types';

export type ErrorType = 'network' | 'parsing' | 'validation' | 'rendering' | 'unknown';

export interface ErrorContext {
  component?: string;
  operation?: string;
  data?: any;
  timestamp: number;
}

/**
 * Enhanced error class with context
 */
export class PolymarketError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;

  constructor(
    message: string, 
    type: ErrorType = 'unknown', 
    context: Partial<ErrorContext> = {},
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'PolymarketError';
    this.type = type;
    this.context = {
      timestamp: Date.now(),
      ...context
    };
    this.recoverable = recoverable;
  }
}

/**
 * Error handler with logging and recovery strategies
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: PolymarketError[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log errors with recovery strategies
   */
  handleError(error: Error | PolymarketError, context?: Partial<ErrorContext>): ProcessingResult<any> {
    const polymarketError = error instanceof PolymarketError 
      ? error 
      : new PolymarketError(error.message, 'unknown', context);

    // Log error
    this.logError(polymarketError);

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('PolymarketError:', polymarketError);
    }

    return {
      success: false,
      error: {
        type: polymarketError.type,
        message: polymarketError.message,
        originalData: polymarketError.context.data,
      },
    };
  }

  /**
   * Handle errors with fallback data generation
   */
  handleErrorWithFallback<T>(
    error: Error | PolymarketError, 
    fallbackGenerator: () => T,
    context?: Partial<ErrorContext>
  ): ProcessingResult<T> {
    const result = this.handleError(error, context);
    
    try {
      const fallbackData = fallbackGenerator();
      return {
        ...result,
        data: fallbackData,
        fallbackUsed: true,
      };
    } catch (fallbackError) {
      // If fallback generation fails, log it but return original error
      this.logError(new PolymarketError(
        `Fallback generation failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
        'unknown',
        { ...context, operation: 'fallback_generation' }
      ));
      
      return result;
    }
  }

  /**
   * Validate and sanitize market data with error recovery
   */
  validateMarketData(data: any): ProcessingResult<ProcessedEvent> {
    try {
      // Check required fields
      if (!data || typeof data !== 'object') {
        throw new PolymarketError(
          'Invalid market data: not an object',
          'validation',
          { data, operation: 'validate_market_data' }
        );
      }

      const errors: string[] = [];
      
      // Validate required fields
      if (!data.id) errors.push('Missing id');
      if (!data.title) errors.push('Missing title');
      
      // Validate outcomes
      if (!data.outcomes || !Array.isArray(data.outcomes)) {
        errors.push('Missing or invalid outcomes array');
      } else {
        data.outcomes.forEach((outcome: any, index: number) => {
          if (!outcome || typeof outcome !== 'object') {
            errors.push(`Invalid outcome at index ${index}`);
          } else {
            if (!outcome.name) errors.push(`Missing name for outcome ${index}`);
            if (typeof outcome.probability !== 'number' || isNaN(outcome.probability)) {
              errors.push(`Invalid probability for outcome ${index}`);
            }
          }
        });
      }

      if (errors.length > 0) {
        throw new PolymarketError(
          `Market data validation failed: ${errors.join(', ')}`,
          'validation',
          { data, operation: 'validate_market_data' }
        );
      }

      return { success: true, data: data as ProcessedEvent };
    } catch (error) {
      return this.handleErrorWithFallback(
        error instanceof Error ? error : new Error('Unknown validation error'),
        () => this.generateFallbackMarket(data),
        { operation: 'validate_market_data', data }
      );
    }
  }

  /**
   * Sanitize outcome data with fallbacks
   */
  sanitizeOutcomes(outcomes: any[], marketType: MarketType = 'simple'): ProcessedOutcome[] {
    if (!Array.isArray(outcomes) || outcomes.length === 0) {
      return this.generateFallbackOutcomes(marketType);
    }

    return outcomes.map((outcome, index) => {
      try {
        return {
          name: outcome?.name || `Option ${index + 1}`,
          probability: this.sanitizeProbability(outcome?.probability),
          color: this.sanitizeColor(outcome?.color, outcome?.name),
          category: outcome?.category || undefined,
        };
      } catch (error) {
        this.logError(new PolymarketError(
          `Failed to sanitize outcome at index ${index}`,
          'parsing',
          { data: outcome, operation: 'sanitize_outcomes' }
        ));
        
        return {
          name: `Option ${index + 1}`,
          probability: 50,
          color: 'neutral' as const,
          category: undefined,
        };
      }
    });
  }

  /**
   * Sanitize probability values
   */
  private sanitizeProbability(probability: any): number {
    if (typeof probability === 'number' && !isNaN(probability)) {
      return Math.min(Math.max(probability, 0), 100);
    }
    
    if (typeof probability === 'string') {
      const parsed = parseFloat(probability);
      if (!isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 100);
      }
    }
    
    return 50; // Default fallback
  }

  /**
   * Sanitize color values
   */
  private sanitizeColor(color: any, name?: string): 'yes' | 'no' | 'neutral' {
    if (color === 'yes' || color === 'no' || color === 'neutral') {
      return color;
    }
    
    // Infer color from name
    if (typeof name === 'string') {
      const lowerName = name.toLowerCase();
      if (lowerName === 'yes' || lowerName.includes('yes')) return 'yes';
      if (lowerName === 'no' || lowerName.includes('no')) return 'no';
    }
    
    return 'neutral';
  }

  /**
   * Generate fallback market data
   */
  private generateFallbackMarket(partialData?: any): ProcessedEvent {
    const fallbackId = partialData?.id || `fallback-${Date.now()}`;
    
    return {
      id: fallbackId,
      title: partialData?.title || 'Market data unavailable',
      description: partialData?.description || 'Market information could not be loaded',
      image: partialData?.image || '',
      volume: partialData?.volume || 0,
      volumeFormatted: this.formatVolume(partialData?.volume || 0),
      isNew: partialData?.isNew || false,
      active: partialData?.active || false,
      closed: partialData?.closed || true,
      marketType: 'simple',
      outcomes: this.generateFallbackOutcomes('simple'),
      tags: partialData?.tags || ['politics'],
      tagLabels: partialData?.tagLabels || ['Politics'],
      endDate: partialData?.endDate || new Date().toISOString(),
      startDate: partialData?.startDate || new Date().toISOString(),
      slug: partialData?.slug || fallbackId,
      ticker: partialData?.ticker || fallbackId.toUpperCase(),
    };
  }

  /**
   * Generate fallback outcomes
   */
  private generateFallbackOutcomes(marketType: MarketType): ProcessedOutcome[] {
    if (marketType === 'simple') {
      return [
        { name: 'Yes', probability: 50, color: 'yes' },
        { name: 'No', probability: 50, color: 'no' }
      ];
    } else {
      return [
        { name: 'Yes', probability: 50, color: 'yes', category: 'Option A' },
        { name: 'Yes', probability: 50, color: 'yes', category: 'Option B' }
      ];
    }
  }

  /**
   * Format volume with error handling
   */
  private formatVolume(volume: any): string {
    try {
      const num = typeof volume === 'number' ? volume : parseFloat(volume);
      if (isNaN(num)) return '0';
      
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
      } else if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
      } else {
        return `${Math.round(num)}`;
      }
    } catch (error) {
      return '0';
    }
  }

  /**
   * Log error to internal log
   */
  private logError(error: PolymarketError): void {
    this.errorLog.push(error);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): PolymarketError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    recent: number; // Last hour
  } {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recent = this.errorLog.filter(e => e.context.timestamp > oneHourAgo);
    
    const byType: Record<ErrorType, number> = {
      network: 0,
      parsing: 0,
      validation: 0,
      rendering: 0,
      unknown: 0,
    };

    this.errorLog.forEach(error => {
      byType[error.type]++;
    });

    return {
      total: this.errorLog.length,
      byType,
      recent: recent.length,
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility function for safe async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: () => T,
  context?: Partial<ErrorContext>
): Promise<ProcessingResult<T>> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    return errorHandler.handleErrorWithFallback(
      error instanceof Error ? error : new Error('Unknown async error'),
      fallback,
      context
    );
  }
}

/**
 * Utility function for safe synchronous operations with error handling
 */
export function safeSync<T>(
  operation: () => T,
  fallback: () => T,
  context?: Partial<ErrorContext>
): ProcessingResult<T> {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    return errorHandler.handleErrorWithFallback(
      error instanceof Error ? error : new Error('Unknown sync error'),
      fallback,
      context
    );
  }
}