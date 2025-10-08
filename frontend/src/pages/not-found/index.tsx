import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound(): JSX.Element {
  const { t } = useTranslation('notFound');

  return (
    <section className="mx-auto flex min-h-[calc(100vh-120px)] max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-white">{t('title')}</h1>
      <p className="text-slate-300">{t('message')}</p>
      <Link
        to="/"
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
      >
        {t('returnButton')}
      </Link>
    </section>
  );
}