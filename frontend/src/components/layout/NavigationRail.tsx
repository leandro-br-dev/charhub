import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
// Button removed from imports as related actions were removed
import { SmartDropdown } from '../ui/SmartDropdown';
import { CachedImage } from '../ui/CachedImage';
import { LanguageSwitcher } from '../features/LanguageSwitcher';
import { ThemeToggle } from '../features/ThemeToggle';

type NavigationRailProps = {
  onBugReportClick?: () => void;
  displayMode?: 'permanent' | 'overlay';
  onNavItemSelect?: (selection: { to: string; opensSidebar: boolean; available: boolean }) => void;
};

type NavItemConfig = {
  to: string;
  icon: string;
  labelKey: string;
  fallbackLabel: string;
  available: boolean;
  onlyAdmin?: boolean;
  opensSidebar?: boolean;
};

type NavItemProps = {
  to: string;
  icon: string;
  label: string;
  disabled?: boolean;
  onSelect?: () => void;
  compact?: boolean;
};

function NavItem({ to, icon, label, disabled = false, onSelect, compact = false }: NavItemProps): JSX.Element {
  const sizeClasses = compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl';
  const baseClasses = `relative group flex ${sizeClasses} items-center justify-center transition-all duration-200 ease-in-out`;
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  if (disabled) {
    return (
      <div
        className={`${baseClasses} cursor-not-allowed bg-light text-muted opacity-60`}
        role="link"
        aria-disabled="true"
        title={label}
      >
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={[
        baseClasses,
        isActive
          ? 'bg-primary text-black shadow-lg'
          : 'bg-light text-muted hover:bg-primary hover:text-black'
      ].join(' ')}
      onClick={onSelect}
      title={label}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="sr-only">{label}</span>
      <span className="absolute left-full z-[100] ml-4 hidden min-w-max origin-left rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
        {label}
      </span>
    </button>
  );
}

export function NavigationRail({
  onBugReportClick,
  displayMode = 'permanent',
  onNavItemSelect
}: NavigationRailProps): JSX.Element {
  const { t } = useTranslation(['navigation', 'dashboard', 'common']);
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

  const navigationItems = useMemo<NavItemConfig[]>(
    () => [
      {
        to: '/chat',
        icon: 'chat_bubble',
        labelKey: 'navigation:chat',
        fallbackLabel: 'Chat',
        available: true,
        opensSidebar: true
      },
      {
        to: '/story',
        icon: 'auto_stories',
        labelKey: 'navigation:story',
        fallbackLabel: 'Story',
        available: true,
        opensSidebar: true
      },
      {
        to: '/development',
        icon: 'terminal',
        labelKey: 'navigation:development',
        fallbackLabel: 'Development',
        available: false,
        onlyAdmin: true,
        opensSidebar: true
      },
      {
        to: '/characters',
        icon: 'groups',
        labelKey: 'navigation:characters',
        fallbackLabel: 'Characters',
        available: true,
        opensSidebar: true
      },
      {
        to: '/assets',
        icon: 'inventory_2',
        labelKey: 'navigation:assets',
        fallbackLabel: 'Assets',
        available: false,
        opensSidebar: true
      }
    ],
    []
  );

  const handleLogout = async () => {
    await logout();
  };

  const handleProfileNavigate = () => {
    onNavItemSelect?.({ to: '/profile', opensSidebar: false, available: true });
  };

  const displayName = user?.displayName ?? user?.email ?? t('common:authenticatedUser', 'User');
  const fallbackInitial = displayName.charAt(0).toUpperCase();

  const isOverlay = displayMode === 'overlay';
  const containerClassName =
    isOverlay
      ? 'flex h-[100svh] w-20 flex-col justify-between bg-normal px-2 py-2 md:hidden overflow-hidden overscroll-none'
      : 'hidden h-[100svh] w-20 flex-col justify-between bg-normal px-3 py-4 md:flex';

  return (
    <aside className={containerClassName}>
      <div className={isOverlay ? 'flex flex-col items-center gap-2' : 'flex flex-col items-center gap-3'}>
        <Link to="/dashboard" className={isOverlay ? 'mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-light' : 'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-light'}>
          <img src="/logo.png" alt={t('common:brand', 'CharHub')} className="h-8 w-8" />
        </Link>

        {navigationItems.map(item => {
          if (item.onlyAdmin && !isAdmin) {
            return null;
          }

          const label = t(item.labelKey as any, item.fallbackLabel);
          return (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={label}
              disabled={!item.available}
              compact={isOverlay}
              onSelect={() =>
                onNavItemSelect?.({
                  to: item.to,
                  opensSidebar: Boolean(item.opensSidebar),
                  available: item.available
                })
              }
            />
          );
        })}

        <div className={isOverlay ? 'my-3 h-px w-10 bg-dark/60' : 'my-5 h-px w-12 bg-dark/60'} />

      </div>

      <div className={isOverlay ? 'flex flex-col items-center gap-2' : 'flex flex-col items-center gap-4'}>
        {isOverlay ? (
          <div className="scale-90">
            <LanguageSwitcher />
          </div>
        ) : (
          <LanguageSwitcher />
        )}
        {isOverlay ? (
          <div className="scale-90">
            <ThemeToggle />
          </div>
        ) : (
          <ThemeToggle />
        )}
        <SmartDropdown
          menuWidth="w-60"
          buttonContent={
            <button
              type="button"
              className={isOverlay ? 'relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-dark bg-light shadow' : 'relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-dark bg-light shadow'}
            >
              {user?.photo ? (
                <CachedImage src={user.photo} alt={displayName} className={isOverlay ? 'h-10 w-10 rounded-full object-cover' : 'h-12 w-12 rounded-full object-cover'} />
              ) : (
                <span className="text-lg font-semibold text-content">{fallbackInitial}</span>
              )}
            </button>
          }
        >
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-content" title={displayName}>
              {displayName}
            </p>
            {user?.email ? (
              <p className="text-xs text-muted" title={user.email}>
                {user.email}
              </p>
            ) : null}
          </div>

          <Menu.Item>
            {({ active }) => (
              <Link
                to="/profile"
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-primary/10 text-content' : 'text-content'
                }`}
                onClick={handleProfileNavigate}
              >
                <span className="material-symbols-outlined text-base">person</span>
                {t('navigation:profileLink', 'My profile')}
              </Link>
            )}
          </Menu.Item>

          {/* TODO(profile-billing): Add billing and credits shortcuts when available. */}

          <div className="my-1 h-px bg-dark/40" />

          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={handleLogout}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-danger/10 text-danger' : 'text-danger'
                }`}
              >
                <span className="material-symbols-outlined text-base">logout</span>
                {t('common:logout', 'Log out')}
              </button>
            )}
          </Menu.Item>
        </SmartDropdown>
      </div>
    </aside>
  );
}
