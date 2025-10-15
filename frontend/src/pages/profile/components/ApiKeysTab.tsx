import { useTranslation } from 'react-i18next';

export function ApiKeysTab() {
  const { t } = useTranslation(['profile']);
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:apiKeys.title', 'API Keys')}</h2>
      <p className="mt-2 text-sm text-description">
        {t('profile:apiKeys.description', 'Manage your API keys for external applications.')}
      </p>
      <div className="mt-4 rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted">
        {t('profile:apiKeys.placeholder', 'API key management will be available soon.')}
      </div>
    </div>
  );
}
