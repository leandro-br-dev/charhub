import { useEffect, useMemo, useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { userService } from '../../../services/userService';
import { useToast } from '../../../contexts/ToastContext';

type ProfileFormState = {
  displayName: string;
  fullName: string;
  username: string;
  birthDate: string;
  gender: string;
};

type UsernameCheckState = 'idle' | 'checking' | 'available' | 'unavailable';

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation(['profile', 'common']);
  const { addToast } = useToast();

  const [formState, setFormState] = useState<ProfileFormState>(() => ({
    displayName: user?.displayName ?? '',
    fullName: user?.fullName ?? '',
    username: user?.username ? user.username.replace('@', '') : '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    gender: user?.gender ?? 'unspecified'
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheckState, setUsernameCheckState] = useState<UsernameCheckState>('idle');

  // Fetch user profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if we have a user ID and token
      if (!user?.id || !user?.token) {
        console.debug('[profile] skipping fetch - user not fully authenticated', {
          hasId: !!user?.id,
          hasToken: !!user?.token
        });
        return;
      }

      setIsLoading(true);
      try {
        const profile = await userService.fetchProfile();
        updateUser(profile);
        setFormState({
          displayName: profile.displayName ?? '',
          fullName: profile.fullName ?? '',
          username: profile.username ? profile.username.replace('@', '') : '',
          birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
          gender: profile.gender ?? 'unspecified'
        });
      } catch (error) {
        console.error('[profile] failed to fetch profile', error);
        // Only show toast if it's not an auth error (401)
        const isAuthError = error && typeof error === 'object' && 'response' in error &&
                           (error as any).response?.status === 401;
        if (isAuthError) {
          console.warn('[profile] authentication required - user may need to re-login');
          addToast(t('profile:errors.authenticationRequired', 'Please log in again to continue'), 'warning');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, user?.token]);

  useEffect(() => {
    setFormState({
      displayName: user?.displayName ?? '',
      fullName: user?.fullName ?? '',
      username: user?.username ? user.username.replace('@', '') : '',
      birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
      gender: user?.gender ?? 'unspecified'
    });
  }, [user]);

  // Debounced username check
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameCheckState('idle');
      return;
    }

    const fullUsername = `@${username}`;

    // If it's the current user's username, don't check
    if (user?.username === fullUsername) {
      setUsernameCheckState('idle');
      return;
    }

    setUsernameCheckState('checking');

    try {
      const response = await userService.checkUsernameAvailability(fullUsername);
      setUsernameCheckState(response.available ? 'available' : 'unavailable');
    } catch (error) {
      console.error('[profile] failed to check username', error);
      setUsernameCheckState('idle');
    }
  }, [user?.username]);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formState.username) {
        checkUsername(formState.username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formState.username, checkUsername]);

  const genders = useMemo(
    () => [
      { value: 'feminine', label: t('profile:genders.feminine', 'Female') },
      { value: 'masculine', label: t('profile:genders.masculine', 'Male') },
      { value: 'non-binary', label: t('profile:genders.nonBinary', 'Non-binary') },
      { value: 'unspecified', label: t('profile:genders.unspecified', 'Prefer not to say') }
    ],
    [t]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (name === 'username') {
      // Remove @ if user tries to type it
      const cleanValue = value.replace(/@/g, '');
      setFormState(prev => ({ ...prev, [name]: cleanValue }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDisplayName = formState.displayName.trim();
    if (!trimmedDisplayName) {
      addToast(t('profile:errors.displayNameRequired'), 'error');
      return;
    }

    const trimmedUsername = formState.username.trim();
    if (trimmedUsername && trimmedUsername.length < 3) {
      addToast(t('profile:errors.usernameTooShort'), 'error');
      return;
    }

    if (trimmedUsername && !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      addToast(t('profile:errors.usernameInvalid'), 'error');
      return;
    }

    if (usernameCheckState === 'unavailable') {
      addToast(t('profile:errors.usernameTaken'), 'error');
      return;
    }

    setIsSaving(true);

    try {
      const trimmedFullName = formState.fullName.trim();
      const payload = {
        username: trimmedUsername ? `@${trimmedUsername}` : undefined,
        displayName: trimmedDisplayName,
        fullName: trimmedFullName || undefined,
        birthDate: formState.birthDate || undefined,
        gender: formState.gender,
      };

      const updated = await userService.updateProfile(payload);
      updateUser({
        username: updated.username ?? undefined,
        displayName: updated.displayName,
        fullName: updated.fullName ?? undefined,
        birthDate: updated.birthDate ?? undefined,
        gender: updated.gender ?? undefined,
      });

      setFormState(prev => ({
        ...prev,
        username: updated.username ? updated.username.replace('@', '') : trimmedUsername,
        displayName: updated.displayName ?? trimmedDisplayName,
        fullName: updated.fullName ?? '',
        birthDate: updated.birthDate ? updated.birthDate.slice(0, 10) : '',
        gender: updated.gender ?? 'unspecified',
      }));

      addToast(t('profile:feedback.success'), 'success');
      setUsernameCheckState('idle');
    } catch (error) {
      console.error('[profile] failed to update user profile', error);
      const apiError = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      const errorMsg = apiError?.error || apiError?.message;

      // Provide user-friendly error messages
      if (errorMsg?.includes('Username is already taken')) {
        addToast(t('profile:errors.usernameTaken'), 'error');
      } else if (errorMsg?.includes('Validation')) {
        addToast(t('profile:errors.validationFailed'), 'error');
      } else {
        addToast(errorMsg || t('profile:errors.updateFailed'), 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormState({
      displayName: user?.displayName ?? '',
      fullName: user?.fullName ?? '',
      username: user?.username ? user.username.replace('@', '') : '',
      birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
      gender: user?.gender ?? 'unspecified'
    });
    setUsernameCheckState('idle');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:details.header')}</h2>
      <p className="text-sm text-description">
        {t('profile:details.description')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.displayName')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="displayName"
            value={formState.displayName}
            onChange={handleChange}
            placeholder={t('profile:fields.displayNamePlaceholder')}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.username')}</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 pl-7 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              name="username"
              value={formState.username}
              onChange={handleChange}
              placeholder={t('profile:fields.usernamePlaceholder')}
            />
            {usernameCheckState === 'checking' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                {t('profile:fields.usernameChecking')}
              </span>
            )}
            {usernameCheckState === 'available' && (
              <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {usernameCheckState === 'unavailable' && (
              <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-danger" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span className="text-xs text-muted">
            {usernameCheckState === 'available' ? (
              <span className="text-success">{t('profile:fields.usernameAvailable')}</span>
            ) : usernameCheckState === 'unavailable' ? (
              <span className="text-danger">{t('profile:fields.usernameUnavailable')}</span>
            ) : (
              t('profile:fields.usernameHint')
            )}
          </span>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.fullName')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="fullName"
            value={formState.fullName}
            onChange={handleChange}
            placeholder={t('profile:fields.fullNamePlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.email')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm"
            value={user?.email ?? ''}
            readOnly
          />
          <span className="text-xs text-muted">
            {t('profile:fields.emailHint')}
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.birthDate')}</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="birthDate"
            value={formState.birthDate}
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.gender')}</span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="gender"
            value={formState.gender}
            onChange={handleChange}
          >
            {genders.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="light" onClick={handleReset} disabled={isSaving}>
          {t('common:cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? t('profile:actions.saving') : t('profile:actions.save')}
        </Button>
      </div>
    </form>
  );
}
