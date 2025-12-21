import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';

interface DisplayNameStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function DisplayNameStep({ data, onUpdate }: DisplayNameStepProps) {
  const { t } = useTranslation('welcome');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('displayName.title', 'How would you like to be called?')}</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-medium">
            {t('displayName.label', 'Display Name')}
          </label>
          <Input
            id="displayName"
            placeholder={t('displayName.placeholder', 'e.g., John Silva')}
            value={data.displayName || ''}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
