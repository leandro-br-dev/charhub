import { useTranslation } from 'react-i18next';

export function EndOfListMessage() {
  const { t } = useTranslation('dashboard');

  return (
    <div className="text-center py-8 text-muted">
      <p>{t('infiniteScroll.endOfList', 'Todos os personagens foram carregados')}</p>
    </div>
  );
}
