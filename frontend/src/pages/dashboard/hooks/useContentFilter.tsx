import { useState, useCallback, useEffect } from 'react';

type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';

interface UseContentFilterOptions {
  defaultAgeRating?: AgeRating;
  defaultBlurNsfw?: boolean;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

interface UseContentFilterReturn {
  ageRating: AgeRating;
  blurNsfw: boolean;
  setAgeRating: (rating: AgeRating) => void;
  setBlurNsfw: (blur: boolean) => void;
  resetFilters: () => void;
  isNsfwAllowed: boolean;
}

const STORAGE_KEY_AGE_RATING = 'dashboard_age_rating_filter';
const STORAGE_KEY_BLUR_NSFW = 'dashboard_blur_nsfw';

const AGE_RATING_NSFW_MAP: Record<AgeRating, boolean> = {
  L: false,
  TEN: false,
  TWELVE: false,
  FOURTEEN: false,
  SIXTEEN: false,
  EIGHTEEN: true,
};

/**
 * Custom hook to manage content filter state (age rating and NSFW blur)
 * Optionally persists state to localStorage
 */
export function useContentFilter({
  defaultAgeRating = 'L',
  defaultBlurNsfw = false,
  persistToLocalStorage = true,
  storageKey = 'dashboard_content_filter',
}: UseContentFilterOptions = {}): UseContentFilterReturn {
  // Initialize state from localStorage if enabled
  const getInitialAgeRating = (): AgeRating => {
    if (persistToLocalStorage) {
      const stored = localStorage.getItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`);
      if (stored && isValidAgeRating(stored)) {
        return stored as AgeRating;
      }
    }
    return defaultAgeRating;
  };

  const getInitialBlurNsfw = (): boolean => {
    if (persistToLocalStorage) {
      const stored = localStorage.getItem(`${storageKey}_${STORAGE_KEY_BLUR_NSFW}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultBlurNsfw;
  };

  const [ageRating, setAgeRatingState] = useState<AgeRating>(getInitialAgeRating);
  const [blurNsfw, setBlurNsfwState] = useState<boolean>(getInitialBlurNsfw);

  // Determine if NSFW content is allowed based on age rating
  const isNsfwAllowed = AGE_RATING_NSFW_MAP[ageRating];

  // Persist to localStorage when values change
  useEffect(() => {
    if (persistToLocalStorage) {
      localStorage.setItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`, ageRating);
    }
  }, [ageRating, persistToLocalStorage, storageKey]);

  useEffect(() => {
    if (persistToLocalStorage) {
      localStorage.setItem(`${storageKey}_${STORAGE_KEY_BLUR_NSFW}`, String(blurNsfw));
    }
  }, [blurNsfw, persistToLocalStorage, storageKey]);

  const setAgeRating = useCallback(
    (rating: AgeRating) => {
      setAgeRatingState(rating);

      // Auto-disable blur when switching to non-NSFW rating
      if (!AGE_RATING_NSFW_MAP[rating]) {
        setBlurNsfwState(false);
      }
    },
    []
  );

  const setBlurNsfw = useCallback(
    (blur: boolean) => {
      // Only allow blur to be enabled if NSFW content is allowed
      if (blur && !isNsfwAllowed) {
        return;
      }
      setBlurNsfwState(blur);
    },
    [isNsfwAllowed]
  );

  const resetFilters = useCallback(() => {
    setAgeRatingState(defaultAgeRating);
    setBlurNsfwState(defaultBlurNsfw);

    if (persistToLocalStorage) {
      localStorage.removeItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`);
      localStorage.removeItem(`${storageKey}_${STORAGE_KEY_BLUR_NSFW}`);
    }
  }, [defaultAgeRating, defaultBlurNsfw, persistToLocalStorage, storageKey]);

  return {
    ageRating,
    blurNsfw,
    setAgeRating,
    setBlurNsfw,
    resetFilters,
    isNsfwAllowed,
  };
}

// Helper function to validate age rating
function isValidAgeRating(value: string): boolean {
  return ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'].includes(value);
}
