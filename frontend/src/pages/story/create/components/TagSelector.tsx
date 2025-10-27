import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tagService } from '../../../../services/tagService';
import { Input } from '../../../../components/ui';
import type { Tag, TagType } from '../../../../types/characters';

interface TagSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  tagType: TagType;
}

export function TagSelector({ selectedIds, onChange, tagType }: TagSelectorProps) {
  const { t } = useTranslation('story');
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, [search, tagType]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const response = await tagService.list({
        search: search || undefined,
        type: tagType,
        limit: 50,
      });
      setTags(response.items);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(tid => tid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedTags = tags.filter(t => selectedIds.includes(t.id));
  const availableTags = tags.filter(t => !selectedIds.includes(t.id));

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
            {selectedTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="px-3 py-1 text-sm bg-primary text-black rounded-full hover:bg-primary/80 transition-colors"
              >
                {tag.name} ×
              </button>
            ))}
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
