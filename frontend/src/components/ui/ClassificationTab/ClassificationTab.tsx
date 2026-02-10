import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '../Select';
import { TagSelector } from '../../../pages/story/create/components/TagSelector';
import { tagService } from '../../../services/tagService';
import type { AgeRating, ContentTag, Tag, TagType } from '../../../types/characters';

interface ClassificationTabProps {
  ageRating?: AgeRating;
  contentTags?: ContentTag[];
  tagIds?: string[];
  tagType?: TagType;
  onAgeRatingChange: (value: AgeRating) => void;
  onContentTagsChange: (tags: ContentTag[]) => void;
  onTagIdsChange?: (ids: string[]) => void;
  hideTagSelector?: boolean;
}

const AGE_RATINGS: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

const AGE_RANK: Record<AgeRating, number> = {
  L: 0,
  TEN: 1,
  TWELVE: 2,
  FOURTEEN: 3,
  SIXTEEN: 4,
  EIGHTEEN: 5,
};

const CONTENT_TAG_MIN_AGE: Record<ContentTag, AgeRating> = {
  VIOLENCE: 'L',
  GORE: 'FOURTEEN',
  SEXUAL: 'SIXTEEN',
  NUDITY: 'SIXTEEN',
  LANGUAGE: 'TEN',
  DRUGS: 'TWELVE',
  ALCOHOL: 'TWELVE',
  HORROR: 'FOURTEEN',
  PSYCHOLOGICAL: 'FOURTEEN',
  DISCRIMINATION: 'TEN',
  CRIME: 'TWELVE',
  GAMBLING: 'EIGHTEEN',
};

const CONTENT_TAGS: ContentTag[] = [
  'VIOLENCE',
  'GORE',
  'SEXUAL',
  'NUDITY',
  'LANGUAGE',
  'DRUGS',
  'ALCOHOL',
  'HORROR',
  'PSYCHOLOGICAL',
  'DISCRIMINATION',
  'CRIME',
  'GAMBLING',
];

export function ClassificationTab({
  ageRating = 'L',
  contentTags = [],
  tagIds = [],
  tagType = 'STORY',
  onAgeRatingChange,
  onContentTagsChange,
  onTagIdsChange,
  hideTagSelector = false,
}: ClassificationTabProps): JSX.Element {
  const { t } = useTranslation(['story', 'characters']);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const pageSize = 200;
        let items: Tag[] = [];
        let skip = 0;
        let total = Infinity;

        while (items.length < total) {
          const { items: pageItems, total: cnt } = await tagService.list({
            type: tagType,
            limit: pageSize,
            skip,
          });
          total = cnt;
          items = items.concat(pageItems || []);
          if (!pageItems || pageItems.length < pageSize) break;
          skip += pageSize;
        }

        setAllTags(items);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };

    loadTags();
  }, [tagType]);

  const incompatibleTagIds = useMemo(() => {
    const limitRank = AGE_RANK[ageRating] ?? 0;
    return tagIds.filter(id => {
      const tag = allTags.find(t => t.id === id);
      if (!tag) return false;
      const rank = AGE_RANK[(tag.ageRating as AgeRating) || 'L'] ?? 0;
      return rank > limitRank;
    });
  }, [tagIds, ageRating, allTags]);

  const disabledContentTags = useMemo(() => {
    const limitRank = AGE_RANK[ageRating] ?? 0;
    const disabled: ContentTag[] = [];

    for (const [tag, minAge] of Object.entries(CONTENT_TAG_MIN_AGE)) {
      const minRank = AGE_RANK[minAge as AgeRating] ?? 0;
      if (minRank > limitRank) {
        disabled.push(tag as ContentTag);
      }
    }

    return disabled;
  }, [ageRating]);

  useEffect(() => {
    if (incompatibleTagIds.length > 0 && onTagIdsChange) {
      const compatibleIds = tagIds.filter(id => !incompatibleTagIds.includes(id));
      if (compatibleIds.length !== tagIds.length) {
        onTagIdsChange(compatibleIds);
      }
    }
  }, [incompatibleTagIds, tagIds, onTagIdsChange]);

  const toggleContentTag = (tag: ContentTag) => {
    const newTags = contentTags.includes(tag)
      ? contentTags.filter(t => t !== tag)
      : [...contentTags, tag];
    onContentTagsChange(newTags);
  };

  return (
    <div className="space-y-6">
      <div>
        <Select
          label={t('story:form.ageRating', 'Age Rating')}
          value={ageRating || 'L'}
          onChange={value => onAgeRatingChange(value as AgeRating)}
          options={AGE_RATINGS.map(rating => ({
            value: rating,
            label: t(`characters:ageRatings.${rating}`),
          }))}
        />
        <p className="mt-1 text-xs text-muted">
          {t('story:form.ageRatingHint', 'This filters available genre tags and blocks inappropriate content warnings.')}
        </p>
      </div>

      {!hideTagSelector && onTagIdsChange && (
        <div>
          <TagSelector
            selectedIds={tagIds}
            onChange={onTagIdsChange}
            tagType={tagType}
            incompatibleIds={incompatibleTagIds}
            ageRating={ageRating}
          />
          {incompatibleTagIds.length > 0 && (
            <p className="mt-2 text-xs text-danger">
              {t('story:form.tags.incompatibleHint', 'Some selected tags are incompatible with the current age rating and will be removed.')}
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-content mb-2">
          {t('story:form.contentTags', 'Content Warnings')}
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TAGS.map(tag => {
            const isSelected = contentTags.includes(tag);
            const isDisabled = disabledContentTags.includes(tag);
            const minAge = CONTENT_TAG_MIN_AGE[tag];
            const minAgeLabel = t(`characters:ageRatings.${minAge}`);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => !isDisabled && toggleContentTag(tag)}
                disabled={isDisabled}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  isSelected
                    ? 'bg-primary text-black'
                    : 'bg-light text-content border border-border hover:bg-border'
                } ${isDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer'
                }`}
                title={isDisabled
                  ? t('story:form.contentTagDisabled', 'Requires age {age} or higher', { age: minAgeLabel })
                  : undefined
                }
              >
                {t(`characters:contentTags.${tag}`)}
              </button>
            );
          })}
        </div>
        {disabledContentTags.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {t('story:form.contentTagsDisabledHint', 'Grayed out content warnings require a higher age rating.')}
          </p>
        )}
      </div>
    </div>
  );
}
