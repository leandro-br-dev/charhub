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
  const { isAuthenticated, loginWithGoogle, loginWithFacebook } = useAuth();

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
      <div className="flex justify-center items-center h-[100svh] bg-normal text-content">
        {t('login:checkingAuth')}
      </div>
    );
  }

  return (
    <ExternalAuthLayout showBackButton={true}>
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl text-title mt-6 sm:mt-8 tracking-widest">
          <strong className="me-2 sm:me-3 tracking-wider">
            {t('login:greeting')}
          </strong>
        </h1>
        <p className="text-base sm:text-lg text-content mt-1 sm:mt-2">
          {t('login:instruction')}
        </p>
      </div>

      <div className="my-8 flex flex-col gap-3 sm:gap-4">
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

      <div className="flex justify-center mt-4 sm:mt-6 text-sm">
        <span className={`text-content ${formDisabled ? 'opacity-50' : ''}`}>
          {t('login:firstAccess')}
          <Link to="/signup" className={`text-primary ms-2 ${formDisabled ? 'pointer-events-none' : ''}`}>
            {t('login:signupLink')}
          </Link>
        </span>
      </div>
    </ExternalAuthLayout>
  );
}
