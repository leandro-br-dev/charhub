import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import { SmartDropdown } from '../ui/SmartDropdown';
import { CachedImage } from '../ui/CachedImage';
import { LanguageSwitcher } from '../features/LanguageSwitcher';
import { ThemeToggle } from '../features/ThemeToggle';
import { creditService, subscriptionService } from '../../services';

type NavigationRailProps = {
  onBugReportClick?: () => void;
  displayMode?: 'permanent' | 'overlay';
  onNavItemSelect?: (selection: { to: string; opensSidebar: boolean; available: boolean }) => void;
  activeItem?: string | null;
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
  isActiveOverride?: boolean;
  isOverlay?: boolean;
  useDirectLink?: boolean;
};

function NavItem({ to, icon, label, disabled = false, onSelect, compact = false, isActiveOverride, isOverlay = false, useDirectLink = false }: NavItemProps): JSX.Element {
  const sizeClasses = compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl';
  const baseClasses = `relative group flex ${sizeClasses} items-center justify-center transition-all duration-200 ease-in-out`;
  const location = useLocation();
  const isActive = isActiveOverride ?? location.pathname.startsWith(to);

  const content = (
    <>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="sr-only">{label}</span>
      {!isOverlay && (
        <span className="absolute left-full z-[100] ml-4 hidden min-w-max origin-left rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
          {label}
        </span>
      )}
    </>
  );

  const className = [
    baseClasses,
    isActive
      ? 'bg-primary text-black shadow-lg'
      : 'bg-light text-muted hover:bg-primary hover:text-black'
  ].join(' ');

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

  if (useDirectLink) {
    return (
      <Link to={to} className={className} title={label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      title={label}
    >
      {content}
    </button>
  );
}

export function NavigationRail({
  onBugReportClick,
  displayMode = 'permanent',
  onNavItemSelect,
  activeItem
}: NavigationRailProps): JSX.Element {
  const { t } = useTranslation(['navigation', 'dashboard', 'common']);
  const { user, logout } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);

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
        to: '/characters',
        icon: 'groups',
        labelKey: 'navigation:characters',
        fallbackLabel: 'Characters',
        available: true,
        opensSidebar: true
      },
      {
        to: '/tasks',
        icon: 'task_alt',
        labelKey: 'navigation:tasks',
        fallbackLabel: 'Tasks',
        available: true,
        opensSidebar: false
      },
      {
        to: '/admin',
        icon: 'admin_panel_settings',
        labelKey: 'navigation:admin',
        fallbackLabel: 'Admin',
        available: true,
        onlyAdmin: true,
        opensSidebar: false
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

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [creditsData, subscriptionData] = await Promise.all([
          creditService.getBalance(),
          subscriptionService.getStatus(),
        ]);
        setCredits(creditsData);
        setPlanName(subscriptionData.plan?.name || 'Free');
      } catch (error) {
        console.error('[NavigationRail] Failed to load user data:', error);
      }
    };

    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

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
          const isItemActive = activeItem && item.opensSidebar ? activeItem.startsWith(item.to) : undefined;

          // Special handling for Admin button with dropdown
          if (item.to === '/admin' && item.available) {
            return (
              <SmartDropdown
                key={item.to}
                menuWidth="w-48"
                buttonContent={
                  <button
                    type="button"
                    className={`relative group flex ${isOverlay ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} items-center justify-center transition-all duration-200 ease-in-out ${
                      isItemActive
                        ? 'bg-primary text-black shadow-lg'
                        : 'bg-light text-muted hover:bg-primary hover:text-black'
                    }`}
                    title={label}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="sr-only">{label}</span>
                    {!isOverlay && (
                      <span className="absolute left-full z-[100] ml-4 hidden min-w-max origin-left rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                        {label}
                      </span>
                    )}
                  </button>
                }
              >
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/admin/analytics"
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        active ? 'bg-primary/10 text-content' : 'text-content'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">bar_chart</span>
                      {t('navigation:adminAnalytics', 'Analytics')}
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/admin/system-config"
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        active ? 'bg-primary/10 text-content' : 'text-content'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">settings</span>
                      {t('navigation:adminSystemConfig', 'System Config')}
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/admin/scripts"
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        active ? 'bg-primary/10 text-content' : 'text-content'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">terminal</span>
                      {t('navigation:adminScripts', 'Scripts')}
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/admin/llm-catalog"
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                        active ? 'bg-primary/10 text-content' : 'text-content'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">model_training</span>
                      {t('navigation:adminLlmCatalog', 'LLM Catalog')}
                    </Link>
                  )}
                </Menu.Item>
              </SmartDropdown>
            );
          }

          return (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={label}
              disabled={!item.available}
              compact={isOverlay}
              isOverlay={isOverlay}
              useDirectLink={!item.opensSidebar}
              onSelect={() =>
                onNavItemSelect?.({
                  to: item.to,
                  opensSidebar: Boolean(item.opensSidebar),
                  available: item.available
                })
              }
              isActiveOverride={isItemActive}
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

          {/* Plan and Credits Info */}
          <div className="px-4 py-2 border-t border-dark/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">Plan:</span>
              <span className="text-xs font-medium text-content">{planName ?? '...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Credits:</span>
              <span className="text-xs font-medium text-primary">
                {credits !== null ? credits.toLocaleString() : '...'}
              </span>
            </div>
          </div>

          <div className="my-1 h-px bg-dark/40" />

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
