import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { ExternalAuthLayout } from '../../../layouts/ExternalAuthLayout';
import { OAuthButton } from '../shared/components';
import { useAuthRedirect } from '../shared/hooks';

export default function Login(): JSX.Element {
  const { t } = useTranslation(['login', 'common']);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { isAuthenticated, loginWithGoogle, loginWithFacebook, loginWithDevBypass } = useAuth();

  useAuthRedirect();

  const handleGoogleLogin = () => {
    setIsLoggingIn(true);
    loginWithGoogle();
  };

  const handleFacebookLogin = () => {
    setIsLoggingIn(true);
    loginWithFacebook();
  };

  const formDisabled = isLoggingIn || isAuthenticated;

  if (isAuthenticated) {
    return (
      <div className="flex flex-col justify-center items-center h-[100svh] bg-normal text-content gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="animate-pulse text-lg font-medium">{t('login:checkingAuth')}</p>
      </div>
    );
  }

  return (
    <ExternalAuthLayout showBackButton={true}>
      <div className="text-center w-full max-w-md mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mt-6 sm:mt-8 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-secondary animate-gradient-x">
            {t('login:greeting')}
          </span>
        </h1>
        <p className="text-base sm:text-lg text-description mt-2 mb-8">
          {t('login:instruction')}
        </p>

        <div className="flex flex-col gap-4">
          <OAuthButton
            provider="google"
            onClick={handleGoogleLogin}
            disabled={formDisabled}
          >
            {t('login:googleButton')}
          </OAuthButton>
          <OAuthButton
            provider="facebook"
            onClick={handleFacebookLogin}
            disabled={formDisabled}
          >
            {t('login:facebookButton')}
          </OAuthButton>
        </div>

        {/* Developer Bypass - Only in Development */}
        {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-3">
              Developer Access
            </p>
            <button
              onClick={() => loginWithDevBypass()}
              className="w-full group relative overflow-hidden py-3 px-4 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all duration-300 flex items-center justify-center gap-2 font-mono text-sm"
              disabled={formDisabled}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <span className="material-symbols-outlined text-lg">terminal</span>
              <span>Bypass Login (Admin)</span>
            </button>
          </div>
        )}

        <div className="flex justify-center mt-8 text-sm">
          <span className={`text-description ${formDisabled ? 'opacity-50' : ''}`}>
            {t('login:firstAccess')}
            <Link
              to="/signup"
              className={`ms-2 font-medium text-primary hover:text-secondary hover:underline transition-all ${formDisabled ? 'pointer-events-none' : ''}`}
            >
              {t('login:signupLink')}
            </Link>
          </span>
        </div>
      </div>
    </ExternalAuthLayout>
  );
}
