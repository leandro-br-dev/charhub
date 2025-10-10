import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { UserMenu } from '../features/UserMenu';
import { ThemeToggle } from '../features/ThemeToggle';
import { LanguageSwitcher } from '../features/LanguageSwitcher';

export function Header(): JSX.Element {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('common');

  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur dark:border-slate-700 dark:bg-slate-800/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-semibold text-white">
          {t('brand')}
        </Link>
        {isAuthenticated ? (
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            <Link className="transition hover:text-white" to="/dashboard">
              {t('navDashboard')}
            </Link>
            <Link className="transition hover:text-white" to="/characters">
              {t('navCharacters')}
            </Link>
          </nav>
        ) : (
          <span className="text-sm text-slate-400">{t('navTagline')}</span>
        )}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
