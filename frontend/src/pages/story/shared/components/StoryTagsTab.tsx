import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TagSelector } from '../../create/components/TagSelector';
import { tagService } from '../../../../services/tagService';
import type { AgeRating, ContentTag, Tag } from '../../../../types/characters';

interface StoryTagsTabProps {
  selectedTagIds: string[];
  ageRating: AgeRating;
  contentTags: ContentTag[];
  onTagIdsChange: (ids: string[]) => void;
  onContentTagsChange: (tags: ContentTag[]) => void;
}

const AGE_RANK: Record<AgeRating, number> = {
  L: 0,
  TEN: 1,
  TWELVE: 2,
  FOURTEEN: 3,
  SIXTEEN: 4,
  EIGHTEEN: 5,
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

export function StoryTagsTab({
  selectedTagIds,
  ageRating,
  contentTags,
  onTagIdsChange,
  onContentTagsChange,
}: StoryTagsTabProps): JSX.Element {
  const { t } = useTranslation(['story', 'characters']);
  const [incompatibleTagIds, setIncompatibleTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Load all tags to check compatibility
  useEffect(() => {
    const loadTags = async () => {
      try {
        const pageSize = 200;
        let items: Tag[] = [];
        let skip = 0;
        let total = Infinity;

        while (items.length < total) {
          const { items: pageItems, total: cnt } = await tagService.list({
            type: 'STORY',
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
  }, []);

  // Check for incompatible tags when ageRating or selectedTagIds changes
  useEffect(() => {
    if (selectedTagIds.length === 0 || allTags.length === 0) {
      setIncompatibleTagIds([]);
      return;
    }

    const limitRank = AGE_RANK[ageRating] ?? 0;
    const incompatible = selectedTagIds.filter(id => {
      const tag = allTags.find(t => t.id === id);
      if (!tag) return false;
      const rank = AGE_RANK[(tag.ageRating as AgeRating) || 'L'] ?? 0;
      return rank > limitRank;
    });

    setIncompatibleTagIds(incompatible);
  }, [selectedTagIds, ageRating, allTags]);

  const toggleContentTag = (tag: ContentTag) => {
    const newTags = contentTags.includes(tag)
      ? contentTags.filter(t => t !== tag)
      : [...contentTags, tag];
    onContentTagsChange(newTags);
  };

  return (
    <div className="space-y-6">
      {/* Genre Tags */}
      <div>
        <TagSelector
          selectedIds={selectedTagIds}
          onChange={onTagIdsChange}
          tagType="STORY"
          incompatibleIds={incompatibleTagIds}
        />
        {incompatibleTagIds.length > 0 && (
          <p className="mt-2 text-xs text-danger">
            {t('story:form.tags.incompatibleHint', 'Tags highlighted are incompatible with the selected age rating. Remove them to continue.')}
          </p>
        )}
      </div>

      {/* Content Tags */}
      <div>
        <label className="block text-sm font-medium text-content mb-2">
          {t('story:form.contentTags', 'Content Warnings')}
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleContentTag(tag)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                contentTags.includes(tag)
                  ? 'bg-primary text-black'
                  : 'bg-light text-content border border-border hover:bg-border'
              }`}
            >
              {t(`characters:contentTags.${tag}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
