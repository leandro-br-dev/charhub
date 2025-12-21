import { useTranslation } from 'react-i18next';
import type { WelcomeFormData } from '../types';

interface AgeRatingStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function AgeRatingStep({ data, onUpdate }: AgeRatingStepProps) {
  const { t } = useTranslation('welcome');

  // Calculate user's age if birthdate is provided
  const userAge = data.birthDate ? calculateAge(new Date(data.birthDate)) : null;

  const AGE_RATING_OPTIONS = [
    { value: 'L', label: t('ageRating.options.L', 'All Ages (L)'), minAge: 0, description: t('ageRating.optionDescriptions.L', 'Suitable for everyone') },
    { value: 'TEN', label: t('ageRating.options.TEN', '10+'), minAge: 10, description: t('ageRating.optionDescriptions.TEN', 'Mild themes') },
    { value: 'TWELVE', label: t('ageRating.options.TWELVE', '12+'), minAge: 12, description: t('ageRating.optionDescriptions.TWELVE', 'Moderate themes') },
    { value: 'FOURTEEN', label: t('ageRating.options.FOURTEEN', '14+ (Teen)'), minAge: 14, description: t('ageRating.optionDescriptions.FOURTEEN', 'More mature themes') },
    { value: 'SIXTEEN', label: t('ageRating.options.SIXTEEN', '16+ (Mature)'), minAge: 16, description: t('ageRating.optionDescriptions.SIXTEEN', 'Strong themes') },
    { value: 'EIGHTEEN', label: t('ageRating.options.EIGHTEEN', '18+ (Adult)'), minAge: 18, description: t('ageRating.optionDescriptions.EIGHTEEN', 'Adult content') },
  ];

  // Determine which ratings are available based on age
  const isRatingAvailable = (minAge: number) => {
    if (userAge === null) return minAge === 0; // Only "All Ages" if no birthdate
    return userAge >= minAge;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('ageRating.title', 'Content Rating Preference')}</h3>
        <p className="text-base text-muted-foreground">
          {t('ageRating.subtitle', 'Choose the maximum age rating you want to see')}
        </p>
      </div>

      <div className="space-y-2">
        {AGE_RATING_OPTIONS.map((option) => {
          const isAvailable = isRatingAvailable(option.minAge);
          const isSelected = data.maxAgeRating === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => isAvailable && onUpdate({ maxAgeRating: option.value })}
              disabled={!isAvailable}
              className={`w-full rounded-lg border-2 p-2.5 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : isAvailable
                  ? 'border-border hover:border-primary/50'
                  : 'cursor-not-allowed border-border/50 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
                {isSelected && <span className="text-lg text-primary">✓</span>}
                {!isAvailable && <span className="text-lg text-muted-foreground">🔒</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
