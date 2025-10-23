import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { CachedImage } from '../ui/CachedImage';

export function UserMenu(): JSX.Element | null {
  const { user, logout } = useAuth();
  const { t } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoading(true);
    await logout();
    setIsLoading(false);
  };

  const displayName = user.displayName ?? t('authenticatedUser');

  return (
    <div className="flex items-center gap-4">
      {user.photo ? (
        <CachedImage src={user.photo} alt={displayName} className="h-10 w-10 rounded-full object-cover border-2 border-slate-400" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="text-sm">
        <p className="font-semibold text-slate-200">{displayName}</p>
        {user.email ? <p className="text-slate-400">{user.email}</p> : null}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? t('logoutLoading') : t('logout')}
      </button>
    </div>
  );
}
