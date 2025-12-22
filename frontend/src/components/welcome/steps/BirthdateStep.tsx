import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';

interface BirthdateStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function BirthdateStep({ data, onUpdate }: BirthdateStepProps) {
  const { t } = useTranslation('welcome');

  // Convert ISO string to YYYY-MM-DD format for input
  const dateValue = data.birthDate ? data.birthDate.split('T')[0] : '';

  const handleDateChange = (value: string) => {
    // Send YYYY-MM-DD format (backend expects this, not ISO string)
    onUpdate({ birthDate: value || '' });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('birthDate.title', 'Your Birthdate')}</h3>
        <p className="text-base text-muted-foreground">
          {t('birthDate.subtitle', 'Required for age-appropriate content filtering')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="birthDate" className="block text-sm font-medium">
            {t('birthDate.label', 'Birthdate')}
          </label>
          <Input
            id="birthDate"
            type="date"
            value={dateValue}
            onChange={(e) => handleDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <p className="text-sm text-muted-foreground">
            {t('birthDate.note', "Your birthdate is private and won't be shared publicly")}
          </p>
        </div>
      </div>
    </div>
  );
}
