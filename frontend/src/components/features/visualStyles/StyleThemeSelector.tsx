import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { visualStyleService } from '../../../services/visualStyleService';
import type { VisualStyle, Theme } from '../../../types/characters';
import type { UseCharacterFormReturn } from '../../../pages/(characters)/shared/hooks/useCharacterForm';

interface StyleThemeSelectorProps {
  form: UseCharacterFormReturn;
}

const THEME_OPTIONS: Theme[] = ['DARK_FANTASY', 'FANTASY', 'FURRY', 'SCI_FI', 'GENERAL'];

export function StyleThemeSelector({ form }: StyleThemeSelectorProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { values, updateField } = form;
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);

  // Fetch available themes when style changes
  useEffect(() => {
    const fetchThemes = async () => {
      if (!values.style) {
        setAvailableThemes([]);
        return;
      }

      setIsLoadingThemes(true);
      try {
        const themes = await visualStyleService.getAvailableThemes(values.style);
        setAvailableThemes(themes);

        // If current theme is not in available themes, reset to first available
        if (values.theme && !themes.includes(values.theme)) {
          updateField('theme', themes[0] || 'DARK_FANTASY');
        }
      } catch (error) {
        console.error('Failed to fetch available themes:', error);
        setAvailableThemes(THEME_OPTIONS);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    fetchThemes();
  }, [values.style]);

  const getThemeLabel = (theme: Theme): string => {
    return t(`characters:themes.${theme}`, theme);
  };

  const getThemeDescription = (theme: Theme): string => {
    return t(`characters:themes.${theme}.description`, '');
  };

  const getCurrentThemeDescription = (): string => {
    if (!values.theme) return '';
    return getThemeDescription(values.theme);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Style Selector */}
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-content">
          {t('characters:form.fields.style')}
        </span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={values.style ?? ''}
          onChange={(e) => updateField('style', e.target.value as VisualStyle)}
        >
          <option value="">{t('characters:form.placeholders.style')}</option>
          <option value="ANIME">Anime</option>
          <option value="REALISTIC">Realistic</option>
          <option value="SEMI_REALISTIC">Semi-Realistic</option>
          <option value="CARTOON">Cartoon</option>
          <option value="MANGA">Manga</option>
          <option value="MANHWA">Manhwa</option>
          <option value="COMIC">Comic</option>
          <option value="CHIBI">Chibi</option>
          <option value="PIXEL_ART">Pixel Art</option>
          <option value="THREE_D">3D</option>
        </select>
      </label>

      {/* Theme Selector */}
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-content">
          {t('characters:form.fields.theme')}
        </span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          value={values.theme ?? ''}
          onChange={(e) => updateField('theme', e.target.value as Theme)}
          disabled={!values.style || isLoadingThemes || availableThemes.length === 0}
        >
          {availableThemes.length === 0 ? (
            <option value="">{t('characters:form.placeholders.selectStyleFirst')}</option>
          ) : (
            <>
              <option value="">{t('characters:form.placeholders.theme')}</option>
              {availableThemes.map((theme) => (
                <option key={theme} value={theme}>
                  {getThemeLabel(theme)}
                </option>
              ))}
            </>
          )}
        </select>
        {getCurrentThemeDescription() && (
          <p className="text-xs text-muted mt-1">
            {getCurrentThemeDescription()}
          </p>
        )}
      </label>
    </div>
  );
}
