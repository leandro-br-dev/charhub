import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { ExternalAuthLayout } from '../layouts/ExternalAuthLayout';
import { Button } from '../components/ui/Button';

const GoogleIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
    <path
      fill="#EA4335"
      d="M24 9.5c3.9 0 6.9 1.5 9.2 3.6l6.9-6.9C35.9 2.2 30.5 0 24 0 14.9 0 7.3 5.4 4.1 12.8l7.7 6C13.4 12.5 18.3 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.2 24.6c0-1.6-.1-3.2-.4-4.7H24v9h12.5c-.6 3.1-2.3 5.7-5 7.6l7.2 5.6c4.2-3.9 6.7-9.5 6.7-16.1z"
    />
    <path
      fill="#FBBC05"
      d="M11.8 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.7-6C1.5 16.9 0 20.4 0 24s1.5 7.1 4.1 10.7l7.7-6z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.5 0 12-2.2 16.1-5.8L32.9 37c-2.1 1.4-4.9 2.3-7.9 2.3-5.7 0-10.6-3-12.3-7.1l-7.7 6C7.3 42.6 14.9 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const FacebookIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px" fill="white">
    <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06c0 5.05 3.68 9.26 8.44 9.92v-7H7.9v-2.91h2.54V9.92c0-2.5 1.5-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.76-.66 8.44-4.87 8.44-9.94C22 6.53 17.5 2.04 12 2.04z" />
  </svg>
);

export default function Signup(): JSX.Element {
  const { t } = useTranslation(['signup', 'common']);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState('');
  const { isAuthenticated, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleGoogleLogin = () => {
    setIsSigningUp(true);
    loginWithGoogle();
  };

  const handleFacebookLogin = () => {
    setIsSigningUp(true);
    loginWithFacebook();
  };

  const formDisabled = isAuthenticated || isSigningUp;

  if (isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen bg-normal text-content">
        {t('signup:checkingAuth')}
      </div>
    );
  }

  return (
    <ExternalAuthLayout showBackButton={true}>
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl text-title mt-6 sm:mt-8 tracking-widest">
          <strong className="me-2 sm:me-3 tracking-wider">
            {t('signup:greeting')}
          </strong>
        </h1>
        <p className="text-base sm:text-lg text-content mt-1 sm:mt-2">
          {t('signup:instruction')}
        </p>
      </div>

      <div className="my-8 flex flex-col gap-3 sm:gap-4">
        <Button
          onClick={handleGoogleLogin}
          variant="light"
          className="w-full border-gray-300 dark:border-gray-600 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-50 dark:hover:!bg-gray-700"
          disabled={formDisabled}
        >
          <GoogleIcon />
          <span className="ml-2">{t('signup:googleButton')}</span>
        </Button>
        <Button
          onClick={handleFacebookLogin}
          variant="dark"
          style={{ backgroundColor: '#1877F2' }}
          className="w-full !text-white hover:!opacity-90"
          disabled={formDisabled}
        >
          <FacebookIcon />
          <span className="ml-2">{t('signup:facebookButton')}</span>
        </Button>
      </div>

      <p className="text-xs text-center text-muted">
        {t('signup:termsAgreementPt1')}{' '}
        <a href="/terms" className="text-primary hover:underline font-semibold">
          {t('signup:termsAndConditions')}
        </a>
        {' '}{t('signup:termsAgreementAnd')}{' '}
        <a href="/privacy" className="text-primary hover:underline font-semibold">
          {t('signup:privacyPolicy')}
        </a>
        .
      </p>

      <div className="flex justify-center mt-6 sm:mt-8 text-sm">
        <span className={`text-content ${formDisabled ? 'opacity-50' : ''}`}>
          {t('signup:alreadyRegistered')}{' '}
          <Link to="/login" className={`text-primary ms-2 ${formDisabled ? 'pointer-events-none' : ''}`}>
            {t('signup:loginLink')}
          </Link>
        </span>
      </div>
    </ExternalAuthLayout>
  );
}
