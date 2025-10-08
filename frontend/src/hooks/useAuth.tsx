import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import type { AuthUser, OAuthProvider, UserRole } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginWithProvider: (provider: OAuthProvider) => void;
  loginWithGoogle: () => void;
  loginWithFacebook: () => void;
  completeLogin: (payload: AuthUser) => void;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'charhub.auth.user';
const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const CALLBACK_PATH = import.meta.env.VITE_AUTH_CALLBACK_PATH || '/auth/callback';
const defaultProviderPaths: Record<OAuthProvider, string> = {
  google: `${API_PREFIX}/oauth/google`,
  facebook: `${API_PREFIX}/oauth/facebook`
};

const providerPaths: Record<OAuthProvider, string> = {
  google: import.meta.env.VITE_GOOGLE_AUTH_PATH || defaultProviderPaths.google,
  facebook: import.meta.env.VITE_FACEBOOK_AUTH_PATH || defaultProviderPaths.facebook
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function consumeQueryParams(): AuthUser | null {
  if (window.location.pathname.startsWith(CALLBACK_PATH)) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) {
    return null;
  }

  const provider = (params.get('provider') as OAuthProvider | null) ?? 'google';
  const userParam = params.get('user');
  let decodedUser: Partial<AuthUser> | null = null;

  if (userParam) {
    try {
      const json = window.atob(userParam);
      decodedUser = JSON.parse(json) as Partial<AuthUser>;
    } catch (error) {
      console.warn('[auth] failed to decode user payload from query', error);
    }
  }

  params.delete('token');
  params.delete('user');
  params.delete('provider');
  if (params.get('auth') === 'success') {
    params.delete('auth');
  }
  params.delete('state');
  params.delete('code');

  const newQuery = params.toString();
  const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash ?? ''}`;
  window.history.replaceState(null, '', newUrl);

  return {
    id: decodedUser?.id ?? 'external-user',
    provider,
    providerAccountId: decodedUser?.providerAccountId,
    displayName: decodedUser?.displayName,
    email: decodedUser?.email,
    photo: decodedUser?.photo,
    role: decodedUser?.role as UserRole | undefined,
    token
  };
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const hydrated = consumeQueryParams();
      if (hydrated) {
        console.debug('[auth] consumed token from query');
        return hydrated;
      }

      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch (error) {
      console.warn('[auth] failed to hydrate state', error);
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      console.debug('[auth] stored user in localStorage', { provider: user.provider, id: user.id });
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      console.debug('[auth] cleared localStorage');
    }
  }, [user]);

  const loginWithProvider = (provider: OAuthProvider) => {
    const baseUrl = resolveApiBaseUrl() ?? window.location.origin;
    const callbackUrl = `${window.location.origin}${CALLBACK_PATH}`;
    const params = new URLSearchParams({
      redirect_uri: `${callbackUrl}?provider=${provider}`
    });

    const target = new URL(providerPaths[provider], baseUrl);
    target.search = params.toString();
    console.debug('[auth] redirecting to provider', { provider, target: target.toString() });
    window.location.href = target.toString();
  };

  const loginWithGoogle = () => loginWithProvider('google');
  const loginWithFacebook = () => loginWithProvider('facebook');

  const completeLogin = (payload: AuthUser) => {
    console.debug('[auth] completing login', { provider: payload.provider, id: payload.id });
    setUser(payload);
  };

  const logout = async () => {
    try {
      await api.post(`${API_PREFIX}/oauth/logout`);
    } catch (error) {
      console.warn('Failed to call logout endpoint', error);
    } finally {
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loginWithProvider,
      loginWithGoogle,
      loginWithFacebook,
      completeLogin,
      logout
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
