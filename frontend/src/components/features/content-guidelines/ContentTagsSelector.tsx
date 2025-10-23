import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTENT_TAG_OPTIONS } from '../../../pages/(characters)/shared/utils/constants';
import { type AgeRating, type ContentTag } from '../../../types/characters';
import {
  getUnlockedContentTags,
  normalizeAllowedContentTags,
  haveSameContentTags,
} from './rules';

interface ContentTagsSelectorProps {
  mode: 'character' | 'user';
  ageRating: AgeRating;
  allowedTags: ContentTag[];
  onChange: (nextAllowed: ContentTag[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ContentTagsSelector({
  mode,
  ageRating,
  allowedTags,
  onChange,
  disabled = false,
  className = '',
}: ContentTagsSelectorProps): JSX.Element {
  const { t } = useTranslation(['characters']);

  const unlockedTags = useMemo(() => getUnlockedContentTags(ageRating), [ageRating]);
  const unlockedSet = useMemo(() => new Set(unlockedTags), [unlockedTags]);

  useEffect(() => {
    const normalized = allowedTags.filter(tag => unlockedSet.has(tag));
    if (!haveSameContentTags(normalized, allowedTags)) {
      onChange(normalized);
    }
  }, [unlockedSet, allowedTags, onChange]);

  const contentTagsByColumn = useMemo(() => {
    const midpoint = Math.ceil(CONTENT_TAG_OPTIONS.length / 2);
    return [
      CONTENT_TAG_OPTIONS.slice(0, midpoint),
      CONTENT_TAG_OPTIONS.slice(midpoint),
    ];
  }, []);

  const containerClasses = ['space-y-3', className].filter(Boolean).join(' ');

  const handleToggle = (tag: ContentTag) => {
    if (disabled || !unlockedSet.has(tag)) return;

    const nextAllowed = allowedTags.includes(tag)
      ? allowedTags.filter(item => item !== tag)
      : [...allowedTags, tag];

    onChange(nextAllowed);
  };

  return (
    <div className={containerClasses}>
      <div className="text-xs text-muted">
        {mode === 'character'
          ? t(
              'characters:form.sections.contentTagsCharacterHint',
              'These topics define what the character is comfortable discussing at the selected age rating.'
            )
          : t(
              'characters:form.sections.contentTagsUserHint',
              'Select the themes you want to include. Anything left unchecked stays blocked for this rating.'
            )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {contentTagsByColumn.map((column, columnIndex) => (
          <div key={'content-tag-column-' + columnIndex} className="space-y-2">
            {column.map(tag => {
              const isUnlocked = unlockedSet.has(tag);
              const isChecked = isUnlocked && allowedTags.includes(tag);

              // Base classes for the label
              const labelBaseClasses = 'block rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-200';

              // State-specific classes
              let labelStateClasses = '';
              let titleTextClasses = '';
              let hintTextClasses = '';

              if (!isUnlocked) {
                // Locked state - grayed out and disabled
                labelStateClasses = 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 cursor-not-allowed opacity-60';
                titleTextClasses = 'text-gray-400 dark:text-gray-600';
                hintTextClasses = 'text-gray-400 dark:text-gray-600';
              } else if (disabled) {
                // Disabled but unlocked
                labelStateClasses = 'border-gray-300 dark:border-gray-700 bg-background cursor-not-allowed opacity-70';
                titleTextClasses = 'text-content dark:text-content-dark';
                hintTextClasses = 'text-muted';
              } else if (isChecked) {
                // Checked and active state - only yellow border, text remains normal
                labelStateClasses = 'border-primary bg-background cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50';
                titleTextClasses = 'text-content dark:text-content-dark';
                hintTextClasses = 'text-muted';
              } else {
                // Unchecked but available
                labelStateClasses = 'border-border dark:border-gray-700 bg-background cursor-pointer hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50';
                titleTextClasses = 'text-content dark:text-content-dark';
                hintTextClasses = 'text-muted';
              }

              const labelClasses = `${labelBaseClasses} ${labelStateClasses}`;

              return (
                <label
                  key={tag}
                  htmlFor={tag}
                  className={labelClasses}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col flex-1">
                      <span className={`font-medium ${titleTextClasses}`}>
                        {t('characters:contentTags.' + tag)}
                      </span>
                      {t('characters:contentTagHints.' + tag, { defaultValue: '' }) && (
                        <span className={`text-xs mt-0.5 ${hintTextClasses}`}>
                          {t('characters:contentTagHints.' + tag, { defaultValue: '' })}
                        </span>
                      )}
                    </div>
                    <input
                      id={tag}
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                      checked={isChecked}
                      onChange={() => handleToggle(tag)}
                      disabled={disabled || !isUnlocked}
                    />
                  </div>
                  {!isUnlocked && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500 italic">
                      {t('characters:form.sections.contentTagLocked', 'Unlocked at higher age ratings.')}
                    </p>
                  )}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
