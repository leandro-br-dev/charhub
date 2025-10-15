import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { userService } from '../../../services/userService';

type ProfileFormState = {
  displayName: string;
  fullName: string;
  username: string;
  birthDate: string;
  gender: string;
};

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation(['profile', 'common']);

  const [formState, setFormState] = useState<ProfileFormState>(() => ({
    displayName: user?.displayName ?? '',
    fullName: user?.fullName ?? '',
    username: user?.username ?? '',
    birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
    gender: user?.gender ?? 'unspecified'
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState({
      displayName: user?.displayName ?? '',
      fullName: user?.fullName ?? '',
      username: user?.username ?? '',
      birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
      gender: user?.gender ?? 'unspecified'
    });
  }, [user]);

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
    setStatus('idle');
    setErrorMessage(null);
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDisplayName = formState.displayName.trim();
    if (!trimmedDisplayName) {
      setStatus('error');
      setErrorMessage('profile:errors.displayNameRequired');
      return;
    }

    setIsSaving(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      const trimmedFullName = formState.fullName.trim();
      const trimmedUsername = formState.username.trim();
      const payload = {
        username: trimmedUsername,
        displayName: trimmedDisplayName,
        fullName: trimmedFullName,
        birthDate: formState.birthDate,
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
        username: updated.username ?? trimmedUsername,
        displayName: updated.displayName ?? trimmedDisplayName,
        fullName: updated.fullName ?? '',
        birthDate: updated.birthDate ? updated.birthDate.slice(0, 10) : '',
        gender: updated.gender ?? 'unspecified',
      }));

      setStatus('success');
    } catch (error) {
      console.error('[profile] failed to update user profile', error);
      const apiError = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      setErrorMessage(apiError?.error || apiError?.message || 'profile:errors.updateFailed');
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormState({
      displayName: user?.displayName ?? '',
      fullName: user?.fullName ?? '',
      username: user?.username ?? '',
      birthDate: user?.birthDate ? user.birthDate.slice(0, 10) : '',
      gender: user?.gender ?? 'unspecified'
    });
    setStatus('idle');
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:details.header', 'Public details')}</h2>
      <p className="text-sm text-description">
        {t('profile:details.description', 'These values are shared with collaborators and used as defaults in conversations.')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.displayName', 'Display name')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="displayName"
            value={formState.displayName}
            onChange={handleChange}
            placeholder={t('profile:fields.displayNamePlaceholder', 'How other users address you')}
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.username', 'Username')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="username"
            value={formState.username}
            onChange={handleChange}
            placeholder={t('profile:fields.usernamePlaceholder', '@username')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.fullName', 'Full name')}</span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="fullName"
            value={formState.fullName}
            onChange={handleChange}
            placeholder={t('profile:fields.fullNamePlaceholder', 'Optional for billing and e-mail copies')}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.email', 'E-mail')}</span>
          <input
            className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-content shadow-sm"
            value={user?.email ?? ''}
            readOnly
          />
          <span className="text-xs text-muted">
            {t('profile:fields.emailHint', 'Managed by your authentication provider.')}
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.birthDate', 'Birth date')}</span>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="birthDate"
            value={formState.birthDate}
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('profile:fields.gender', 'Gender')}</span>
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="light" onClick={handleReset} disabled={isSaving}>
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? t('profile:actions.saving', 'Saving...') : t('profile:actions.save', 'Save changes')}
          </Button>
        </div>
        {status === 'success' ? (
          <p className="text-sm text-success">{t('profile:feedback.success', 'Profile updated successfully.')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-danger">
            {t(errorMessage ?? 'profile:feedback.error', { defaultValue: errorMessage ?? 'We could not save your changes.' })}
          </p>
        ) : null}
      </div>
    </form>
  );
}
