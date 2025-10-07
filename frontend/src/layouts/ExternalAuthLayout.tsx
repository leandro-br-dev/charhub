import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/features/ThemeToggle';
import { LanguageSwitcher } from '../components/features/LanguageSwitcher';

interface ExternalAuthLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
}

export function ExternalAuthLayout({ children, showBackButton = false }: ExternalAuthLayoutProps): JSX.Element {
  return (
    <div className="w-full h-screen flex flex-col bg-normal">
      <div className="flex flex-col md:flex-row flex-grow h-full">
        {/* Image Column */}
        <div
          className="w-full md:w-1/2 h-2/5 md:h-full relative bg-cover bg-top md:bg-center"
          style={{ backgroundImage: "url('/backgrounds/home-bg.webp')" }}
        >
          {/* Gradient Container */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-normal to-transparent md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-1/3 md:bg-gradient-to-l" />

          {showBackButton && (
            <div className="absolute top-4 left-4">
              <Link
                to="/"
                className="p-2 bg-light/50 backdrop-blur-sm rounded-full text-content hover:bg-light/80 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
            </div>
          )}
        </div>

        {/* Content Column */}
        <div className="w-full md:w-1/2 h-3/5 md:h-full flex flex-col justify-between p-6 sm:p-10 bg-normal rounded-t-2xl -mt-4 md:mt-0 md:rounded-none">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="CharHub Logo" className="h-10 w-auto mr-2" />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
