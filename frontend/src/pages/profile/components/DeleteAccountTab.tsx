import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';

export function DeleteAccountTab() {
  const { t } = useTranslation(['profile']);
  return (
    <div className="rounded-xl border border-danger/50 bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-danger">{t('profile:deleteAccount.title', 'Delete Account')}</h2>
      <p className="mt-2 text-sm text-description">
        {t('profile:deleteAccount.description', 'Permanently delete your account and all of your content.')}
      </p>
      <div className="mt-4">
        <Button variant="danger">
          {t('profile:deleteAccount.submit', 'Delete my account')}
        </Button>
      </div>
    </div>
  );
}
