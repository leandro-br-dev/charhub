/**
 * Standard API Error Response Utilities
 *
 * Provides standardized error codes, messages, and helper functions for API error responses.
 * This ensures consistent error handling across all endpoints and enables frontend i18n.
 *
 * @module utils/apiErrors
 * @see FEATURE-020
 */

/**
 * Standard API Error Codes
 *
 * Use these constants instead of hardcoded strings for type safety and consistency.
 * All codes follow UPPER_SNAKE_CASE convention.
 *
 * @example
 * ```ts
 * import { API_ERROR_CODES, sendError } from './utils/apiErrors';
 *
 * return sendError(res, 404, API_ERROR_CODES.CHARACTER_NOT_FOUND);
 * ```
 */
export const API_ERROR_CODES = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',

  // Conflicts
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CREDITS_INSUFFICIENT: 'CREDITS_INSUFFICIENT',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  PAYPAL_ERROR: 'PAYPAL_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  R2_STORAGE_ERROR: 'R2_STORAGE_ERROR',

  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Business Logic
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  INVALID_STATE: 'INVALID_STATE',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
} as const;

/**
 * Union type of all valid API error codes
 *
 * @example
 * ```ts
 * function handleError(code: ApiErrorCode): void {
 *   console.log(API_ERROR_CODES[code]);
 * }
 * ```
 */
export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * Standard API Error Response Shape
 *
 * All error responses from the API should follow this format.
 *
 * @property code - Machine-readable error code (UPPER_SNAKE_CASE)
 * @property message - Human-readable fallback message (English)
 * @property field - Optional: field name for validation errors
 * @property details - Optional: additional context for debugging
 *
 * @example
 * ```ts
 * const error: ApiError = {
 *   code: 'VALIDATION_FAILED',
 *   message: 'Invalid email format',
 *   field: 'email'
 * };
 * ```
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Default English messages for each error code
 *
 * These messages serve as fallbacks when the frontend doesn't have a translation.
 * They should be clear, concise, and user-friendly.
 *
 * @example
 * ```ts
 * const message = ERROR_MESSAGES[API_ERROR_CODES.AUTH_REQUIRED];
 * // Returns: 'Authentication required'
 * ```
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'Authentication required',
  AUTH_INVALID: 'Invalid authentication credentials',
  AUTH_EXPIRED: 'Authentication has expired',
  ADMIN_REQUIRED: 'Admin access required',
  FORBIDDEN: 'You do not have permission to perform this action',

  // Validation
  VALIDATION_FAILED: 'Validation failed',
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  INVALID_FORMAT: 'Invalid format',
  VALUE_OUT_OF_RANGE: 'Value is out of allowed range',

  // Resources
  NOT_FOUND: 'Resource not found',
  CHARACTER_NOT_FOUND: 'Character not found',
  USER_NOT_FOUND: 'User not found',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  STORY_NOT_FOUND: 'Story not found',
  IMAGE_NOT_FOUND: 'Image not found',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',

  // Conflicts
  ALREADY_EXISTS: 'Resource already exists',
  DUPLICATE_ENTRY: 'Duplicate entry',

  // Rate Limiting & Quotas
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  QUOTA_EXCEEDED: 'Quota exceeded',
  CREDITS_INSUFFICIENT: 'Insufficient credits',

  // External Services
  EXTERNAL_SERVICE_ERROR: 'External service error',
  STRIPE_ERROR: 'Payment processing error',
  PAYPAL_ERROR: 'PayPal payment error',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable',
  R2_STORAGE_ERROR: 'Storage service error',

  // Server Errors
  INTERNAL_ERROR: 'An unexpected error occurred',
  DATABASE_ERROR: 'Database error',
  CONFIGURATION_ERROR: 'Configuration error',

  // Business Logic
  OPERATION_NOT_ALLOWED: 'Operation not allowed',
  INVALID_STATE: 'Invalid state for this operation',
  FEATURE_DISABLED: 'This feature is currently disabled',
};

/**
 * Create a standardized error response object
 *
 * Use this function to create error objects that follow the standard format.
 * The message parameter is optional - if not provided, the default English message will be used.
 *
 * @param code - The error code from API_ERROR_CODES
 * @param options - Optional overrides and additional data
 * @param options.message - Custom message (overrides default)
 * @param options.field - Field name for validation errors
 * @param options.details - Additional context for debugging
 *
 * @returns Standardized error response object
 *
 * @example
 * ```ts
 * // Basic usage
 * const error = createApiError(API_ERROR_CODES.CHARACTER_NOT_FOUND);
 *
 * // With custom message
 * const error = createApiError(API_ERROR_CODES.VALIDATION_FAILED, {
 *   message: 'Email is required',
 *   field: 'email'
 * });
 *
 * // With details
 * const error = createApiError(API_ERROR_CODES.RATE_LIMIT_EXCEEDED, {
 *   details: { retryAfter: 60 }
 * });
 * ```
 */
export function createApiError(
  code: ApiErrorCode,
  options?: {
    message?: string;
    field?: string;
    details?: Record<string, unknown>;
  }
): { error: ApiError } {
  return {
    error: {
      code,
      message: options?.message || ERROR_MESSAGES[code],
      ...(options?.field && { field: options.field }),
      ...(options?.details && { details: options.details }),
    },
  };
}

/**
 * Send standardized error response
 *
 * Helper function to send error responses with the correct format and status code.
 * This is the recommended way to send errors in route handlers.
 *
 * @param res - Express Response object
 * @param statusCode - HTTP status code (4xx or 5xx)
 * @param code - The error code from API_ERROR_CODES
 * @param options - Optional overrides and additional data
 * @param options.message - Custom message (overrides default)
 * @param options.field - Field name for validation errors
 * @param options.details - Additional context for debugging
 *
 * @example
 * ```ts
 * import { sendError, API_ERROR_CODES } from '../../utils/apiErrors';
 *
 * // In route handler
 * if (!character) {
 *   return sendError(res, 404, API_ERROR_CODES.CHARACTER_NOT_FOUND, {
 *     details: { characterId: req.params.id }
 *   });
 * }
 *
 * if (!user.isAdmin) {
 *   return sendError(res, 403, API_ERROR_CODES.ADMIN_REQUIRED);
 * }
 * ```
 */
export function sendError(
  res: { status: (code: number) => unknown; json: (data: unknown) => void },
  statusCode: number,
  code: ApiErrorCode,
  options?: {
    message?: string;
    field?: string;
    details?: Record<string, unknown>;
  }
): void {
  (res.status(statusCode) as { json: (data: unknown) => void }).json(
    createApiError(code, options)
  );
}
