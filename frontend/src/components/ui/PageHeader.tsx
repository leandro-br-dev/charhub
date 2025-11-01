import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgeRatingFilter } from './AgeRatingFilter';
import { useContentFilter, type ContentFilterMode } from '../../contexts/ContentFilterContext';
import { SmartDropdown } from './SmartDropdown';
import { Button } from './Button';

export interface PageHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showContentFilter?: boolean;
  backTo?: string;
  onBack?: () => void;
  className?: string;
  actions?: React.ReactNode;
  showMobileMenu?: boolean;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

export function PageHeader({
  title,
  showBackButton = true,
  showHomeButton = false,
  showContentFilter = true,
  backTo,
  onBack,
  className = '',
  actions,
  showMobileMenu = false,
  isMobileMenuOpen = false,
  onMobileMenuToggle,
}: PageHeaderProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { filterMode, setFilterMode } = useContentFilter();
  const { t } = useTranslation(['common', 'navigation']);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  const filterOptions: Array<{ mode: ContentFilterMode; label: string; description: string; icon: string }> = [
    {
      mode: 'none',
      label: t('common:contentFilter.none', 'No Filter'),
      description: t('common:contentFilter.descriptions.none', 'Show all content without restrictions'),
      icon: 'visibility',
    },
    {
      mode: 'blur',
      label: t('common:contentFilter.blur', 'Blur Sensitive'),
      description: t('common:contentFilter.descriptions.blur', 'Apply blur to mature content'),
      icon: 'blur_on',
    },
    {
      mode: 'hidden',
      label: t('common:contentFilter.hidden', 'Hide Mature'),
      description: t('common:contentFilter.descriptions.hidden', 'Completely hide mature content'),
      icon: 'visibility_off',
    },
  ];

  const currentFilter = filterOptions.find((opt) => opt.mode === filterMode) || filterOptions[1];

  return (
    <header
      className={`sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm ${className}`}
    >
      {/* Left: Navigation Buttons */}
      <div className="flex items-center gap-2">
        {/* Mobile menu button - only visible on mobile */}
        {showMobileMenu && (
          <button
            onClick={onMobileMenuToggle}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary md:hidden"
            aria-label={
              isMobileMenuOpen
                ? t('navigation:closeNavigation', 'Close navigation')
                : t('navigation:openNavigation', 'Open navigation')
            }
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        )}
        {showBackButton && (
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
            aria-label={t('navigation:goBack', 'Go back')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {showHomeButton && !location.pathname.startsWith('/dashboard') && (
          <button
            onClick={handleHome}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
            aria-label={t('navigation:goHome', 'Go to home')}
          >
            <span className="material-symbols-outlined">home</span>
          </button>
        )}
        {title && (
          <h1 className="ml-2 hidden text-sm font-semibold text-primary md:block md:text-base">{title}</h1>
        )}
      </div>

      {/* Right: Actions and Content Filter */}
      <div className="flex items-center gap-2">
        {actions}
        {/* Age rating filter (visible on mobile) */}
        <AgeRatingFilter />
        {showContentFilter && (
          <SmartDropdown
            buttonContent={
              <button
                className="flex h-10 items-center gap-2 rounded-lg px-3 text-content transition-colors hover:bg-input hover:text-primary"
                aria-label={t('common:contentFilter.ariaLabel', 'Content filter')}
              >
                <span className="material-symbols-outlined text-xl">{currentFilter.icon}</span>
                <span className="hidden text-sm font-medium sm:inline">{currentFilter.label}</span>
                <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
            }
            menuWidth="w-72"
          >
            <div className="py-1">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('common:contentFilter.title', 'Content Filter')}
                </p>
              </div>
              {filterOptions.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setFilterMode(option.mode)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                    filterMode === option.mode
                      ? 'bg-primary/10 text-primary'
                      : 'text-content hover:bg-input'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      filterMode === option.mode ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {option.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{option.label}</span>
                      {filterMode === option.mode && (
                        <span className="material-symbols-outlined text-base text-primary">check</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </SmartDropdown>
        )}
      </div>
    </header>
  );
}
