import { useTranslation } from 'react-i18next';

export function SessionsTab() {
  const { t } = useTranslation(['profile']);
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:sessions.title', 'Sessions')}</h2>
      <p className="mt-2 text-sm text-description">
        {t('profile:sessions.description', 'Manage your active sessions.')}
      </p>
      <div className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
        {t('profile:sessions.placeholder', 'Session management will be available soon.')}
      </div>
    </div>
  );
}
