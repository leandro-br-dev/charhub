import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SmartDropdown } from './SmartDropdown';
import { useContentFilter as useDashboardAgeFilter } from '../../pages/dashboard/hooks/useContentFilter';

const AGE_CODES = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'] as const;

export function AgeRatingFilter(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { ageRatings, setAgeRatings } = useDashboardAgeFilter({ persistToLocalStorage: true });

  const selectedLabels = useMemo(() => {
    if (!ageRatings || ageRatings.length === 0) return t('characters:hub.filters.noFilter', 'Any');
    const labels = ageRatings
      .filter((code): code is typeof AGE_CODES[number] => (AGE_CODES as readonly string[]).includes(code))
      .map((code) => t(`characters:ageRatings.${code}`, code));
    if (labels.length <= 2) return labels.join(', ');
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
  }, [ageRatings, t]);

  const toggle = (code: typeof AGE_CODES[number]) => {
    const exists = ageRatings.includes(code as any);
    const next = exists ? ageRatings.filter((c) => c !== code) : [...ageRatings, code as any];
    setAgeRatings(next as any);
  };

  return (
    <SmartDropdown
      buttonContent={
        <button
          className="flex h-10 items-center gap-2 rounded-lg px-3 text-content transition-colors hover:bg-input hover:text-primary"
          aria-label={t('common:contentFilter.ageRating', 'Age Rating')}
          type="button"
        >
          <span className="material-symbols-outlined text-xl">verified</span>
          <span className="hidden text-sm font-medium sm:inline">{selectedLabels}</span>
          <span className="material-symbols-outlined text-base">expand_more</span>
        </button>
      }
      menuWidth="w-60"
    >
      <div className="py-1">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('common:contentFilter.ageRating', 'Age Rating')}
          </p>
        </div>
        {AGE_CODES.map((code) => {
          const label = t(`characters:ageRatings.${code}`, code);
          const isSelected = ageRatings.includes(code as any);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                isSelected ? 'bg-primary/10 text-primary' : 'text-content hover:bg-input'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-primary' : 'text-muted'}`}>
                {isSelected ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </SmartDropdown>
  );
}

export default AgeRatingFilter;

