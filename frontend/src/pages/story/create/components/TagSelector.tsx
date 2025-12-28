import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { tagService } from '../../../../services/tagService';
import { Input } from '../../../../components/ui';
import type { Tag, TagType, AgeRating } from '../../../../types/characters';

interface TagSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  tagType: TagType;
  incompatibleIds?: string[];
  ageRating?: AgeRating; // When provided, filter tags by age rating
}

const AGE_RANK: Record<AgeRating, number> = {
  L: 0,
  TEN: 1,
  TWELVE: 2,
  FOURTEEN: 3,
  SIXTEEN: 4,
  EIGHTEEN: 5,
};

export function TagSelector({ selectedIds, onChange, tagType, incompatibleIds = [], ageRating }: TagSelectorProps) {
  const { t } = useTranslation('story');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load all tags once
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        const response = await tagService.list({
          type: tagType,
          limit: 200,
        });
        setAllTags(response.items);
      } catch (error) {
        console.error('Error loading tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTags();
  }, [tagType]);

  // Filter available tags based on age rating
  const availableTags = useMemo(() => {
    let filtered = allTags.filter(t => !selectedIds.includes(t.id));

    // If search is active, filter by search term
    if (search) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // If ageRating is provided, filter by age rating
    if (ageRating !== undefined) {
      const limitRank = AGE_RANK[ageRating] ?? 0;
      filtered = filtered.filter(tag => {
        const rank = AGE_RANK[(tag.ageRating as AgeRating) || 'L'] ?? 0;
        return rank <= limitRank;
      });
    }

    return filtered;
  }, [allTags, selectedIds, search, ageRating]);

  const toggleTag = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(tid => tid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedTags = allTags.filter(t => selectedIds.includes(t.id));

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-content">
        {t('form.tags')}
      </label>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t('form.selectedTags')}</p>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => {
              const isIncompatible = incompatibleIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    isIncompatible
                      ? 'bg-danger/20 text-danger border-2 border-danger hover:bg-danger/30'
                      : 'bg-primary text-black hover:bg-primary/80'
                  }`}
                  title={isIncompatible ? t('form.tags.incompatibleHint', 'Incompatible with age rating') : undefined}
                >
                  {tag.name} ×
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('form.searchTags')}
      />

      {/* Available Tags */}
      <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2">
        {isLoading && (
          <p className="text-sm text-muted text-center py-4">{t('common:loading')}</p>
        )}

        {!isLoading && availableTags.length === 0 && (
          <p className="text-sm text-muted text-center py-4">
            {search ? t('form.noTagsFound') : t('form.noTagsAvailable')}
          </p>
        )}

        {!isLoading && availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="px-3 py-1 text-sm bg-light text-content border border-border rounded-full hover:bg-border transition-colors"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
