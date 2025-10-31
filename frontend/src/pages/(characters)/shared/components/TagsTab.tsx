import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ComboboxSelect, Tag as UITag } from '../../../../components/ui';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { tagService } from '../../../../services/tagService';
import type { Tag, AgeRating } from '../../../../types/characters';

interface TagsTabProps {
  form: UseCharacterFormReturn;
}

export function TagsTab({ form }: TagsTabProps): JSX.Element {
  const { t } = useTranslation(['characters', 'tags-character'], { useSuspense: false });
  const [isLoading, setIsLoading] = useState(false);
  const [tagsAll, setTagsAll] = useState<Tag[]>([]);

  const selectedIds = useMemo(() => new Set(form.values.tagIds ?? []), [form.values.tagIds]);

  // Age rating filter: only show tags whose minimum rating <= character's configured ageRating
  const AGE_RANK: Record<AgeRating, number> = {
    L: 0,
    TEN: 1,
    TWELVE: 2,
    FOURTEEN: 3,
    SIXTEEN: 4,
    EIGHTEEN: 5,
  } as const;

  const selectedAge = (form.values.ageRating as AgeRating) || 'L';
  const filteredTags = useMemo(() => {
    const limitRank = AGE_RANK[selectedAge] ?? AGE_RANK.L;
    return tagsAll.filter((tag) => (AGE_RANK[tag.ageRating as AgeRating] ?? AGE_RANK.L) <= limitRank);
  }, [tagsAll, selectedAge]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const pageSize = 200;
        let all: Tag[] = [];
        let skip = 0;
        let total = Infinity;
        while (!cancelled && all.length < total) {
          const { items, total: cnt } = await tagService.list({ type: 'CHARACTER', limit: pageSize, skip });
          total = cnt;
          all = all.concat(items || []);
          if (!items || items.length < pageSize) break;
          skip += pageSize;
        }
        const map = new Map<string, Tag>();
        all.forEach((t) => map.set(t.id, t));
        const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) setTagsAll(list);
      } catch (e) {
        if (!cancelled) setTagsAll([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  const addTag = (tag: Tag) => {
    const next = Array.from(new Set([...(form.values.tagIds ?? []), tag.id]));
    form.updateField('tagIds', next);
  };
  const removeTag = (id: string) => {
    const next = (form.values.tagIds ?? []).filter(x => x !== id);
    form.updateField('tagIds', next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ComboboxSelect
          options={filteredTags.map((tag) => ({ value: tag.id, label: t('tags-character:' + tag.name + '.name', tag.name) }))}
          value={''}
          onChange={(value) => {
            const tag = filteredTags.find((t) => t.id === value) || tagsAll.find((t) => t.id === value);
            if (tag) {
              addTag(tag);
            }
          }}
          placeholder={t('characters:form.tags.searchPlaceholder', 'Search tags (e.g., VTuber, Maid)')}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('characters:form.tags.selected', 'Selected tags')}
        </h4>
        {(form.values.tagIds ?? []).length === 0 ? (
          <p className="text-xs text-muted">{t('characters:form.tags.none', 'No tags selected')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(form.values.tagIds ?? []).map((id) => {
              const tag = tagsAll.find((t) => t.id === id);
              const label = tag ? t('tags-character:' + tag.name + '.name', tag.name) : id;
              const isIncompatible = tag
                ? (AGE_RANK[tag.ageRating as AgeRating] ?? 0) > (AGE_RANK[selectedAge] ?? 0)
                : false;
              const description = tag ? t('tags-character:' + tag.name + '.description', '') : undefined;
              return (
                <UITag
                  key={id}
                  label={label}
                  selected
                  tone={isIncompatible ? 'danger' : 'default'}
                  title={description}
                  onRemove={() => removeTag(id)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('characters:form.tags.suggestions', 'Suggestions')}
        </h4>
        {isLoading ? (
          <p className="text-xs text-muted">{t('characters:form.tags.loading', 'Loading...')}</p>
        ) : tagsAll.length === 0 ? (
          <p className="text-xs text-muted">{t('characters:form.tags.noResults', 'No results')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {(() => {
              const list = filteredTags.slice();
              for (let i = list.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = list[i];
                list[i] = list[j];
                list[j] = tmp;
              }
              return list.slice(0, 12).sort((a, b) => {
                const la = t('tags-character:' + a.name + '.name', a.name);
                const lb = t('tags-character:' + b.name + '.name', b.name);
                return la.localeCompare(lb);
              });
            })().map((tag) => (
              <li key={tag.id}>
                <UITag
                  label={t('tags-character:' + tag.name + '.name', tag.name)}
                  selected={selectedIds.has(tag.id)}
                  onClick={() => (selectedIds.has(tag.id) ? removeTag(tag.id) : addTag(tag))}
                  title={t('tags-character:' + tag.name + '.description', '')}
                  icon={<span className="material-symbols-outlined text-sm">sell</span>}
                  tone={tag.ageRating === 'EIGHTEEN' ? 'nsfw' : 'default'}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
