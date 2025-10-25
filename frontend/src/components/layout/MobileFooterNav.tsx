import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type NavItem = {
  to: string;
  icon: string;
  label: string;
};

export function MobileFooterNav(): JSX.Element {
  const { t } = useTranslation(['navigation', 'common']);
  const location = useLocation();

  const items: NavItem[] = [
    { to: '/dashboard', icon: 'home', label: t('navigation:home', 'Home') },
    { to: '/chat', icon: 'chat_bubble', label: t('navigation:chat', 'Chat') },
    { to: '/characters', icon: 'groups', label: t('navigation:characters', 'Characters') },
    { to: '/profile', icon: 'person', label: t('navigation:profileLink', 'Profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-normal/90 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-2 py-2">
        {items.map(item => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`mx-2 flex select-none flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-content'
                    : 'text-muted hover:bg-light hover:text-content'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

