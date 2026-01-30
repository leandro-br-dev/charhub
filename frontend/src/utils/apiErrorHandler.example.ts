/**
 * API Error Handler - Usage Examples
 *
 * This file demonstrates how to use the apiErrorHandler utilities
 * in your components and services.
 */

import { extractErrorMessage, isApiError } from './apiErrorHandler';

// ============================================================
// EXAMPLE 1: Using with try/catch in components
// ============================================================

async function handleDeleteCharacter(characterId: string) {
  try {
    await api.delete(`/characters/${characterId}`);
    // Show success toast
    addToast('Character deleted successfully', 'success');
  } catch (error) {
    // Extract user-friendly error message
    const message = extractErrorMessage(error);
    addToast(message, 'error');
  }
}

// ============================================================
// EXAMPLE 2: Using with TanStack Query mutations
// ============================================================

import { useMutation } from '@tanstack/react-query';

const deleteCharacterMutation = useMutation({
  mutationFn: (characterId: string) =>
    api.delete(`/characters/${characterId}`),
  onSuccess: () => {
    addToast('Character deleted', 'success');
  },
  onError: (error) => {
    // Automatically extracts and translates error message
    const message = extractErrorMessage(error);
    addToast(message, 'error');
  },
});

// ============================================================
// EXAMPLE 3: Using in form validation
// ============================================================

async function handleSubmit(formData: FormData) {
  try {
    const response = await api.post('/characters', formData);
    return response.data;
  } catch (error) {
    const message = extractErrorMessage(error);

    // Check if it's a validation error with field info
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      isApiError((error as any).response?.data)
    ) {
      const apiError = (error as any).response.data.error;
      if (apiError.field) {
        // Set field-specific error
        setFieldError(apiError.field, message);
      }
    }

    // Also show general error toast
    addToast(message, 'error');
    throw error;
  }
}

// ============================================================
// EXAMPLE 4: Using with custom error handling
// ============================================================

async function loadCharacterDetails(characterId: string) {
  try {
    const response = await api.get(`/characters/${characterId}`);
    return response.data;
  } catch (error) {
    const message = extractErrorMessage(error);

    // Check specific error codes for custom handling
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      isApiError((error as any).response?.data)
    ) {
      const apiError = (error as any).response.data.error;

      switch (apiError.code) {
        case 'CHARACTER_NOT_FOUND':
          // Redirect to 404 page
          navigate('/404');
          break;
        case 'FORBIDDEN':
          // Show access denied message
          addToast("You don't have permission to view this character", 'error');
          break;
        default:
          // Show the translated error message
          addToast(message, 'error');
      }
    } else {
      // Fallback for non-API errors
      addToast(message, 'error');
    }

    throw error;
  }
}

// ============================================================
// EXAMPLE 5: Using in API interceptors
// ============================================================

// In your api.ts file:
import api from './lib/api';
import { isApiError } from './utils/apiErrorHandler';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors for debugging
    if (error.response?.data && isApiError(error.response.data)) {
      console.error('[API Error]', {
        code: error.response.data.error.code,
        message: error.response.data.error.message,
        field: error.response.data.error.field,
        details: error.response.data.error.details,
      });
    }

    // You could also show a toast notification here globally
    // if you want automatic error reporting

    return Promise.reject(error);
  }
);

// ============================================================
// EXAMPLE 6: Error logging service
// ============================================================

function logError(error: unknown, context?: string) {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    isApiError((error as any).response?.data)
  ) {
    const apiError = (error as any).response.data.error;

    // Log structured error to monitoring service
    console.error('[Error Logged]', {
      context,
      code: apiError.code,
      message: apiError.message,
      field: apiError.field,
      details: apiError.details,
    });
  }
}

// ============================================================
// EXAMPLE 7: Testing error handling
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { extractErrorMessage } from './apiErrorHandler';

describe('My Component Error Handling', () => {
  it('should show translated error message', () => {
    const mockError = {
      response: {
        data: {
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: 'Character not found',
          },
        },
      },
    };

    const message = extractErrorMessage(mockError);
    expect(message).toBeTruthy();
  });
});
