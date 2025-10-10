import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { ExternalAuthLayout } from '../../../layouts/ExternalAuthLayout';
import { DataDeletionInstructionsModal, OAuthButton, PrivacyPolicyModal, TermsOfServiceModal } from '../shared/components';
import { useAuthRedirect } from '../shared/hooks';

export default function Signup(): JSX.Element {
  const { t } = useTranslation(['signup', 'common']);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState('');
  const [activeLegalModal, setActiveLegalModal] = useState<'terms' | 'privacy' | 'dataDeletion' | null>(null);
  const { isAuthenticated, loginWithGoogle, loginWithFacebook } = useAuth();

  useAuthRedirect();

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    setIsSigningUp(true);
    loginWithGoogle();
  };

  const handleFacebookLogin = () => {
    setIsSigningUp(true);
    loginWithFacebook();
  };

  const formDisabled = isAuthenticated || isSigningUp;

  const openTermsModal = () => setActiveLegalModal('terms');
  const openPrivacyModal = () => setActiveLegalModal('privacy');
  const closeLegalModal = () => setActiveLegalModal(null);

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
        <OAuthButton
          provider="google"
          onClick={handleGoogleLogin}
          disabled={formDisabled}
        >
          {t('signup:googleButton')}
        </OAuthButton>
        <OAuthButton
          provider="facebook"
          onClick={handleFacebookLogin}
          disabled={formDisabled}
        >
          {t('signup:facebookButton')}
        </OAuthButton>
      </div>

      <p className="text-xs text-center text-muted">
        {t('signup:termsAgreementPt1')}{' '}
        <button
          type="button"
          onClick={openTermsModal}
          className="font-semibold text-primary underline-offset-2 transition hover:underline"
        >
          {t('signup:termsAndConditions')}
        </button>
        {' '}{t('signup:termsAgreementAnd')}{' '}
        <button
          type="button"
          onClick={openPrivacyModal}
          className="font-semibold text-primary underline-offset-2 transition hover:underline"
        >
          {t('signup:privacyPolicy')}
        </button>
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
      <TermsOfServiceModal
        isOpen={activeLegalModal === 'terms'}
        onClose={closeLegalModal}
        onNavigateToPrivacy={() => setActiveLegalModal('privacy')}
      />
      <PrivacyPolicyModal
        isOpen={activeLegalModal === 'privacy'}
        onClose={closeLegalModal}
        onNavigateToDataDeletion={() => setActiveLegalModal('dataDeletion')}
      />
      <DataDeletionInstructionsModal
        isOpen={activeLegalModal === 'dataDeletion'}
        onClose={closeLegalModal}
      />
    </ExternalAuthLayout>
  );
}
