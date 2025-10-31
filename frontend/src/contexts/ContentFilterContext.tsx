import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type ContentFilterMode = 'none' | 'blur' | 'hidden';

interface ContentFilterContextValue {
  filterMode: ContentFilterMode;
  setFilterMode: (mode: ContentFilterMode) => void;
  shouldBlurContent: (ageRating: string, contentTags: string[]) => boolean;
  shouldHideContent: (ageRating: string, contentTags: string[]) => boolean;
}

const ContentFilterContext = createContext<ContentFilterContextValue | undefined>(undefined);

const STORAGE_KEY = 'charhub.contentFilter';

// Age ratings from least to most restrictive
const AGE_RATING_LEVELS: Record<string, number> = {
  L: 0,
  TEN: 1,
  TWELVE: 2,
  FOURTEEN: 3,
  SIXTEEN: 4,
  EIGHTEEN: 5,
};

// Sensitive content tags that trigger filtering
const SENSITIVE_TAGS = [
  'VIOLENCE',
  'GORE',
  'SEXUAL',
  'NUDITY',
  'HORROR',
  'PSYCHOLOGICAL',
  'DISCRIMINATION',
];

export function ContentFilterProvider({ children }: { children: ReactNode }) {
  const [filterMode, setFilterModeState] = useState<ContentFilterMode>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'none' || stored === 'blur' || stored === 'hidden') {
      return stored;
    }
    return 'blur'; // Default to blur mode
  });

  const setFilterMode = useCallback((mode: ContentFilterMode) => {
    setFilterModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const shouldBlurContent = useCallback(
    (ageRating: string, contentTags: string[]): boolean => {
      if (filterMode === 'none') return false;

      // Check age rating
      const ratingLevel = AGE_RATING_LEVELS[ageRating] ?? 0;
      if (ratingLevel >= AGE_RATING_LEVELS.SIXTEEN) return true;

      // Check sensitive tags
      const hasSensitiveTags = contentTags.some((tag) => SENSITIVE_TAGS.includes(tag));
      return hasSensitiveTags;
    },
    [filterMode]
  );

  const shouldHideContent = useCallback(
    (ageRating: string, contentTags: string[]): boolean => {
      if (filterMode !== 'hidden') return false;

      // In hidden mode, hide mature content
      const ratingLevel = AGE_RATING_LEVELS[ageRating] ?? 0;
      if (ratingLevel >= AGE_RATING_LEVELS.SIXTEEN) return true;

      // Hide if has sensitive tags
      const hasSensitiveTags = contentTags.some((tag) => SENSITIVE_TAGS.includes(tag));
      return hasSensitiveTags;
    },
    [filterMode]
  );

  return (
    <ContentFilterContext.Provider
      value={{
        filterMode,
        setFilterMode,
        shouldBlurContent,
        shouldHideContent,
      }}
    >
      {children}
    </ContentFilterContext.Provider>
  );
}

export function useContentFilter() {
  const context = useContext(ContentFilterContext);
  if (!context) {
    throw new Error('useContentFilter must be used within a ContentFilterProvider');
  }
  return context;
}
