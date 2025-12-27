import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../features/ThemeToggle';
import { LanguageSwitcher } from '../features/LanguageSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '../ui/Sheet';
import { MobileMenuContent } from './MobileMenuContent';

/**
 * Public header shown to non-authenticated users on the dashboard.
 * Displays theme toggle, language switcher, Login and Sign Up buttons.
 */
export function PublicHeader(): JSX.Element {
  const navigate = useNavigate();
  const { t } = useTranslation(['home', 'common']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 z-50 p-2 sm:p-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none">
      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto">
        
        {/* Desktop View - Hidden on mobile (md) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme and Language selectors */}
          <div className="flex items-center gap-2 bg-normal/80 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none rounded-full px-2 py-1 sm:p-0">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-1" />

          {/* Auth buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="light"
              className="h-10 sm:h-12 px-2 sm:px-4"
              icon="login"
              iconPosition="left"
              onClick={() => navigate('/login')}
            >
              <span className="hidden lg:inline">{t('home:accessButton')}</span>
              <span className="lg:hidden">{t('home:accessButton')}</span>
            </Button>
            <Button
              variant="primary"
              className="h-10 sm:h-12 px-2 sm:px-4"
              icon="person_add"
              iconPosition="left"
              onClick={() => navigate('/signup')}
            >
              <span className="hidden lg:inline">{t('home:signupButton')}</span>
              <span className="lg:hidden">{t('home:signupButton')}</span>
            </Button>
          </div>
        </div>

        {/* Mobile View - Hamburger Menu (Visible < md) */}
        <div className="md:hidden pointer-events-auto">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="light"
                className="h-10 w-10 !p-0 rounded-full bg-normal/80 backdrop-blur-sm shadow-sm"
                aria-label={t('menu.open', 'Open menu')}
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <MobileMenuContent onClose={() => setIsMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
