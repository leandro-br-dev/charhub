import { useTranslation } from 'react-i18next';
import { ComboboxSelect } from './combobox-select';
import Switch from './switch';

interface ContentFilterProps {
  ageRating: string;
  blurNsfw: boolean;
  onAgeRatingChange: (value: string) => void;
  onBlurNsfwChange: (value: boolean) => void;
  availableAgeRatings?: Array<{ value: string; label: string }>;
  isNsfwAllowed?: boolean;
}

export function ContentFilter({
  ageRating,
  blurNsfw,
  onAgeRatingChange,
  onBlurNsfwChange,
  availableAgeRatings = [
    { value: 'L', label: 'All Ages (L)' },
    { value: 'TEN', label: '10+' },
    { value: 'TWELVE', label: '12+' },
    { value: 'FOURTEEN', label: '14+' },
    { value: 'SIXTEEN', label: '16+' },
    { value: 'EIGHTEEN', label: '18+' },
  ],
  isNsfwAllowed = true,
}: ContentFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-light p-2 rounded-lg shadow-sm flex flex-col sm:flex-row flex-wrap items-center gap-4">
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <ComboboxSelect
          label={t('contentFilter.ageRating', 'Age Rating')}
          options={availableAgeRatings}
          value={ageRating}
          onChange={onAgeRatingChange}
        />
      </div>
      {isNsfwAllowed && ageRating !== 'L' && (
        <Switch
          label={t('contentFilter.blurNsfw', 'Blur Explicit Content')}
          checked={blurNsfw}
          onChange={onBlurNsfwChange}
          stateLabels={{
            true: t('common.enabled', 'Enabled'),
            false: t('common.disabled', 'Disabled'),
          }}
          variant={blurNsfw ? 'danger' : 'secondary'}
        />
      )}
    </div>
  );
}
