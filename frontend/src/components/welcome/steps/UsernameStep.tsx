import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';
import api from '../../../lib/api';

interface UsernameStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function UsernameStep({ data, onUpdate }: UsernameStepProps) {
  const { t } = useTranslation('welcome');
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Pre-fill with current username
  useEffect(() => {
    if (user?.username && !data.username) {
      onUpdate({ username: user.username });
    }
  }, [user, data.username, onUpdate]);

  const checkUsername = async (username: string) => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      return;
    }

    // Add @ prefix if not present
    const formattedUsername = username.startsWith('@') ? username : `@${username}`;

    setIsChecking(true);
    try {
      const response = await api.get(`/api/v1/users/check-username/${formattedUsername}`);
      setIsAvailable(response.data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setIsAvailable(null);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Remove @ if user types it
    const cleanValue = value.replace('@', '');
    const formattedUsername = cleanValue ? `@${cleanValue}` : '';

    onUpdate({ username: formattedUsername });

    // Debounce username check
    const timeoutId = setTimeout(() => {
      if (formattedUsername) {
        checkUsername(formattedUsername);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
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
              placeholder={t('username.placeholder', 'e.g., @johnsilva')}
              value={data.username?.replace('@', '') || ''}
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
            {t('username.description', 'Must start with @ and contain only letters, numbers, and underscores')}
          </p>
        </div>
      </div>
    </div>
  );
}
