import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';

type ProfileFormState = {
  displayName: string;
  fullName: string;
  username: string;
  birthDate: string;
  gender: string;
};

export default function ProfilePage(): JSX.Element {
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);

  const [formState, setFormState] = useState<ProfileFormState>(() => ({
    displayName: user?.displayName ?? '',
    fullName: '',
    username: user?.id ?? '',
    birthDate: '',
    gender: 'unspecified'
  }));

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
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO(profile): connect to user settings endpoint once available.
  };

  const handleReset = () => {
    setFormState({
      displayName: user?.displayName ?? '',
      fullName: '',
      username: user?.id ?? '',
      birthDate: '',
      gender: 'unspecified'
    });
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('profile:sectionTitle', 'Account')}</p>
        <h1 className="text-3xl font-semibold text-title">{t('profile:title', 'Manage your profile')}</h1>
        <p className="max-w-2xl text-sm text-description">
          {t(
            'profile:subtitle',
            'Update how other people see you on CharHub. Preferences that are still being migrated will appear here soon.'
          )}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-title">{t('profile:identity.header', 'Profile photo')}</h2>
          <p className="mt-2 text-sm text-description">
            {t('profile:identity.description', 'Pick an avatar to represent you across chats and characters.')}
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <Button variant="light" size="small" icon="upload">
              {t('profile:identity.upload', 'Upload image')}
            </Button>
            <p className="text-xs text-muted">
              {t('profile:identity.placeholderNote', 'Avatar uploads will be available after we reconnect the media service.')}
            </p>
          </div>
        </div>

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
              <span className="font-medium text-content">{t('profile:fields.username', 'User ID')}</span>
              <input
                className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-content shadow-sm"
                name="username"
                value={formState.username}
                onChange={handleChange}
                placeholder={t('profile:fields.usernamePlaceholder', 'Unique identifier')}
                readOnly
              />
              <span className="text-xs text-muted">
                {t('profile:fields.usernameHint', 'This identifier comes from your OAuth provider and cannot be changed yet.')}
              </span>
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

          <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
            {/* TODO(profile-preferences): Migration pending. Restore content filters, age rating controls and sensitive themes here. */}
            {t(
              'profile:preferences.placeholder',
              'Content preferences, blur settings and sensitive themes will return once the moderation service is integrated.'
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="light" onClick={handleReset}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('profile:actions.save', 'Save changes')}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-title">{t('profile:security.header', 'Security')}</h2>
        <p className="text-sm text-description">
          {t(
            'profile:security.description',
            'Your CharHub sessions inherit OAuth security from Google or Facebook. Multi-factor support will be added soon.'
          )}
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
          {/* TODO(profile-security): Add OAuth session management, connected accounts and device list. */}
          {t('profile:security.placeholder', 'Session management and passwordless login controls are on the roadmap.')}
        </div>
      </div>
    </section>
  );
}
