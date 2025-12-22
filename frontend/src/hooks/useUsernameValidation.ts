import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export type UsernameValidationState = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';

export interface UsernameValidationResult {
  state: UsernameValidationState;
  isChecking: boolean;
  isAvailable: boolean | null;
  errorMessage: string | null;
}

interface UseUsernameValidationOptions {
  currentUsername?: string; // Current user's username (to skip checking if unchanged)
  minLength?: number;
  debounceMs?: number;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

/**
 * Custom hook for username validation with debounced availability checking
 *
 * @param username - Username to validate (without @ prefix)
 * @param options - Validation options
 * @returns Validation state and helpers
 */
export function useUsernameValidation(
  username: string,
  options: UseUsernameValidationOptions = {}
): UsernameValidationResult {
  const {
    currentUsername,
    minLength = 3,
    debounceMs = 500,
  } = options;

  const [state, setState] = useState<UsernameValidationState>('idle');

  // Format username with @ prefix
  const formatUsername = useCallback((value: string): string => {
    const cleaned = value.replace(/@/g, '');
    return cleaned ? `@${cleaned}` : '';
  }, []);

  // Check if username is valid format
  const isValidFormat = useCallback((value: string): boolean => {
    if (!value) return false;
    if (value.length < minLength) return false;
    return USERNAME_REGEX.test(value);
  }, [minLength]);

  // Check username availability via API
  const checkAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < minLength) {
      setState('idle');
      return;
    }

    // Format with @ prefix
    const formattedUsername = formatUsername(usernameToCheck);

    // If it's the current user's username, no need to check
    if (currentUsername && formattedUsername === currentUsername) {
      setState('idle');
      return;
    }

    // Validate format first
    if (!isValidFormat(usernameToCheck)) {
      setState('invalid');
      return;
    }

    setState('checking');

    try {
      const response = await api.get(`/api/v1/users/check-username/${formattedUsername}`);
      setState(response.data.available ? 'available' : 'unavailable');
    } catch (error) {
      console.error('[useUsernameValidation] API error:', error);
      setState('idle');
    }
  }, [currentUsername, formatUsername, isValidFormat, minLength]);

  // Debounce username check
  useEffect(() => {
    if (!username) {
      setState('idle');
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability(username);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [username, checkAvailability, debounceMs]);

  // Compute derived values
  const isChecking = state === 'checking';
  const isAvailable = state === 'available' ? true : state === 'unavailable' ? false : null;

  let errorMessage: string | null = null;
  if (state === 'invalid') {
    errorMessage = username.length < minLength
      ? `Username must be at least ${minLength} characters`
      : 'Username can only contain letters, numbers, and underscores';
  } else if (state === 'unavailable') {
    errorMessage = 'Username already taken';
  }

  return {
    state,
    isChecking,
    isAvailable,
    errorMessage,
  };
}

/**
 * Helper function to format username (add @ prefix if not present)
 */
export function formatUsernameWithPrefix(username: string): string {
  const cleaned = username.replace(/@/g, '');
  return cleaned ? `@${cleaned}` : '';
}

/**
 * Helper function to remove @ prefix from username
 */
export function removeUsernamePrefix(username: string): string {
  return username.replace(/@/g, '');
}

/**
 * Helper function to validate username format
 */
export function validateUsernameFormat(username: string, minLength: number = 3): boolean {
  if (!username || username.length < minLength) return false;
  return USERNAME_REGEX.test(username);
}
