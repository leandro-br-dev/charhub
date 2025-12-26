/**
 * Batch Error Handler
 * Handles errors and retry logic for batch operations
 */

import { logger } from '../../config/logger';

/**
 * Error types
 */
export enum BatchErrorType {
  NETWORK = 'network',
  API = 'api',
  DATABASE = 'database',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Error context
 */
export interface ErrorContext {
  type: BatchErrorType;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction?: string;
}

/**
 * Batch Error Handler
 */
export class BatchErrorHandler {
  private readonly errorCounts: Map<string, number> = new Map();
  private readonly lastErrorTime: Map<string, number> = new Map();
  private readonly maxRetries = 3;
  private readonly backoffBaseMs = 1000; // 1 second

  /**
   * Handle error with classification and retry decision
   */
  handleError(error: Error, context?: {
    curatedImageId?: string;
    operation?: string;
    attempt?: number;
  }): ErrorContext {
    const errorType = this.classifyError(error);
    const retryable = this.isRetryable(errorType, context?.attempt || 1);
    const severity = this.getSeverity(errorType, retryable);

    // Track error
    if (context?.curatedImageId) {
      this.trackError(context.curatedImageId);
    }

    const errorContext: ErrorContext = {
      type: errorType,
      retryable,
      severity,
      suggestedAction: this.getSuggestedAction(errorType, retryable),
    };

    logger.error({
      error: error.message,
      type: errorType,
      retryable,
      severity,
      context,
    }, 'Batch operation error');

    return errorContext;
  }

  /**
   * Classify error type
   */
  private classifyError(error: Error): BatchErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('econnrefused') || message.includes('timeout')) {
      return BatchErrorType.NETWORK;
    }

    if (message.includes('api') || message.includes('429') || message.includes('rate limit')) {
      return BatchErrorType.API;
    }

    if (message.includes('database') || message.includes('prisma') || message.includes('connection')) {
      return BatchErrorType.DATABASE;
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return BatchErrorType.VALIDATION;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return BatchErrorType.TIMEOUT;
    }

    return BatchErrorType.UNKNOWN;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(type: BatchErrorType, attempt: number): boolean {
    if (attempt >= this.maxRetries) {
      return false;
    }

    switch (type) {
      case BatchErrorType.NETWORK:
      case BatchErrorType.API:
      case BatchErrorType.DATABASE:
      case BatchErrorType.TIMEOUT:
        return true;
      case BatchErrorType.VALIDATION:
      case BatchErrorType.UNKNOWN:
        return false;
      default:
        return false;
    }
  }

  /**
   * Get error severity
   */
  private getSeverity(type: BatchErrorType, retryable: boolean): ErrorContext['severity'] {
    if (!retryable) {
      if (type === BatchErrorType.DATABASE || type === BatchErrorType.API) {
        return 'critical';
      }
      return 'high';
    }

    switch (type) {
      case BatchErrorType.NETWORK:
      case BatchErrorType.TIMEOUT:
        return 'low';
      case BatchErrorType.API:
      case BatchErrorType.DATABASE:
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Get suggested action for error
   */
  private getSuggestedAction(type: BatchErrorType, retryable: boolean): string {
    if (!retryable) {
      return 'Skip this item and continue with next';
    }

    switch (type) {
      case BatchErrorType.NETWORK:
        return 'Retry with exponential backoff';
      case BatchErrorType.API:
        return 'Wait for rate limit reset and retry';
      case BatchErrorType.DATABASE:
        return 'Retry after connection recovery';
      case BatchErrorType.TIMEOUT:
        return 'Retry with longer timeout';
      default:
        return 'Log and continue';
    }
  }

  /**
   * Calculate backoff delay
   */
  calculateBackoff(attempt: number): number {
    return this.backoffBaseMs * Math.pow(2, attempt - 1);
  }

  /**
   * Track error for monitoring
   */
  private trackError(key: string): void {
    const count = (this.errorCounts.get(key) || 0) + 1;
    this.errorCounts.set(key, count);
    this.lastErrorTime.set(key, Date.now());

    // Alert if too many errors
    if (count >= 5) {
      logger.error({ key, count }, 'Too many errors for this item');
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    uniqueErrors: number;
    topErrors: Array<{ key: string; count: number }>;
  } {
    let totalErrors = 0;
    for (const count of this.errorCounts.values()) {
      totalErrors += count;
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      uniqueErrors: this.errorCounts.size,
      topErrors,
    };
  }

  /**
   * Clear error tracking
   */
  clearErrors(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    logger.info('Error tracking cleared');
  }

  /**
   * Log error to database
   */
  async logToDatabase(error: Error, context: ErrorContext, metadata?: any): Promise<void> {
    try {
      // TODO: Create errors table if needed for persistent tracking
      logger.warn({ error, context, metadata }, 'Error would be logged to database');
    } catch (e) {
      logger.error({ error: e }, 'Failed to log error to database');
    }
  }

  /**
   * Check if should abort batch based on errors
   */
  shouldAbortBatch(errorRate: number, consecutiveErrors: number): boolean {
    // Abort if more than 50% errors
    if (errorRate > 0.5) {
      logger.warn({ errorRate }, 'High error rate - aborting batch');
      return true;
    }

    // Abort if 10+ consecutive errors
    if (consecutiveErrors >= 10) {
      logger.warn({ consecutiveErrors }, 'Too many consecutive errors - aborting batch');
      return true;
    }

    return false;
  }
}

// Singleton instance
export const batchErrorHandler = new BatchErrorHandler();
