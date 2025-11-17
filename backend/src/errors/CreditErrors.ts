/**
 * Custom error classes for credit-related errors
 */

export class InsufficientCreditsError extends Error {
  public readonly statusCode: number = 402; // Payment Required
  public readonly code: string = 'INSUFFICIENT_CREDITS';
  public readonly required: number;
  public readonly current: number;

  constructor(required: number, current: number, message?: string) {
    super(
      message ||
        `Insufficient credits. Required: ${required}, Current: ${current}`
    );
    this.name = 'InsufficientCreditsError';
    this.required = required;
    this.current = current;

    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InsufficientCreditsError);
    }
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      required: this.required,
      current: this.current,
      statusCode: this.statusCode,
    };
  }
}

export class ServiceCostNotFoundError extends Error {
  public readonly statusCode: number = 500;
  public readonly code: string = 'SERVICE_COST_NOT_FOUND';
  public readonly serviceType: string;

  constructor(serviceType: string) {
    super(`Service cost configuration not found: ${serviceType}`);
    this.name = 'ServiceCostNotFoundError';
    this.serviceType = serviceType;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceCostNotFoundError);
    }
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      serviceType: this.serviceType,
      statusCode: this.statusCode,
    };
  }
}
