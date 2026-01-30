import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isApiError, getErrorMessage, extractErrorMessage, type ApiErrorResponse } from '../apiErrorHandler';

// Mock i18next
vi.mock('i18next', () => ({
  t: vi.fn(),
}));

import { t } from 'i18next';

describe('apiErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isApiError', () => {
    it('should return true for valid API error response', () => {
      const data = {
        error: {
          code: 'CHARACTER_NOT_FOUND',
          message: 'Character not found',
        },
      };

      expect(isApiError(data)).toBe(true);
    });

    it('should return true for API error with field and details', () => {
      const data = {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          field: 'email',
          details: { format: 'invalid' },
        },
      };

      expect(isApiError(data)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isApiError('string')).toBe(false);
      expect(isApiError(123)).toBe(false);
      expect(isApiError(true)).toBe(false);
    });

    it('should return false for object without error property', () => {
      expect(isApiError({})).toBe(false);
      expect(isApiError({ data: 'test' })).toBe(false);
    });

    it('should return false when error is not an object', () => {
      expect(isApiError({ error: 'string' })).toBe(false);
      expect(isApiError({ error: 123 })).toBe(false);
    });

    it('should return false when error is null', () => {
      expect(isApiError({ error: null })).toBe(false);
    });

    it('should return false when error.code is missing', () => {
      expect(isApiError({ error: { message: 'test' } })).toBe(false);
    });

    it('should return false when error.message is missing', () => {
      expect(isApiError({ error: { code: 'TEST' } })).toBe(false);
    });

    it('should return false when error.code is not a string', () => {
      expect(isApiError({ error: { code: 123, message: 'test' } })).toBe(false);
    });

    it('should return false when error.message is not a string', () => {
      expect(isApiError({ error: { code: 'TEST', message: true } })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return translated message when translation exists', () => {
      const error = {
        code: 'CHARACTER_NOT_FOUND',
        message: 'Character not found',
      };

      vi.mocked(t).mockReturnValue('Personagem não encontrado');

      const result = getErrorMessage(error);

      expect(t).toHaveBeenCalledWith('api.errors.CHARACTER_NOT_FOUND', expect.objectContaining({
        defaultValue: 'Character not found',
      }));
      expect(result).toBe('Personagem não encontrado');
    });

    it('should use fallback message when translation returns empty string', () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred',
      };

      vi.mocked(t).mockReturnValueOnce(''); // First call returns empty

      const result = getErrorMessage(error);

      expect(result).toBe('Unknown error occurred');
    });

    it('should pass field to interpolation params', () => {
      const error = {
        code: 'VALIDATION_FAILED',
        message: 'Email is required',
        field: 'email',
      };

      vi.mocked(t).mockReturnValue('Email é obrigatório');

      getErrorMessage(error);

      // Should be called once with the field parameter
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('api.errors.VALIDATION_FAILED', expect.objectContaining({
        field: 'email',
      }));
    });

    it('should pass details to interpolation params', () => {
      const error = {
        code: 'VALUE_OUT_OF_RANGE',
        message: 'Value must be between 1 and 100',
        details: { min: 1, max: 100 },
      };

      vi.mocked(t).mockReturnValue('Valor deve estar entre 1 e 100');

      getErrorMessage(error);

      expect(t).toHaveBeenCalledWith('api.errors.VALUE_OUT_OF_RANGE', expect.objectContaining({
        min: 1,
        max: 100,
      }));
    });

    it('should pass both field and details to interpolation params', () => {
      const error = {
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
        field: 'email',
        details: { format: 'email' },
      };

      vi.mocked(t).mockReturnValue('Formato de email inválido');

      getErrorMessage(error);

      // Should be called once with both field and details
      expect(t).toHaveBeenCalledTimes(1);
      expect(t).toHaveBeenCalledWith('api.errors.INVALID_FORMAT', expect.objectContaining({
        field: 'email',
        format: 'email',
      }));
    });

    it('should handle error without field or details', () => {
      const error = {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };

      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = getErrorMessage(error);

      expect(t).toHaveBeenCalledWith('api.errors.INTERNAL_ERROR', expect.objectContaining({
        defaultValue: 'An unexpected error occurred',
      }));
      expect(result).toBe('Erro inesperado');
    });

    it('should handle error with empty details', () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: {},
      };

      vi.mocked(t).mockReturnValue('Recurso não encontrado');

      const result = getErrorMessage(error);

      expect(result).toBe('Recurso não encontrado');
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from axios error with new API format', () => {
      const axiosError = {
        response: {
          data: {
            error: {
              code: 'CHARACTER_NOT_FOUND',
              message: 'Character not found',
            },
          },
        },
      };

      vi.mocked(t).mockReturnValue('Personagem não encontrado');

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Personagem não encontrado');
    });

    it('should extract message from axios error with legacy format (error string)', () => {
      const axiosError = {
        response: {
          data: {
            error: 'Legacy error message',
          },
        },
      };

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Legacy error message');
    });

    it('should extract message from axios error with legacy format (message string)', () => {
      const axiosError = {
        response: {
          data: {
            message: 'Legacy message string',
          },
        },
      };

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Legacy message string');
    });

    it('should prefer error over message in legacy format', () => {
      const axiosError = {
        response: {
          data: {
            error: 'Error message',
            message: 'Message string',
          },
        },
      };

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Error message');
    });

    it('should handle axios error without response data', () => {
      const axiosError = {
        response: {},
      };

      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Erro inesperado');
    });

    it('should handle axios error without response', () => {
      const axiosError = {};

      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Erro inesperado');
    });

    it('should handle string error', () => {
      const result = extractErrorMessage('String error message');

      expect(result).toBe('String error message');
    });

    it('should handle Error instance', () => {
      const error = new Error('Error instance message');

      const result = extractErrorMessage(error);

      expect(result).toBe('Error instance message');
    });

    it('should handle null error', () => {
      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage(null);

      expect(result).toBe('Erro inesperado');
    });

    it('should handle undefined error', () => {
      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage(undefined);

      expect(result).toBe('Erro inesperado');
    });

    it('should handle number error (returns fallback)', () => {
      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage(123);

      expect(result).toBe('Erro inesperado');
    });

    it('should handle object without response property', () => {
      vi.mocked(t).mockReturnValue('Erro inesperado');

      const result = extractErrorMessage({ foo: 'bar' });

      expect(result).toBe('Erro inesperado');
    });

    it('should use fallback message when translation missing', () => {
      const axiosError = {
        response: {},
      };

      vi.mocked(t).mockReturnValueOnce(''); // Returns empty string

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('An unexpected error occurred');
    });
  });

  describe('integration tests', () => {
    it('should handle complete flow: axios error -> isApiError -> getErrorMessage', () => {
      const axiosError = {
        response: {
          data: {
            error: {
              code: 'AUTH_REQUIRED',
              message: 'Authentication required',
            },
          },
        },
      };

      vi.mocked(t).mockReturnValue('Autenticação necessária');

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Autenticação necessária');
      expect(t).toHaveBeenCalledWith('api.errors.AUTH_REQUIRED', expect.anything());
    });

    it('should handle validation error with field and details', () => {
      const axiosError = {
        response: {
          data: {
            error: {
              code: 'VALUE_OUT_OF_RANGE',
              message: 'Age must be between 18 and 100',
              field: 'age',
              details: { min: 18, max: 100 },
            },
          },
        },
      };

      vi.mocked(t).mockReturnValue('Idade deve estar entre 18 e 100');

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Idade deve estar entre 18 e 100');
    });

    it('should gracefully fall back to legacy format', () => {
      const axiosError = {
        response: {
          data: {
            error: 'Old format error',
          },
        },
      };

      const result = extractErrorMessage(axiosError);

      expect(result).toBe('Old format error');
      expect(t).not.toHaveBeenCalled();
    });
  });
});
