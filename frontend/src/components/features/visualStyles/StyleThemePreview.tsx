import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { visualStyleService, type StyleThemeCombination } from '../../../services/visualStyleService';
import type { VisualStyle, Theme } from '../../../types/characters';

interface StyleThemePreviewProps {
  style: VisualStyle | null | undefined;
  theme: Theme | null | undefined;
}

export function StyleThemePreview({ style, theme }: StyleThemePreviewProps): JSX.Element | null {
  const { t } = useTranslation(['characters']);
  const [combination, setCombination] = useState<StyleThemeCombination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCombination = async () => {
      if (!style || !theme) {
        setCombination(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const combo = await visualStyleService.getStyleThemeCombination(style, theme);
        if (combo) {
          setCombination(combo);
        } else {
          setError(t('characters:styleThemePreview.combinationNotFound'));
        }
      } catch (err) {
        setError(t('characters:styleThemePreview.loadError'));
        console.error('Failed to load style + theme combination:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCombination();
  }, [style, theme, t]);

  if (!style || !theme) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          <span>{t('characters:styleThemePreview.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/50 bg-danger/10 p-4">
        <div className="flex items-center gap-2 text-sm text-danger">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!combination) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-title mb-3">
        {t('characters:styleThemePreview.title')}
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-muted">{t('characters:styleThemePreview.checkpoint')}:</span>
          <span className="font-medium text-content text-right">{combination.checkpoint.name}</span>
        </div>
        {combination.lora ? (
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted">{t('characters:styleThemePreview.lora')}:</span>
            <span className="font-medium text-content text-right">
              {combination.lora.name}
              <span className="text-xs text-muted ml-2">
                ({t('characters:styleThemePreview.strength')}: {combination.lora.strength})
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted">{t('characters:styleThemePreview.lora')}:</span>
            <span className="text-muted text-right italic">
              {t('characters:styleThemePreview.noLora')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
