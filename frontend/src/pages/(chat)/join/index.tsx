// frontend/src/pages/(chat)/join/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';

const JoinChatPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const [searchParams] = useSearchParams();

  // Capturar 'invite' da query string (renomeado de 'token' para evitar conflito com OAuth)
  let inviteToken = searchParams.get('invite');

  // Fallback: tentar pegar diretamente da window.location
  if (!inviteToken && typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    inviteToken = urlParams.get('invite');
  }

  console.log('[JoinChatPage] Component rendered', {
    conversationId,
    inviteToken: inviteToken ? `${inviteToken.substring(0, 20)}...` : null,
    hasInviteToken: !!inviteToken,
    searchParamsEntries: Array.from(searchParams.entries()),
    windowLocationSearch: typeof window !== 'undefined' ? window.location.search : null,
    fullUrl: typeof window !== 'undefined' ? window.location.href : null
  });

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const acceptInvite = async () => {
      console.log('[JoinChatPage] Starting acceptInvite', { inviteToken, conversationId });

      if (!inviteToken) {
        console.log('[JoinChatPage] No invite token found');
        setStatus('error');
        setErrorMessage(t('joinChat.invalidLink'));
        return;
      }

      if (!conversationId) {
        console.log('[JoinChatPage] No conversationId found');
        setStatus('error');
        setErrorMessage(t('joinChat.invalidLink'));
        return;
      }

      try {
        setStatus('loading');
        console.log('[JoinChatPage] Sending request to backend...');
        const response = await api.post(`/api/v1/conversations/${conversationId}/members/join-by-token`, {
          token: inviteToken
        });
        console.log('[JoinChatPage] Backend response:', response.data);

        setStatus('success');
        // Redirect to the conversation after 1 second
        setTimeout(() => {
          console.log('[JoinChatPage] Redirecting to chat...');
          navigate(`/chat/${conversationId}`, { replace: true });
        }, 1000);
      } catch (error: any) {
        console.error('[JoinChatPage] Error accepting invite:', error);
        console.error('[JoinChatPage] Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        setStatus('error');

        const responseMessage = error.response?.data?.message;

        if (responseMessage?.includes('already a member')) {
          setErrorMessage(t('joinChat.alreadyMember'));
          // Still redirect to chat after 2 seconds if already a member
          setTimeout(() => {
            navigate(`/chat/${conversationId}`, { replace: true });
          }, 2000);
        } else if (responseMessage?.includes('maximum')) {
          setErrorMessage(t('joinChat.conversationFull'));
        } else if (responseMessage?.includes('Invalid or expired')) {
          setErrorMessage(t('joinChat.invalidLink'));
        } else {
          setErrorMessage(responseMessage || t('joinChat.failed'));
        }
      }
    };

    acceptInvite();
  }, [inviteToken, conversationId, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-normal text-content p-4">
      <div className="max-w-md w-full bg-surface rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('joinChat.accepting')}</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-success">
                check_circle
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-success">
              {t('common.success')}
            </h2>
            <p className="text-muted">
              Redirecting to conversation...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <span className="material-symbols-outlined text-5xl text-danger">
                error
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-danger">
              {t('joinChat.errorTitle')}
            </h2>
            <p className="text-content mb-6">
              {errorMessage}
            </p>
            {/* Debug info */}
            <details className="text-left mb-4 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
              <summary className="cursor-pointer font-semibold">Debug Info</summary>
              <pre className="mt-2 overflow-auto">
                {JSON.stringify({
                  conversationId,
                  hasInviteToken: !!inviteToken,
                  inviteTokenPreview: inviteToken ? inviteToken.substring(0, 30) + '...' : null
                }, null, 2)}
              </pre>
            </details>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              {t('joinChat.goHome')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinChatPage;
