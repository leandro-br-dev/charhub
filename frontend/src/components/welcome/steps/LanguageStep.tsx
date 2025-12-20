import { useTranslation } from 'react-i18next';
import { Select } from '../../ui/Select';
import type { WelcomeFormData } from '../types';

interface LanguageStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'es-ES', label: 'Español' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'ru-RU', label: 'Русский' },
  { value: 'ar-SA', label: 'العربية' },
  { value: 'hi-IN', label: 'हिन्दी' },
];

export function LanguageStep({ data, onUpdate }: LanguageStepProps) {
  const { t } = useTranslation('welcome');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('language.title', 'Preferred Language')}</h3>
        <p className="text-base text-muted-foreground">
          {t('language.subtitle', 'Choose your preferred language for AI responses and interface')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Select
            label={t('language.label', 'Language')}
            options={LANGUAGE_OPTIONS}
            value={data.preferredLanguage || 'en-US'}
            onChange={(value) => onUpdate({ preferredLanguage: value })}
          />
          <p className="text-sm text-muted-foreground">
            {t('language.description', 'This determines the language for AI conversations and user interface')}
          </p>
        </div>
      </div>
    </div>
  );
}
