import { useTranslation } from 'react-i18next';
import type { WelcomeFormData } from '../types';

interface GenderStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function GenderStep({ data, onUpdate }: GenderStepProps) {
  const { t } = useTranslation('welcome');

  // Backend expects: 'feminine', 'masculine', 'non-binary', 'unspecified'
  const GENDER_OPTIONS = [
    { value: 'masculine', label: t('gender.masculine', 'Masculine'), icon: '♂️' },
    { value: 'feminine', label: t('gender.feminine', 'Feminine'), icon: '♀️' },
    { value: 'non-binary', label: t('gender.nonBinary', 'Non-binary'), icon: '⚧️' },
    { value: 'unspecified', label: t('gender.preferNotToSay', 'Prefer not to say'), icon: '🤐' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('gender.title', 'Gender')}</h3>
        <p className="text-base text-muted-foreground">
          {t('gender.subtitle', 'Optional - helps agents personalize conversations')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENDER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUpdate({ gender: option.value })}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
              data.gender === option.value
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-3xl">{option.icon}</span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t('gender.description', 'This helps AI agents use appropriate pronouns and language')}
      </p>
    </div>
  );
}
