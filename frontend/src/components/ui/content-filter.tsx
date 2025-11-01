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
  availableAgeRatings,
  isNsfwAllowed = true,
}: ContentFilterProps) {
  const { t } = useTranslation(['common', 'characters']);

  const defaultAgeRatings: Array<{ value: string; label: string }> = [
    { value: 'L', label: t('characters:ageRatings.L', t('common:contentFilter.ageRatings.L', 'Free')) },
    { value: 'TEN', label: t('characters:ageRatings.TEN', t('common:contentFilter.ageRatings.TEN', '10+')) },
    { value: 'TWELVE', label: t('characters:ageRatings.TWELVE', t('common:contentFilter.ageRatings.TWELVE', '12+')) },
    { value: 'FOURTEEN', label: t('characters:ageRatings.FOURTEEN', t('common:contentFilter.ageRatings.FOURTEEN', '14+')) },
    { value: 'SIXTEEN', label: t('characters:ageRatings.SIXTEEN', t('common:contentFilter.ageRatings.SIXTEEN', '16+')) },
    { value: 'EIGHTEEN', label: t('characters:ageRatings.EIGHTEEN', t('common:contentFilter.ageRatings.EIGHTEEN', '18+')) },
  ];
  const ageRatingOptions = availableAgeRatings ?? defaultAgeRatings;

  return (
    <div className="bg-light p-2 rounded-lg shadow-sm flex flex-col sm:flex-row flex-wrap items-center gap-4">
      <div className="w-full sm:w-auto sm:min-w-[180px]">
        <ComboboxSelect
          label={t('common:contentFilter.ageRating', 'Age Rating')}
          options={ageRatingOptions}
          value={ageRating}
          onChange={onAgeRatingChange}
        />
      </div>
      {isNsfwAllowed && ageRating !== 'L' && (
        <Switch
          label={t('common:contentFilter.blurNsfw', 'Blur Explicit Content')}
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
