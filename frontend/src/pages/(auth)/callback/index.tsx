import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import type { AuthResponse, AuthUser, OAuthProvider } from '../../../types/auth';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const defaultCallbackPaths: Record<OAuthProvider, string> = {
  google: `${API_PREFIX}/oauth/google/callback`,
  facebook: `${API_PREFIX}/oauth/facebook/callback`
};

const callbackPaths: Record<OAuthProvider, string> = {
  google: import.meta.env.VITE_GOOGLE_CALLBACK_PATH || defaultCallbackPaths.google,
  facebook: import.meta.env.VITE_FACEBOOK_CALLBACK_PATH || defaultCallbackPaths.facebook
};

function buildUserFromQuery(fallbackName: string, params: URLSearchParams, provider: OAuthProvider, token: string): AuthUser {
  const encoded = params.get('user');
  let decoded: Partial<AuthUser> | null = null;

  if (encoded) {
    try {
      decoded = JSON.parse(window.atob(encoded)) as Partial<AuthUser>;
    } catch (error) {
      console.warn('[callback] failed to decode user payload', error);
    }
  }

  return {
    id: decoded?.id ?? 'external-user',
    provider: decoded?.provider ?? provider,
    providerAccountId: decoded?.providerAccountId,
    displayName: decoded?.displayName ?? fallbackName,
    email: decoded?.email,
    photo: decoded?.photo,
    role: decoded?.role,
    token
  };
}

function cleanCallbackQueryParams(): void {
  const params = new URLSearchParams(window.location.search);
  ['token', 'user', 'provider', 'state', 'code', 'auth', 'error', 'error_description'].forEach(key => {
    if (params.has(key)) {
      params.delete(key);
    }
  });

  const next = params.toString();
  const target = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash ?? ''}`;
  window.history.replaceState(null, '', target);
}

export default function Callback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin, isAuthenticated, user } = useAuth();
  const { t } = useTranslation(['callback', 'common']);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState(t('callback:processingMessage'));

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const tokenFromQuery = searchParams.get('token');
    const providerParam = (searchParams.get('provider') as OAuthProvider | null) ?? 'google';
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const effectiveToken = tokenFromQuery ?? user?.token ?? undefined;

    async function finalize() {
      console.debug('[callback] params', {
        error,
        token: effectiveToken,
        providerParam,
        code,
        state,
        isAuthenticated
      });

      if (error) {
        setStatus('error');
        setMessage(errorDescription ?? t('callback:cancelledMessage'));
        return;
      }

      if (effectiveToken) {
        if (!isAuthenticated || !user?.token) {
          const resolvedUser = buildUserFromQuery(t('common:authenticatedUser'), searchParams, providerParam, effectiveToken);
          console.debug('[callback] completing login with token', resolvedUser);
          completeLogin(resolvedUser);
        }
        cleanCallbackQueryParams();
        setStatus('success');
        setMessage(t('callback:redirectingMessage'));
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
        return;
      }

      if (providerParam && code) {
        try {
          const callbackPath = callbackPaths[providerParam] ?? defaultCallbackPaths[providerParam];
          console.debug('[callback] exchanging code on client', { callbackPath });
          const response = await api.get<AuthResponse>(callbackPath, {
            params: {
              code,
              state
            }
          });

          completeLogin({ ...response.data.user, token: response.data.token });
          cleanCallbackQueryParams();
          setStatus('success');
          setMessage(t('callback:redirectingMessage'));
          setTimeout(() => navigate('/dashboard', { replace: true }), 100);
          return;
        } catch (err) {
          console.error('Callback exchange failed', err);
          setStatus('error');
          setMessage(t('callback:exchangeFailedMessage'));
          return;
        }
      }

      setStatus('error');
      setMessage(t('callback:missingParamsMessage'));
    }

    void finalize();
  }, [completeLogin, isAuthenticated, navigate, searchParams, t, user]);

  return (
    <section className="flex h-screen flex-col items-center justify-center bg-background">
      <div className="flex items-center gap-4 text-description">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-lg">{message}</p>
      </div>
    </section>
  );
}
