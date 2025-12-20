import { useState } from 'react';
import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';
import api from '../../../lib/api';

interface UsernameStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function UsernameStep({ data, onUpdate }: UsernameStepProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const checkUsername = async (username: string) => {
    if (!username || username.length < 2) {
      setIsAvailable(null);
      return;
    }

    // Add @ prefix if not present
    const formattedUsername = username.startsWith('@') ? username : `@${username}`;

    setIsChecking(true);
    try {
      const response = await api.get(`/users/check-username/${formattedUsername}`);
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
        <h3 className="text-2xl font-bold">Choose Your Username</h3>
        <p className="text-muted-foreground">
          This is how other users will find and mention you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <div className="relative">
            <Input
              id="username"
              placeholder="username"
              value={data.username?.replace('@', '') || ''}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="pl-8"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
          </div>

          {isChecking && (
            <p className="text-xs text-muted-foreground">Checking availability...</p>
          )}

          {!isChecking && isAvailable === true && (
            <p className="text-xs text-green-600">✓ Username is available</p>
          )}

          {!isChecking && isAvailable === false && (
            <p className="text-xs text-red-600">✗ Username is already taken</p>
          )}

          <p className="text-xs text-muted-foreground">
            Choose a unique username. You can skip this step and set it later.
          </p>
        </div>
      </div>
    </div>
  );
}
