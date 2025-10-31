import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui';
import { userService } from '../../../services/userService';
import { useAuth } from '../../../hooks/useAuth';

export function DeleteAccountTab() {
  const { t } = useTranslation(['profile']);
  const { logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await userService.deleteCurrentUser();
      await logout();
    } catch (err) {
      setError('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full h-full flex-grow rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:deleteAccount.title', 'Delete Account')}</h2>
      <p className="mt-2 text-sm text-description">
        {t('profile:deleteAccount.description', 'Permanently delete your account and all of your content.')}
      </p>
      <div className="mt-4">
        <Button variant="danger" onClick={() => setIsModalOpen(true)}>
          {t('profile:deleteAccount.submit', 'Delete my account')}
        </Button>
      </div>

      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('profile:deleteAccount.confirmTitle', 'Are you absolutely sure?')}
        variant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-description">
            {t('profile:deleteAccount.confirmDescription', 'This action cannot be undone. This will permanently delete your account and remove your data from our servers.')}
          </p>
          <p className="text-sm text-description">
            {t('profile:deleteAccount.confirmInstruction', 'Please type \"DELETE\" to confirm.')}
          </p>
          <input
            type="text"
            className="w-full rounded-md border border-border bg-input p-2 text-sm text-title outline-none focus:ring-2 focus:ring-danger"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="light" onClick={() => setIsModalOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={confirmationInput !== 'DELETE' || isDeleting}
            >
              {isDeleting ? t('common:deleting', 'Deleting...') : t('profile:deleteAccount.confirmSubmit', 'Delete this account')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
