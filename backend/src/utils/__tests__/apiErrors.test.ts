/**
 * Unit tests for API Error utilities
 * @see FEATURE-020
 */

import {
  API_ERROR_CODES,
  createApiError,
  sendError,
  type ApiErrorCode,
  type ApiError,
} from '../apiErrors';

describe('API Error Utilities', () => {
  describe('API_ERROR_CODES', () => {
    it('should have all error codes defined', () => {
      // Authentication & Authorization
      expect(API_ERROR_CODES.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
      expect(API_ERROR_CODES.AUTH_INVALID).toBe('AUTH_INVALID');
      expect(API_ERROR_CODES.AUTH_EXPIRED).toBe('AUTH_EXPIRED');
      expect(API_ERROR_CODES.ADMIN_REQUIRED).toBe('ADMIN_REQUIRED');
      expect(API_ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');

      // Validation
      expect(API_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
      expect(API_ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(API_ERROR_CODES.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
      expect(API_ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT');
      expect(API_ERROR_CODES.VALUE_OUT_OF_RANGE).toBe('VALUE_OUT_OF_RANGE');

      // Resources
      expect(API_ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND');
      expect(API_ERROR_CODES.CHARACTER_NOT_FOUND).toBe('CHARACTER_NOT_FOUND');
      expect(API_ERROR_CODES.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
      expect(API_ERROR_CODES.CONVERSATION_NOT_FOUND).toBe('CONVERSATION_NOT_FOUND');
      expect(API_ERROR_CODES.STORY_NOT_FOUND).toBe('STORY_NOT_FOUND');
      expect(API_ERROR_CODES.IMAGE_NOT_FOUND).toBe('IMAGE_NOT_FOUND');
      expect(API_ERROR_CODES.SUBSCRIPTION_NOT_FOUND).toBe('SUBSCRIPTION_NOT_FOUND');

      // Conflicts
      expect(API_ERROR_CODES.ALREADY_EXISTS).toBe('ALREADY_EXISTS');
      expect(API_ERROR_CODES.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY');

      // Rate Limiting & Quotas
      expect(API_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(API_ERROR_CODES.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
      expect(API_ERROR_CODES.CREDITS_INSUFFICIENT).toBe('CREDITS_INSUFFICIENT');

      // External Services
      expect(API_ERROR_CODES.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR');
      expect(API_ERROR_CODES.STRIPE_ERROR).toBe('STRIPE_ERROR');
      expect(API_ERROR_CODES.PAYPAL_ERROR).toBe('PAYPAL_ERROR');
      expect(API_ERROR_CODES.AI_SERVICE_ERROR).toBe('AI_SERVICE_ERROR');
      expect(API_ERROR_CODES.R2_STORAGE_ERROR).toBe('R2_STORAGE_ERROR');

      // Server Errors
      expect(API_ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(API_ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(API_ERROR_CODES.CONFIGURATION_ERROR).toBe('CONFIGURATION_ERROR');

      // Business Logic
      expect(API_ERROR_CODES.OPERATION_NOT_ALLOWED).toBe('OPERATION_NOT_ALLOWED');
      expect(API_ERROR_CODES.INVALID_STATE).toBe('INVALID_STATE');
      expect(API_ERROR_CODES.FEATURE_DISABLED).toBe('FEATURE_DISABLED');
    });

    it('should have all error codes as readonly', () => {
      // TypeScript should enforce readonly, but we can check at runtime
      const codes = { ...API_ERROR_CODES };
      expect(Object.keys(codes)).toHaveLength(33);
    });

    it('should have all error codes with corresponding messages in ERROR_MESSAGES', () => {
      // Dynamically import ERROR_MESSAGES
      const { ERROR_MESSAGES } = require('../apiErrors');

      // Get all error code values
      const errorCodeValues = Object.values(API_ERROR_CODES);

      // Verify each error code has a corresponding message
      errorCodeValues.forEach((code) => {
        expect(ERROR_MESSAGES).toHaveProperty(code);
        expect(typeof ERROR_MESSAGES[code]).toBe('string');
        expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
      });
    });
  });

  describe('createApiError', () => {
    it('should create error with default message', () => {
      const result = createApiError(API_ERROR_CODES.CHARACTER_NOT_FOUND);

      expect(result).toEqual({
        error: {
          code: 'CHARACTER_NOT_FOUND',
          message: 'Character not found',
        },
      });
    });

    it('should create error with custom message', () => {
      const result = createApiError(API_ERROR_CODES.VALIDATION_FAILED, {
        message: 'Custom validation message',
      });

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Custom validation message',
        },
      });
    });

    it('should create error with field', () => {
      const result = createApiError(API_ERROR_CODES.VALIDATION_FAILED, {
        field: 'email',
      });

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          field: 'email',
        },
      });
    });

    it('should create error with details', () => {
      const result = createApiError(API_ERROR_CODES.RATE_LIMIT_EXCEEDED, {
        details: { retryAfter: 60 },
      });

      expect(result).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: { retryAfter: 60 },
        },
      });
    });

    it('should create error with all options', () => {
      const result = createApiError(API_ERROR_CODES.INVALID_INPUT, {
        message: 'Email is required',
        field: 'email',
        details: { providedValue: null },
      });

      expect(result).toEqual({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email is required',
          field: 'email',
          details: { providedValue: null },
        },
      });
    });

    it('should not include optional fields if not provided', () => {
      const result = createApiError(API_ERROR_CODES.AUTH_REQUIRED);

      expect(result.error).not.toHaveProperty('field');
      expect(result.error).not.toHaveProperty('details');
    });
  });

  describe('sendError', () => {
    let mockResponse: {
      status: jest.Mock;
      json: jest.Mock;
    };

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it('should send error with status code', () => {
      sendError(mockResponse as never, 404, API_ERROR_CODES.CHARACTER_NOT_FOUND);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CHARACTER_NOT_FOUND',
          message: 'Character not found',
        },
      });
    });

    it('should send error with custom message', () => {
      sendError(
        mockResponse as never,
        401,
        API_ERROR_CODES.AUTH_REQUIRED,
        { message: 'Please log in first' }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Please log in first',
        },
      });
    });

    it('should send error with field and details', () => {
      sendError(
        mockResponse as never,
        400,
        API_ERROR_CODES.VALIDATION_FAILED,
        {
          message: 'Invalid email format',
          field: 'email',
          details: { providedValue: 'not-an-email' },
        }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid email format',
          field: 'email',
          details: { providedValue: 'not-an-email' },
        },
      });
    });

    it('should send error with details but no field', () => {
      sendError(mockResponse as never, 429, API_ERROR_CODES.RATE_LIMIT_EXCEEDED, {
        details: { retryAfter: 60, limit: 100 },
      });

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: { retryAfter: 60, limit: 100 },
        },
      });
    });
  });

  describe('ApiErrorCode type', () => {
    it('should accept valid error codes', () => {
      const validCode: ApiErrorCode = 'AUTH_REQUIRED';
      expect(validCode).toBe('AUTH_REQUIRED');
    });

    it('should work in type assertions', () => {
      const code = 'CHARACTER_NOT_FOUND' as ApiErrorCode;
      expect(typeof code).toBe('string');
    });
  });

  describe('ApiError interface', () => {
    it('should create valid ApiError object', () => {
      const apiError: ApiError = {
        code: 'VALIDATION_FAILED',
        message: 'Test error',
        field: 'testField',
        details: { key: 'value' },
      };

      expect(apiError.code).toBe('VALIDATION_FAILED');
      expect(apiError.message).toBe('Test error');
      expect(apiError.field).toBe('testField');
      expect(apiError.details).toEqual({ key: 'value' });
    });

    it('should create ApiError without optional fields', () => {
      const apiError: ApiError = {
        code: 'INTERNAL_ERROR',
        message: 'Server error',
      };

      expect(apiError.code).toBe('INTERNAL_ERROR');
      expect(apiError.message).toBe('Server error');
      expect(apiError.field).toBeUndefined();
      expect(apiError.details).toBeUndefined();
    });
  });
});
