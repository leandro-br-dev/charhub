import { useTranslation } from 'react-i18next';

export function PasswordTab() {
  const { t } = useTranslation(['profile']);
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:password.title', 'Password')}</h2>
      <p className="mt-2 text-sm text-description">
        {t('profile:password.description', 'Manage your password.')}
      </p>
      <div className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
        {t('profile:password.placeholder', 'Password management will be available soon.')}
      </div>
    </div>
  );
}
