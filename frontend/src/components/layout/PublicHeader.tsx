import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

/**
 * Public header shown to non-authenticated users on the dashboard.
 * Displays Login and Sign Up buttons in the top-right corner.
 */
export function PublicHeader(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'login', 'signup']);

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="flex gap-2">
        <Button
          variant="light"
          size="small"
          onClick={() => navigate('/login')}
        >
          {t('common:auth.login', 'Login')}
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={() => navigate('/signup')}
        >
          {t('common:auth.signup', 'Sign Up')}
        </Button>
      </div>
    </header>
  );
}
