import { Select } from '../../ui/Select';
import type { WelcomeFormData } from '../types';

interface LanguageStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
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
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Preferred Language 🌍</h3>
        <p className="text-muted-foreground">
          Choose your preferred language for AI responses and interface.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Select
            label="Language"
            options={LANGUAGE_OPTIONS}
            value={data.preferredLanguage || 'en'}
            onChange={(value) => onUpdate({ preferredLanguage: value })}
          />
          <p className="text-xs text-muted-foreground">
            This determines the language for AI conversations and user interface.
          </p>
        </div>
      </div>
    </div>
  );
}
