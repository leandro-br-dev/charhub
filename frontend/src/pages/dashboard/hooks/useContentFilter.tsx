import { useState, useCallback, useEffect } from 'react';

type AgeRating = 'L' | 'TEN' | 'TWELVE' | 'FOURTEEN' | 'SIXTEEN' | 'EIGHTEEN';

interface UseContentFilterOptions {
  defaultAgeRatings?: AgeRating[];
  defaultBlurNsfw?: boolean;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

interface UseContentFilterReturn {
  ageRatings: AgeRating[];
  blurNsfw: boolean;
  setAgeRatings: (ratings: AgeRating[]) => void;
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

export function useContentFilter({
  defaultAgeRatings = ['L'],
  defaultBlurNsfw = false,
  persistToLocalStorage = true,
  storageKey = 'dashboard_content_filter',
}: UseContentFilterOptions = {}): UseContentFilterReturn {
  const getInitialAgeRatings = (): AgeRating[] => {
    if (persistToLocalStorage) {
      const stored = localStorage.getItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.every(isValidAgeRating)) {
            return parsed;
          }
        } catch (e) {
          // ignore invalid JSON
        }
      }
    }
    return defaultAgeRatings;
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

  const [ageRatings, setAgeRatingsState] = useState<AgeRating[]>(getInitialAgeRatings);
  const [blurNsfw, setBlurNsfwState] = useState<boolean>(getInitialBlurNsfw);

  const isNsfwAllowed = ageRatings.some(rating => AGE_RATING_NSFW_MAP[rating]);

  useEffect(() => {
    if (persistToLocalStorage) {
      localStorage.setItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`, JSON.stringify(ageRatings));
    }
  }, [ageRatings, persistToLocalStorage, storageKey]);

  useEffect(() => {
    if (persistToLocalStorage) {
      localStorage.setItem(`${storageKey}_${STORAGE_KEY_BLUR_NSFW}`, String(blurNsfw));
    }
  }, [blurNsfw, persistToLocalStorage, storageKey]);

  // Listen for external updates (header) via storage/custom event and sync local state
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (!ev.key) return;
      if (ev.key === `${storageKey}_${STORAGE_KEY_AGE_RATING}` && typeof ev.newValue === 'string') {
        try {
          const parsed = JSON.parse(ev.newValue);
          if (Array.isArray(parsed) && parsed.every(isValidAgeRating)) {
            setAgeRatingsState(parsed);
          }
        } catch {}
      }
      if (ev.key === `${storageKey}_${STORAGE_KEY_BLUR_NSFW}` && typeof ev.newValue === 'string') {
        setBlurNsfwState(ev.newValue === 'true');
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail as { ageRatings?: AgeRating[]; blurNsfw?: boolean } | undefined;
      if (detail?.ageRatings && Array.isArray(detail.ageRatings) && detail.ageRatings.every(isValidAgeRating)) {
        setAgeRatingsState(detail.ageRatings as AgeRating[]);
      }
      if (typeof detail?.blurNsfw === 'boolean') {
        setBlurNsfwState(detail.blurNsfw);
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('dashboard_content_filter:update', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('dashboard_content_filter:update', onCustom as EventListener);
    };
  }, [storageKey]);

  const setAgeRatings = useCallback(
    (ratings: AgeRating[]) => {
      setAgeRatingsState(ratings);

      const allowNsfw = ratings.some(rating => AGE_RATING_NSFW_MAP[rating]);
      if (!allowNsfw) {
        setBlurNsfwState(false);
      }
      try {
        window.dispatchEvent(new CustomEvent('dashboard_content_filter:update', { detail: { ageRatings: ratings } }));
      } catch {}
    },
    []
  );

  const setBlurNsfw = useCallback(
    (blur: boolean) => {
      if (blur && !isNsfwAllowed) {
        return;
      }
      setBlurNsfwState(blur);
    },
    [isNsfwAllowed]
  );

  const resetFilters = useCallback(() => {
    setAgeRatingsState(defaultAgeRatings);
    setBlurNsfwState(defaultBlurNsfw);

    if (persistToLocalStorage) {
      localStorage.removeItem(`${storageKey}_${STORAGE_KEY_AGE_RATING}`);
      localStorage.removeItem(`${storageKey}_${STORAGE_KEY_BLUR_NSFW}`);
    }
  }, [defaultAgeRatings, defaultBlurNsfw, persistToLocalStorage, storageKey]);

  return {
    ageRatings,
    blurNsfw,
    setAgeRatings,
    setBlurNsfw,
    resetFilters,
    isNsfwAllowed,
  };
}

function isValidAgeRating(value: string): boolean {
  return ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'].includes(value);
}

// Listen for cross-component updates via storage/custom event
// Note: We attach listeners at module level to avoid multiple registrations per hook instance
if (typeof window !== 'undefined') {
  const handler = (e: Event) => {
    // No-op: instances update via storage effect below
  };
  window.removeEventListener('dashboard_content_filter:update', handler as any);
  window.addEventListener('dashboard_content_filter:update', handler as any);
}
