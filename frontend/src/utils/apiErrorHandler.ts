import { t } from 'i18next';

/**
 * Standard API Error Response format from backend
 *
 * @example
 * ```json
 * {
 *   "error": {
 *     "code": "CHARACTER_NOT_FOUND",
 *     "message": "Character not found",
 *     "field": "id",
 *     "details": { "characterId": "123" }
 *   }
 * }
 * ```
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Type guard to check if data is a standard API error response
 *
 * @param data - Unknown data to check
 * @returns True if data matches ApiErrorResponse format
 *
 * @example
 * ```ts
 * if (isApiError(response.data)) {
 *   console.log(response.data.error.code); // TypeScript knows this exists
 * }
 * ```
 */
export function isApiError(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error === 'object' &&
    (data as ApiErrorResponse).error !== null &&
    typeof (data as ApiErrorResponse).error!.code === 'string' &&
    typeof (data as ApiErrorResponse).error!.message === 'string'
  );
}

/**
 * Get translated error message from API error
 *
 * Attempts to translate using i18n key pattern: `api.errors.${code}`
 * Supports interpolation for: field, min, max, and any details properties
 *
 * Falls back to the English message from the API response if translation not found
 *
 * @param error - Error object from ApiErrorResponse
 * @returns Translated error message or fallback English message
 *
 * @example
 * ```ts
 * const apiError = {
 *   error: {
 *     code: 'CHARACTER_NOT_FOUND',
 *     message: 'Character not found',
 *     details: { characterId: '123' }
 *   }
 * };
 *
 * // Returns: "Personagem não encontrado" (if pt-BR)
 * // Returns: "Character not found" (if en-US or translation missing)
 * const message = getErrorMessage(apiError.error);
 * ```
 */
export function getErrorMessage(error: ApiErrorResponse['error']): string {
  const { code, message, field, details } = error;

  // Build interpolation parameters
  const interpolationParams: Record<string, unknown> = {
    ...(details || {}),
  };

  // Add field translation if present - translate inline, not as a separate t() call
  if (field) {
    // Use the field name directly in the interpolation
    // The translation should handle {{field}} placeholder
    interpolationParams.field = field;
  }

  // Try to get translated message using the error code
  const translationKey = `api.errors.${code}`;
  const translated = t(translationKey, {
    defaultValue: message, // Fallback to API's English message
    ...interpolationParams,
  });

  // If translation returns empty string (missing translation), use fallback message
  return translated || message;
}

/**
 * Extract error message from unknown error type
 *
 * Handles:
 * 1. Axios error responses with new standard API error format
 * 2. Axios error responses with legacy format ({ error: string } or { message: string })
 * 3. Non-axios errors (returns INTERNAL_ERROR fallback)
 *
 * @param error - Unknown error (typically from try/catch or axios catch)
 * @returns User-friendly error message
 *
 * @example
 * ```ts
 * try {
 *   await api.delete('/api/v1/characters/123');
 * } catch (error) {
 *   // Returns translated message or "An unexpected error occurred"
 *   const message = extractErrorMessage(error);
 *   addToast(message, 'error');
 * }
 * ```
 */
export function extractErrorMessage(error: unknown): string {
  // Handle axios error responses
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: unknown; status?: number } };

    // Check for new standard API error format
    if (
      axiosError.response?.data &&
      isApiError(axiosError.response.data)
    ) {
      return getErrorMessage(axiosError.response.data.error);
    }

    // Handle legacy format: { error: string }
    if (
      axiosError.response?.data &&
      typeof axiosError.response.data === 'object'
    ) {
      const data = axiosError.response.data as Record<string, unknown>;
      if (typeof data.error === 'string') {
        return data.error;
      }

      // Handle legacy format: { message: string }
      if (typeof data.message === 'string') {
        return data.message;
      }
    }
  }

  // Handle error as string (rare but possible)
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects with message property
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Final fallback: generic internal error message
  const fallbackMessage = 'An unexpected error occurred';
  const translated = t('api.errors.INTERNAL_ERROR', {
    defaultValue: fallbackMessage,
  });

  return translated || fallbackMessage;
}
