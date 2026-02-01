import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

export interface SceneListSidebarProps {
  sceneId?: string;
}

export function SceneListSidebar({ sceneId }: SceneListSidebarProps): JSX.Element | null {
  const { t } = useTranslation(['scenes', 'navigation']);
  const location = useLocation();

  const navigationItems = useMemo(
    () => [
      {
        to: '/scenes/hub',
        icon: 'grid_view',
        label: t('scenes:navigation.allScenes', 'All Scenes'),
      },
      {
        to: '/scenes/my-scenes',
        icon: 'folder',
        label: t('scenes:navigation.myScenes', 'My Scenes'),
      },
      {
        to: '/scenes/public',
        icon: 'public',
        label: t('scenes:navigation.publicGallery', 'Public Gallery'),
      },
    ],
    [t]
  );

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <nav className="space-y-1">
        {navigationItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
              isActive(item.to)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {sceneId && (
        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-3 px-4 text-xs font-semibold uppercase text-muted">
            {t('scenes:navigation.currentScene', 'Current Scene')}
          </h3>
          <nav className="space-y-1">
            <Link
              to={`/scenes/${sceneId}`}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                location.pathname === `/scenes/${sceneId}`
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined text-xl">visibility</span>
              <span>{t('scenes:navigation.view', 'View')}</span>
            </Link>
            <Link
              to={`/scenes/${sceneId}/edit`}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                location.pathname === `/scenes/${sceneId}/edit`
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined text-xl">edit</span>
              <span>{t('scenes:navigation.edit', 'Edit')}</span>
            </Link>
            <Link
              to={`/scenes/${sceneId}/areas`}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                location.pathname.startsWith(`/scenes/${sceneId}/areas`)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined text-xl">place</span>
              <span>{t('scenes:navigation.areas', 'Areas')}</span>
            </Link>
            <Link
              to={`/scenes/${sceneId}/map`}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                location.pathname === `/scenes/${sceneId}/map`
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="material-symbols-outlined text-xl">map</span>
              <span>{t('scenes:navigation.map', 'Map')}</span>
            </Link>
          </nav>
        </div>
      )}
    </aside>
  );
}
