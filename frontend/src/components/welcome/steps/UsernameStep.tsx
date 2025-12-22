import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { useUsernameValidation, formatUsernameWithPrefix, removeUsernamePrefix } from '../../../hooks/useUsernameValidation';
import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';

interface UsernameStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function UsernameStep({ data, onUpdate }: UsernameStepProps) {
  const { t } = useTranslation('welcome');
  const { user } = useAuth();

  // Extract username without @ prefix for validation
  const usernameWithoutPrefix = data.username ? removeUsernamePrefix(data.username) : '';

  // Use custom hook for validation
  const { isChecking, isAvailable } = useUsernameValidation(usernameWithoutPrefix, {
    currentUsername: user?.username,
    minLength: 2,
  });

  // Pre-fill with current username
  useEffect(() => {
    if (user?.username && !data.username) {
      onUpdate({ username: user.username });
    }
  }, [user, data.username, onUpdate]);

  const handleUsernameChange = (value: string) => {
    // Remove @ if user types it, then add it back
    const formattedUsername = formatUsernameWithPrefix(value);
    onUpdate({ username: formattedUsername });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('username.title', 'Choose Your Username')}</h3>
        <p className="text-base text-muted-foreground">
          {t('username.subtitle', 'This is how other users will find you')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            {t('username.label', 'Username')}
          </label>
          <div className="relative">
            <Input
              id="username"
              placeholder={t('username.placeholder', 'e.g., johnsilva')}
              value={usernameWithoutPrefix}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
          </div>

          {isChecking && (
            <p className="text-sm text-muted-foreground">{t('username.checking', 'Checking availability...')}</p>
          )}

          {!isChecking && isAvailable === true && (
            <p className="text-sm text-green-600">✓ {t('username.available', 'Username available!')}</p>
          )}

          {!isChecking && isAvailable === false && (
            <p className="text-sm text-red-600">✗ {t('username.unavailable', 'Username already taken')}</p>
          )}

          <p className="text-sm text-muted-foreground">
            {t('username.description', 'Only letters, numbers, and underscores')}
          </p>
        </div>
      </div>
    </div>
  );
}
