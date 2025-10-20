import { useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from '@headlessui/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { SmartDropdown } from '../ui/SmartDropdown';
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
};

function NavItem({ to, icon, label, disabled = false, onSelect }: NavItemProps): JSX.Element {
  const baseClasses =
    'relative group flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 ease-in-out';
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
  const navigate = useNavigate();

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
        available: false,
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

  const containerClassName =
    displayMode === 'overlay'
      ? 'flex h-screen w-20 flex-col justify-between bg-normal/95 px-3 py-4 backdrop-blur md:hidden'
      : 'hidden h-screen w-20 flex-col justify-between bg-normal/95 px-3 py-4 backdrop-blur md:flex';

  return (
    <aside className={containerClassName}>
      <div className="flex flex-col items-center gap-3">
        <Link to="/dashboard" className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-light">
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

        <div className="my-5 h-px w-12 bg-dark/60" />

        <SmartDropdown
          menuWidth="w-52"
          buttonContent={
            <Button
              variant="light"
              size="small"
              icon="person_add"
              className="rounded-full"
              title={t('dashboard:createCharacter', 'Create character')}
            />
          }
        >
          <Menu.Item>
            {({ active }) => (
              <button
                type="button"
                onClick={() => navigate('/characters/create')}
                className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  active ? 'bg-primary/10 text-content' : 'text-content'
                }`}
              >
                <span className="material-symbols-outlined text-base">edit</span>
                {t('dashboard:createManually', 'Create manually')}
              </button>
            )}
          </Menu.Item>
          {/* TODO(chat-automation): Reintroduce AI-assisted creation options when the chat/story modules are migrated. */}
        </SmartDropdown>

        <SmartDropdown
          menuWidth="w-52"
          buttonContent={
            <Button
              variant="light"
              size="small"
              icon="history_edu"
              className="rounded-full"
              title={t('dashboard:createStory', 'Create story')}
            />
          }
        >
          {/* TODO(story): Attach story creation shortcuts once the story builder is available. */}
          <div className="px-3 py-2 text-xs text-muted">
            {t('navigation:storyPlaceholder', 'Story tools will live here soon.')}
          </div>
        </SmartDropdown>

        <Button
          variant="light"
          size="small"
          icon="bug_report"
          className="rounded-full"
          title={t('navigation:reportBug', 'Report a problem')}
          onClick={onBugReportClick}
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
        <SmartDropdown
          menuWidth="w-60"
          buttonContent={
            <button
              type="button"
              className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-dark bg-light shadow"
            >
              {user?.photo ? (
                <img src={user.photo} alt={displayName} className="h-12 w-12 rounded-full object-cover" />
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
