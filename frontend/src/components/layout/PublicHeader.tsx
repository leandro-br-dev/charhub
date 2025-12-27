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
    <header className="fixed top-0 right-0 z-50 p-2 sm:p-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none">
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        {/* Theme and Language selectors - hidden on very small screens, or grouped */}
        <div className="flex items-center gap-2 bg-normal/80 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none rounded-full px-2 py-1 sm:p-0">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        {/* Divider - hidden on small mobile */}
        <div className="hidden sm:block h-6 w-px bg-border mx-1" />

        {/* Auth buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="light"
            className="h-10 sm:h-12 px-2 sm:px-4"
            icon="login"
            iconPosition="left"
            onClick={() => navigate('/login')}
          >
            <span className="hidden sm:inline">{t('home:accessButton')}</span>
          </Button>
          <Button
            variant="primary"
            className="h-10 sm:h-12 px-2 sm:px-4"
            icon="person_add"
            iconPosition="left"
            onClick={() => navigate('/signup')}
          >
            <span className="hidden sm:inline">{t('home:signupButton')}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
