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
    const normalized = normalizeAllowedContentTags(ageRating, allowedTags);
    if (!haveSameContentTags(normalized, allowedTags)) {
      onChange(normalized);
    }
  }, [ageRating, allowedTags, onChange]);

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
              const baseClasses = 'rounded-lg border px-3 py-2 text-sm shadow-sm transition';
              const unavailableClasses = 'border-border bg-muted/10 text-muted cursor-not-allowed opacity-60';
              const availableClasses = 'border-border bg-background hover:border-primary cursor-pointer';
              const labelClasses = [
                baseClasses,
                isUnlocked && !disabled ? availableClasses : unavailableClasses,
              ].join(' ');

              return (
                <label
                  key={tag}
                  className={labelClasses}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-content">
                        {t('characters:contentTags.' + tag)}
                      </span>
                      <span className="text-xs text-muted">
                        {t('characters:contentTagHints.' + tag, { defaultValue: '' })}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={isChecked}
                      onChange={() => handleToggle(tag)}
                      disabled={disabled || !isUnlocked}
                    />
                  </div>
                  {!isUnlocked && (
                    <p className="mt-2 text-xs text-muted">
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
