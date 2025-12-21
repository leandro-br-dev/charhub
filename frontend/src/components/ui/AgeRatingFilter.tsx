import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SmartDropdown } from './SmartDropdown';
import { useContentFilter as useDashboardAgeFilter } from '../../pages/dashboard/hooks/useContentFilter';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';

const AGE_CODES = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'] as const;

type AgeRating = typeof AGE_CODES[number];

const AGE_RATING_MIN_AGE: Record<AgeRating, number> = {
  L: 0,
  TEN: 10,
  TWELVE: 12,
  FOURTEEN: 14,
  SIXTEEN: 16,
  EIGHTEEN: 18,
};

interface AgeRatingInfo {
  hasBirthDate: boolean;  // Fixed: was hasBirthdate (lowercase d)
  age: number | null;
  maxAllowedRating: AgeRating;
  currentMaxRating: AgeRating;
}

export function AgeRatingFilter(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { user } = useAuth();
  const { ageRatings, setAgeRatings } = useDashboardAgeFilter({ persistToLocalStorage: true });
  const [ageRatingInfo, setAgeRatingInfo] = useState<AgeRatingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize user data to trigger effect only when these specific fields change
  const userDataKey = useMemo(() => {
    if (!user) return 'no-user';
    return `${user.id}-${user.birthDate || 'no-birth'}-${user.hasCompletedWelcome}-${user.maxAgeRating}`;
  }, [user?.id, user?.birthDate, user?.hasCompletedWelcome, user?.maxAgeRating]);

  // Fetch age rating info from backend
  useEffect(() => {
    const fetchAgeRatingInfo = async () => {
      if (!user?.token) {
        setIsLoading(false);
        setAgeRatingInfo({
          hasBirthDate: false,
          age: null,
          maxAllowedRating: 'L',
          currentMaxRating: 'L',
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await api.get('/api/v1/users/me/age-rating-info');
        setAgeRatingInfo(response.data.data);
      } catch (error) {
        console.error('[AgeRatingFilter] Error fetching age rating info:', error);
        // Default to safe values if API fails
        setAgeRatingInfo({
          hasBirthDate: false,
          age: null,
          maxAllowedRating: 'L',
          currentMaxRating: 'L',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgeRatingInfo();
  }, [userDataKey, user?.token]);

  const selectedLabels = useMemo(() => {
    if (!ageRatings || ageRatings.length === 0) return t('characters:hub.filters.noFilter', 'Any');
    const labels = ageRatings
      .filter((code): code is typeof AGE_CODES[number] => (AGE_CODES as readonly string[]).includes(code))
      .map((code) => t(`characters:ageRatings.${code}`, code));
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [ageRatings, t]);

  // Check if a rating is disabled based on user's age
  const isRatingDisabled = (code: AgeRating): boolean => {
    if (isLoading || !ageRatingInfo) return code !== 'L';

    // If no birthdate, only L is allowed
    if (!ageRatingInfo.hasBirthDate) return code !== 'L';

    // Check if rating exceeds max allowed based on age
    const ratingMinAge = AGE_RATING_MIN_AGE[code];
    const maxAllowedAge = AGE_RATING_MIN_AGE[ageRatingInfo.maxAllowedRating];

    return ratingMinAge > maxAllowedAge;
  };

  // Toggle with auto-activation of inferior ratings
  const toggle = (code: AgeRating) => {
    // Don't allow toggling disabled ratings
    if (isRatingDisabled(code)) return;

    const exists = ageRatings.includes(code as any);

    if (!exists) {
      // Selecting: auto-activate all inferior ratings
      const codeMinAge = AGE_RATING_MIN_AGE[code];
      const inferiorRatings = AGE_CODES.filter(
        (c) => AGE_RATING_MIN_AGE[c] <= codeMinAge
      );

      // Merge with existing selections and remove duplicates
      const next = [...new Set([...ageRatings, ...inferiorRatings])];
      setAgeRatings(next as any);
    } else {
      // Deselecting: only remove this rating (don't auto-deselect inferiors)
      const next = ageRatings.filter((c) => c !== code);

      // Always keep at least 'L' selected
      if (next.length === 0) {
        setAgeRatings(['L'] as any);
      } else {
        setAgeRatings(next as any);
      }
    }
  };

  // Icon based on birthdate status
  const buttonIcon = ageRatingInfo?.hasBirthDate ? 'verified' : 'lock';

  return (
    <SmartDropdown
      buttonContent={
        <button
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-content transition-colors hover:bg-input hover:text-primary"
          aria-label={t('common:contentFilter.ageRating', 'Age Rating')}
          type="button"
        >
          <span className="material-symbols-outlined text-xl">{buttonIcon}</span>
          <span className="hidden text-sm font-medium sm:inline">{selectedLabels}</span>
          <span className="material-symbols-outlined text-base">expand_more</span>
        </button>
      }
      menuWidth="w-72"
    >
      <div className="py-1">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('common:contentFilter.ageRating', 'Age Rating')}
          </p>
        </div>

        {/* Warning for users without birthdate */}
        {!isLoading && ageRatingInfo && !ageRatingInfo.hasBirthDate && (
          <>
            <div className="mx-2 mb-2 rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-900/20">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {t('common:contentFilter.noBirthdateWarning', '⚠️ Age not registered')}
              </p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                {t(
                  'common:contentFilter.noBirthdateDescription',
                  'To access age-restricted content, please add your birthdate in settings.'
                )}
              </p>
              <Link
                to="/profile"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-yellow-800 hover:text-yellow-900 dark:text-yellow-200 dark:hover:text-yellow-100"
              >
                <span className="material-symbols-outlined text-sm">settings</span>
                {t('common:contentFilter.goToSettings', 'Go to Settings')}
              </Link>
            </div>
            <div className="mx-2 mb-1 border-t border-border" />
          </>
        )}

        {/* Age rating options */}
        {AGE_CODES.map((code) => {
          const label = t(`characters:ageRatings.${code}`, code);
          const isSelected = ageRatings.includes(code as any);
          const isDisabled = isRatingDisabled(code);

          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              disabled={isDisabled}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                isDisabled
                  ? 'cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'text-content hover:bg-input'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-primary' : 'text-muted'}`}>
                {isSelected ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className="flex-1 text-sm font-medium">{label}</span>
              {isDisabled && code !== 'L' && (
                <span className="text-xs text-muted-foreground">
                  {t('common:contentFilter.blocked', '(blocked)')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </SmartDropdown>
  );
}

export default AgeRatingFilter;

