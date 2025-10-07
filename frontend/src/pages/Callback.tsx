import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import type { AuthResponse, AuthUser, OAuthProvider } from '../types/auth';

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

export default function Callback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();
  const { t } = useTranslation(['callback', 'common']);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState(t('callback:processingMessage'));

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const token = searchParams.get('token');
    const providerParam = (searchParams.get('provider') as OAuthProvider | null) ?? 'google';
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    async function finalize() {
      console.debug('[callback] params', { error, token, providerParam, code, state });

      if (error) {
        setStatus('error');
        setMessage(errorDescription ?? t('callback:cancelledMessage'));
        return;
      }

      if (token) {
        const user = buildUserFromQuery(t('common:authenticatedUser'), searchParams, providerParam, token);
        console.debug('[callback] completing login with token', user);
        completeLogin(user);
        setStatus('success');
        setMessage(t('callback:redirectingMessage'));
        setTimeout(() => navigate('/dashboard', { replace: true }), 900);
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
          setStatus('success');
          setMessage(t('callback:redirectingMessage'));
          setTimeout(() => navigate('/dashboard', { replace: true }), 900);
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
  }, [completeLogin, navigate, searchParams, t]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-120px)] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-10 shadow-lg">
        {status === 'processing' ? (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <h1 className="mt-6 text-xl font-semibold text-white">{t('callback:processingTitle')}</h1>
            <p className="mt-3 text-sm text-slate-300">{message}</p>
          </>
        ) : null}

        {status === 'success' ? (
          <>
            <h1 className="text-2xl font-semibold text-white">{t('callback:successTitle')}</h1>
            <p className="mt-3 text-sm text-slate-300">{message}</p>
          </>
        ) : null}

        {status === 'error' ? (
          <>
            <h1 className="text-2xl font-semibold text-white">{t('callback:errorTitle')}</h1>
            <p className="mt-3 text-sm text-slate-300">{message}</p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
            >
              {t('callback:returnButton')}
            </Link>
          </>
        ) : null}
      </div>
    </section>
  );
}