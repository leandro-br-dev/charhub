// frontend/src/pages/(chat)/shared/components/ShareInviteLinkModal.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui';
import { Button } from '../../../../components/ui/Button';
import api from '../../../../lib/api';
import { extractErrorMessage } from '../../../../utils/apiErrorHandler';

interface ShareInviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ShareInviteLinkModal: React.FC<ShareInviteLinkModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { t } = useTranslation('chat');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !link) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/generate-invite-link`
      );
      setLink(response.data.data.link);
    } catch (err: unknown) {
      console.error('[ShareInviteLinkModal] Error generating link:', err);
      const message = extractErrorMessage(err) || t('shareInvite.generateFailed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleClose = () => {
    setLink(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('shareInvite.title')}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t('shareInvite.description')}
        </p>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="text-danger text-sm text-center p-3 bg-danger/10 rounded">
            {error}
          </div>
        )}

        {link && !loading && (
          <>
            <div className="flex gap-2">
              <Input
                type="text"
                value={link}
                readOnly
                className="flex-grow font-mono text-sm select-all"
                onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                  e.currentTarget.select();
                }}
              />
              <Button
                variant="primary"
                icon={copied ? "check" : "content_copy"}
                onClick={copyToClipboard}
                title={copied ? t('shareInvite.copied') : t('shareInvite.copy')}
              >
                {copied ? t('shareInvite.copied') : t('shareInvite.copy')}
              </Button>
            </div>

            <p className="text-xs text-muted flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {t('shareInvite.expiresIn', { days: 7 })}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ShareInviteLinkModal;
