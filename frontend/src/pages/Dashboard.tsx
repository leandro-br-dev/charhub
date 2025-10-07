import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const { t } = useTranslation(['dashboard', 'common']);

  const providerKey = user?.provider ? `common.providerLabel.${user.provider}` : 'common.provider';
  const providerLabel = t(providerKey as any);
  const tokenDisplay = user?.token ?? t('common.tokenStored');

  return (
    <section className="mx-auto max-w-5xl space-y-10 px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{t('dashboard:title')}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          {t('dashboard:subtitle', { provider: providerLabel })}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard:accountDetails')}</h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">{t('dashboard:displayName')}</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{user?.displayName ?? 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">{t('dashboard:email')}</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{user?.email ?? 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">{t('dashboard:provider')}</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{providerLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">{t('dashboard:token')}</dt>
              <dd className="max-w-[16rem] truncate font-mono text-xs text-slate-500 dark:text-slate-400">{tokenDisplay}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard:nextSteps')}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
            <li>{t('dashboard:insightSyncUnity')}</li>
            <li>{t('dashboard:insightPersist')}</li>
            <li>{t('dashboard:insightTokens')}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}