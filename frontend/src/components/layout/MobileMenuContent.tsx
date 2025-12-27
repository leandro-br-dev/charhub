import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../features/ThemeToggle';
import { LanguageSwitcher } from '../features/LanguageSwitcher';
import { Separator } from '../ui/Separator';

interface MobileMenuContentProps {
  onClose: () => void;
}

export function MobileMenuContent({ onClose }: MobileMenuContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'home']);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="flex flex-col h-full py-6">
      {/* Header with Close button */}
      <div className="flex items-center justify-between mb-6 px-6">
        <h2 className="text-lg font-semibold text-title">{t('menu.title', 'Menu')}</h2>
        <Button
          variant="light"
          size="small"
          onClick={onClose}
          aria-label={t('menu.close', 'Close menu')}
          className="!p-2 rounded-full h-10 w-10 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {/* Settings Section */}
        <div className="space-y-3 mb-4">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('settings')}
          </p>

          {/* Theme Toggle - Full width */}
          <div className="px-3">
            <ThemeToggle variant="full-width" />
          </div>

          {/* Language Selector - Full width */}
          <div className="px-3">
            <LanguageSwitcher variant="full-width" />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Auth Section */}
        <div className="space-y-3 px-3">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('account')}
          </p>

          <Button
            variant="light"
            className="w-full h-12 justify-start"
            icon="login"
            iconPosition="left"
            onClick={() => handleNavigate('/login')}
          >
            {t('home:accessButton', 'Login')}
          </Button>

          <Button
            variant="primary"
            className="w-full h-12 justify-start"
            icon="person_add"
            iconPosition="left"
            onClick={() => handleNavigate('/signup')}
          >
            {t('home:signupButton', 'Sign Up')}
          </Button>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 pt-4 border-t border-border">
        <p className="text-xs text-slate-400 text-center">
          CharHub © 2025
        </p>
      </div>
    </div>
  );
}
