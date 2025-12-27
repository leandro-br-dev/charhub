import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { resolveApiBaseUrl } from '../lib/resolveApiBaseUrl';
import type { AuthUser, OAuthProvider, UserRole } from '../types/auth';
import { toDataURL } from '../lib/image';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loginWithProvider: (provider: OAuthProvider) => void;
  loginWithGoogle: () => void;
  loginWithFacebook: () => void;
  loginWithDevBypass: () => void;
  completeLogin: (payload: AuthUser) => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'charhub.auth.user';
const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const CALLBACK_PATH = import.meta.env.VITE_AUTH_CALLBACK_PATH || '/auth/callback';
const defaultProviderPaths: Record<OAuthProvider, string> = {
  google: `${API_PREFIX}/oauth/google`,
  facebook: `${API_PREFIX}/oauth/facebook`,
  dev: '#'
};

const providerPaths: Record<OAuthProvider, string> = {
  google: import.meta.env.VITE_GOOGLE_AUTH_PATH || defaultProviderPaths.google,
  facebook: import.meta.env.VITE_FACEBOOK_AUTH_PATH || defaultProviderPaths.facebook,
  dev: '#'
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

  // Extract ALL fields from decodedUser
  return {
    id: decodedUser?.id ?? 'external-user',
    provider,
    providerAccountId: decodedUser?.providerAccountId,
    displayName: decodedUser?.displayName,
    email: decodedUser?.email,
    photo: decodedUser?.photo,
    fullName: decodedUser?.fullName,
    birthDate: decodedUser?.birthDate,
    gender: decodedUser?.gender,
    role: decodedUser?.role as UserRole | undefined,
    username: decodedUser?.username,
    preferredLanguage: decodedUser?.preferredLanguage,
    hasCompletedWelcome: decodedUser?.hasCompletedWelcome,
    maxAgeRating: decodedUser?.maxAgeRating,
    blockedTags: decodedUser?.blockedTags,
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

  const [isPhotoCached, setIsPhotoCached] = useState(false);

  useEffect(() => {
    if (user?.photo && user.photo.startsWith('http') && !isPhotoCached) {
      toDataURL(user.photo)
        .then(dataUrl => {
          updateUser({ photo: dataUrl });
          setIsPhotoCached(true);
        })
        .catch(error => {
          console.warn('[auth] failed to cache photo', error);
        });
    }
  }, [user, isPhotoCached]);

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

  const loginWithProvider = useCallback((provider: OAuthProvider) => {
    const baseUrl = resolveApiBaseUrl() ?? window.location.origin;
    const callbackUrl = `${window.location.origin}${CALLBACK_PATH}`;

    // Get current language from localStorage (set by i18next)
    const preferredLanguage = window.localStorage.getItem('i18nextLng');

    const params = new URLSearchParams({
      redirect_uri: `${callbackUrl}?provider=${provider}`
    });

    // Add preferredLanguage to params if available
    if (preferredLanguage) {
      params.append('preferredLanguage', preferredLanguage);
    }

    const target = new URL(providerPaths[provider], baseUrl);
    target.search = params.toString();
    console.debug('[auth] redirecting to provider', { provider, preferredLanguage, target: target.toString() });
    window.location.href = target.toString();
  }, []);

  const loginWithGoogle = useCallback(() => loginWithProvider('google'), [loginWithProvider]);
  const loginWithFacebook = useCallback(() => loginWithProvider('facebook'), [loginWithProvider]);

  const completeLogin = useCallback((payload: AuthUser) => {
    console.debug('[auth] completing login', { provider: payload.provider, id: payload.id });
    setUser(payload);
    setIsPhotoCached(false);
  }, []);

  const loginWithDevBypass = useCallback(() => {
    const devUser: AuthUser = {
      id: '00000000-0000-0000-0000-000000000000',
      provider: 'dev',
      providerAccountId: 'dev-admin',
      displayName: 'Dev Admin',
      email: 'admin@charhub.dev',
      role: 'ADMIN',
      token: 'dev-bypass-token',
      hasCompletedWelcome: true, // skip welcome screen
      preferredLanguage: window.localStorage.getItem('i18nextLng') || 'pt-BR'
    };
    completeLogin(devUser);
  }, [completeLogin]);

  const refreshUser = useCallback(async () => {
    if (!user?.token) {
      console.warn('[auth] cannot refresh user without token');
      return;
    }

    try {
      const response = await api.get(`${API_PREFIX}/users/me`);
      const userData = response.data.data;

      // Merge with existing user data (keep token and provider info)
      setUser(prev => prev ? { ...prev, ...userData } : null);
      console.debug('[auth] user refreshed from backend');
    } catch (error) {
      console.error('[auth] failed to refresh user', error);
    }
  }, [user?.token]);

  const logout = useCallback(async () => {
    try {
      await api.post(`${API_PREFIX}/oauth/logout`);
    } catch (error) {
      console.warn('Failed to call logout endpoint', error);
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : prev));
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loginWithProvider,
      loginWithGoogle,
      loginWithFacebook,
      loginWithDevBypass,
      completeLogin,
      updateUser,
      refreshUser,
      logout
    }),
    [user, loginWithProvider, loginWithGoogle, loginWithFacebook, completeLogin, updateUser, refreshUser, logout]
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
