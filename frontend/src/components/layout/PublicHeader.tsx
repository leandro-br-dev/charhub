import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../features/ThemeToggle';
import { LanguageSwitcher } from '../features/LanguageSwitcher';

/**
 * Public header shown to non-authenticated users on the dashboard.
 * Displays theme toggle, language switcher, Login and Sign Up buttons.
 */
export function PublicHeader(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation(['home', 'common']);

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-2">
        {/* Theme and Language selectors */}
        <ThemeToggle />
        <LanguageSwitcher />

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-1" />

        {/* Auth buttons */}
        <Button
          variant="light"
          className="h-12"
          icon="login"
          iconPosition="left"
          onClick={() => navigate('/login')}
        >
          {t('home:accessButton')}
        </Button>
        <Button
          variant="primary"
          className="h-12"
          icon="person_add"
          iconPosition="left"
          onClick={() => navigate('/signup')}
        >
          {t('home:signupButton')}
        </Button>
      </div>
    </header>
  );
}
