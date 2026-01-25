/**
 * Comprehensive error handling service for TradeWizard frontend
 * Implements Requirements 11.1, 11.2, 11.3, 11.5, 11.6
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'trading' | 'data' | 'rendering' | 'auth' | 'validation' | 'unknown';

export interface ErrorReport {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  context: {
    component?: string;
    operation?: string;
    userId?: string;
    sessionId?: string;
    url: string;
    userAgent: string;
    stackTrace?: string;
    additionalData?: Record<string, any>;
  };
  resolved: boolean;
  retryCount: number;
}

export interface ErrorRecoveryStrategy {
  canRecover: boolean;
  recoveryAction?: () => Promise<void> | void;
  fallbackData?: any;
  userMessage: string;
  technicalMessage?: string;
}

/**
 * Centralized error handling service
 */
class ErrorService {
  private static instance: ErrorService;
  private errorReports: Map<string, ErrorReport> = new Map();
  private maxReports = 100;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Report an error with automatic categorization and recovery strategy
   */
  reportError(
    error: Error | string,
    context: Partial<ErrorReport['context']> = {}
  ): ErrorRecoveryStrategy {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stackTrace = typeof error === 'object' ? error.stack : undefined;

    const category = this.categorizeError(errorMessage, stackTrace);
    const severity = this.determineSeverity(category, errorMessage);
    
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: errorMessage,
      category,
      severity,
      timestamp: Date.now(),
      context: {
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
        sessionId: this.sessionId,
        stackTrace,
        ...context,
      },
      resolved: false,
      retryCount: 0,
    };

    this.storeErrorReport(errorReport);
    this.logError(errorReport);

    return this.generateRecoveryStrategy(errorReport);
  }

  /**
   * Report a network error with specific handling
   */
  reportNetworkError(
    error: Error,
    endpoint: string,
    method: string = 'GET',
    context: Record<string, any> = {}
  ): ErrorRecoveryStrategy {
    return this.reportError(error, {
      component: 'NetworkClient',
      operation: `${method} ${endpoint}`,
      additionalData: {
        endpoint,
        method,
        ...context,
      },
    });
  }

  /**
   * Report a trading error with specific handling
   */
  reportTradingError(
    error: Error,
    operation: string,
    marketId?: string,
    orderData?: any
  ): ErrorRecoveryStrategy {
    return this.reportError(error, {
      component: 'TradingService',
      operation,
      additionalData: {
        marketId,
        orderData: orderData ? this.sanitizeOrderData(orderData) : undefined,
      },
    });
  }

  /**
   * Report a data processing error
   */
  reportDataError(
    error: Error,
    dataType: string,
    rawData?: any
  ): ErrorRecoveryStrategy {
    return this.reportError(error, {
      component: 'DataProcessor',
      operation: `process_${dataType}`,
      additionalData: {
        dataType,
        dataSize: rawData ? JSON.stringify(rawData).length : 0,
        dataKeys: rawData && typeof rawData === 'object' ? Object.keys(rawData) : undefined,
      },
    });
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string): void {
    const errorReport = this.errorReports.get(errorId);
    if (errorReport) {
      errorReport.resolved = true;
      this.errorReports.set(errorId, errorReport);
    }
  }

  /**
   * Increment retry count for an error
   */
  incrementRetryCount(errorId: string): void {
    const errorReport = this.errorReports.get(errorId);
    if (errorReport) {
      errorReport.retryCount++;
      this.errorReports.set(errorId, errorReport);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number;
    resolvedErrors: number;
  } {
    const reports = Array.from(this.errorReports.values());
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      trading: 0,
      data: 0,
      rendering: 0,
      auth: 0,
      validation: 0,
      unknown: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let recentErrors = 0;
    let resolvedErrors = 0;

    reports.forEach(report => {
      byCategory[report.category]++;
      bySeverity[report.severity]++;
      
      if (report.timestamp > oneHourAgo) {
        recentErrors++;
      }
      
      if (report.resolved) {
        resolvedErrors++;
      }
    });

    return {
      total: reports.length,
      byCategory,
      bySeverity,
      recentErrors,
      resolvedErrors,
    };
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): ErrorReport[] {
    return Array.from(this.errorReports.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Clear resolved errors older than specified time
   */
  cleanupOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, report] of this.errorReports.entries()) {
      if (report.resolved && report.timestamp < cutoff) {
        this.errorReports.delete(id);
      }
    }
  }

  /**
   * Categorize error based on message and stack trace
   */
  private categorizeError(message: string, stackTrace?: string): ErrorCategory {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('fetch') || lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || lowerMessage.includes('connection')) {
      return 'network';
    }
    
    if (lowerMessage.includes('trading') || lowerMessage.includes('order') || 
        lowerMessage.includes('wallet') || lowerMessage.includes('balance')) {
      return 'trading';
    }
    
    if (lowerMessage.includes('auth') || lowerMessage.includes('login') || 
        lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return 'auth';
    }
    
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || 
        lowerMessage.includes('required') || lowerMessage.includes('format')) {
      return 'validation';
    }
    
    if (lowerMessage.includes('parse') || lowerMessage.includes('json') || 
        lowerMessage.includes('data') || lowerMessage.includes('undefined')) {
      return 'data';
    }
    
    if (stackTrace && (stackTrace.includes('render') || stackTrace.includes('React'))) {
      return 'rendering';
    }
    
    return 'unknown';
  }

  /**
   * Determine error severity
   */
  private determineSeverity(category: ErrorCategory, message: string): ErrorSeverity {
    const lowerMessage = message.toLowerCase();
    
    // Critical errors that break core functionality
    if (category === 'auth' || lowerMessage.includes('critical') || 
        lowerMessage.includes('fatal') || lowerMessage.includes('crash')) {
      return 'critical';
    }
    
    // High severity for trading and important operations
    if (category === 'trading' || lowerMessage.includes('transaction') || 
        lowerMessage.includes('payment') || lowerMessage.includes('security')) {
      return 'high';
    }
    
    // Medium severity for data and network issues
    if (category === 'network' || category === 'data' || 
        lowerMessage.includes('timeout') || lowerMessage.includes('unavailable')) {
      return 'medium';
    }
    
    // Low severity for validation and rendering issues
    return 'low';
  }

  /**
   * Generate recovery strategy based on error type
   */
  private generateRecoveryStrategy(errorReport: ErrorReport): ErrorRecoveryStrategy {
    const { category, severity, message, retryCount } = errorReport;
    
    switch (category) {
      case 'network':
        return {
          canRecover: retryCount < 3,
          recoveryAction: () => this.retryNetworkOperation(errorReport),
          userMessage: 'Connection issue detected. Retrying automatically...',
          technicalMessage: `Network error: ${message}`,
        };
        
      case 'trading':
        return {
          canRecover: severity !== 'critical' && retryCount < 2,
          recoveryAction: () => this.retryTradingOperation(errorReport),
          userMessage: 'Trading operation failed. Please check your wallet connection and try again.',
          technicalMessage: `Trading error: ${message}`,
        };
        
      case 'data':
        return {
          canRecover: true,
          fallbackData: this.generateFallbackData(errorReport),
          userMessage: 'Some data may be temporarily unavailable. Showing cached information.',
          technicalMessage: `Data processing error: ${message}`,
        };
        
      case 'auth':
        return {
          canRecover: false,
          userMessage: 'Authentication required. Please log in again.',
          technicalMessage: `Authentication error: ${message}`,
        };
        
      case 'validation':
        return {
          canRecover: true,
          userMessage: 'Please check your input and try again.',
          technicalMessage: `Validation error: ${message}`,
        };
        
      default:
        return {
          canRecover: retryCount < 1,
          userMessage: 'An unexpected error occurred. Please try refreshing the page.',
          technicalMessage: `Unknown error: ${message}`,
        };
    }
  }

  /**
   * Retry network operation with exponential backoff
   */
  private async retryNetworkOperation(errorReport: ErrorReport): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, errorReport.retryCount), 10000);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.incrementRetryCount(errorReport.id);
        resolve();
      }, delay);
    });
  }

  /**
   * Retry trading operation
   */
  private async retryTradingOperation(errorReport: ErrorReport): Promise<void> {
    // Implement trading-specific retry logic
    this.incrementRetryCount(errorReport.id);
    
    // Check wallet connection, refresh balances, etc.
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        throw new Error('Wallet connection failed during retry');
      }
    }
  }

  /**
   * Generate fallback data for data errors
   */
  private generateFallbackData(errorReport: ErrorReport): any {
    const { context } = errorReport;
    
    if (context.additionalData?.dataType === 'market') {
      return {
        id: 'fallback',
        title: 'Market data temporarily unavailable',
        outcomes: [
          { name: 'Yes', probability: 50, color: 'yes' },
          { name: 'No', probability: 50, color: 'no' }
        ],
        volume: 0,
        isNew: false,
        active: false,
      };
    }
    
    return null;
  }

  /**
   * Sanitize order data for logging (remove sensitive information)
   */
  private sanitizeOrderData(orderData: any): any {
    if (!orderData || typeof orderData !== 'object') {
      return orderData;
    }
    
    const sanitized = { ...orderData };
    
    // Remove sensitive fields
    delete sanitized.privateKey;
    delete sanitized.signature;
    delete sanitized.walletAddress;
    
    return sanitized;
  }

  /**
   * Store error report with size management
   */
  private storeErrorReport(errorReport: ErrorReport): void {
    this.errorReports.set(errorReport.id, errorReport);
    
    // Maintain size limit
    if (this.errorReports.size > this.maxReports) {
      const oldestId = Array.from(this.errorReports.keys())[0];
      this.errorReports.delete(oldestId);
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(errorReport: ErrorReport): void {
    const logData = {
      id: errorReport.id,
      message: errorReport.message,
      category: errorReport.category,
      severity: errorReport.severity,
      context: errorReport.context,
    };
    
    switch (errorReport.severity) {
      case 'critical':
        console.error('CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('HIGH SEVERITY ERROR:', logData);
        break;
      case 'medium':
        console.warn('MEDIUM SEVERITY ERROR:', logData);
        break;
      case 'low':
        console.info('LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { component: 'Global', operation: 'unhandled_promise_rejection' }
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        component: 'Global',
        operation: 'global_error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorService = ErrorService.getInstance();

/**
 * Utility function for safe async operations with comprehensive error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: Partial<ErrorReport['context']> = {}
): Promise<{ success: boolean; data?: T; error?: ErrorRecoveryStrategy }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const recovery = errorService.reportError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return { success: false, error: recovery };
  }
}

/**
 * Utility function for safe synchronous operations with comprehensive error handling
 */
export function safeSyncOperation<T>(
  operation: () => T,
  context: Partial<ErrorReport['context']> = {}
): { success: boolean; data?: T; error?: ErrorRecoveryStrategy } {
  try {
    const result = operation();
    return { success: true, data: result };
  } catch (error) {
    const recovery = errorService.reportError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
    return { success: false, error: recovery };
  }
}