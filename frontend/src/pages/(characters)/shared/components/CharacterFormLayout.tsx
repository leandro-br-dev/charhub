import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '../../../../components/ui/Button';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Tabs, TabList, Tab, TabPanels, TabPanel, useTabs } from '../../../../components/ui/Tabs';
import { useToast } from '../../../../contexts/ToastContext';
import { tagService } from '../../../../services/tagService';
import { characterService } from '../../../../services/characterService';
import type { AgeRating, Tag } from '../../../../types/characters';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { IdentityTab, ProfileTab, ConfigurationTab, CharacterAvatarUploader, TagsTab, ImagesTab } from './index';

interface CharacterFormLayoutProps {
  mode: 'create' | 'edit';
  characterName?: string;
  avatarUrl?: string;
  characterId?: string;
  draftId?: string;
  form: UseCharacterFormReturn;
  error?: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
}

export function CharacterFormLayout({
  mode,
  characterName,
  avatarUrl,
  characterId,
  draftId,
  form,
  error,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel
}: CharacterFormLayoutProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { addToast } = useToast();
  const [tabsApi, setTabsApi] = useState<{ setActiveTab: (label: string) => void } | null>(null);
  const [incompatibleTagIds, setIncompatibleTagIds] = useState<string[]>([]);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);

  const pageTitle = mode === 'create'
    ? t('characters:create.title')
    : t('characters:edit.title');

  const subtitle = mode === 'create'
    ? t('characters:create.subtitle')
    : t('characters:edit.subtitle', { name: characterName || t('characters:labels.untitledCharacter') });

  const avatarHeader = mode === 'create'
    ? t('characters:create.avatar.header', 'Character avatar')
    : t('characters:edit.avatar.header', 'Character avatar');

  const avatarDescription = mode === 'create'
    ? t('characters:create.avatar.description', 'Visual representation of your character.')
    : t('characters:edit.avatar.description', 'Visual representation of your character.');

  const displayInitial = characterName?.[0]?.toUpperCase() || form.values.firstName?.[0]?.toUpperCase() || '?';
  const canAccessAdditionalTabs = mode === 'edit' || (form.values.firstName?.trim().length ?? 0) > 0;

  // Persist/restore cover locally keyed by characterId
  useEffect(() => {
    if (characterId && !form.values.cover) {
      try {
        const stored = window.localStorage.getItem(`charhub.cover.${characterId}`);
        if (stored) {
          form.updateField('cover', stored);
        }
      } catch {}
    }
  }, [characterId]);

  useEffect(() => {
    if (characterId && form.values.cover) {
      try {
        window.localStorage.setItem(`charhub.cover.${characterId}`, form.values.cover);
      } catch {}
    }
  }, [characterId, form.values.cover]);

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">
          {pageTitle}
        </h1>
        <p className="max-w-2xl text-sm text-description">
          {subtitle}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          // Validate age rating vs selected tagIds
          try {
            const selectedIds = form.values.tagIds ?? [];
            if (selectedIds.length > 0) {
              // Load tag catalog (paged) and build map
              const pageSize = 200;
              let all: Tag[] = [];
              let skip = 0;
              let total = Infinity;
              while (all.length < total) {
                const { items, total: cnt } = await tagService.list({ type: 'CHARACTER', limit: pageSize, skip });
                total = cnt;
                all = all.concat(items || []);
                if (!items || items.length < pageSize) break;
                skip += pageSize;
              }
              const map = new Map(all.map(t => [t.id, t]));
              const AGE_RANK: Record<AgeRating, number> = { L: 0, TEN: 1, TWELVE: 2, FOURTEEN: 3, SIXTEEN: 4, EIGHTEEN: 5 };
              const limitRank = AGE_RANK[(form.values.ageRating as AgeRating) || 'L'] ?? 0;
              const incompatible = selectedIds.filter(id => {
                const tag = map.get(id);
                if (!tag) return false;
                const rank = AGE_RANK[(tag.ageRating as AgeRating) || 'L'] ?? 0;
                return rank > limitRank;
              });
              if (incompatible.length > 0) {
                setIncompatibleTagIds(incompatible);
                addToast(
                  t('characters:form.tags.incompatibleToast', 'Some selected tags are incompatible with the current age rating. Please review.'),
                  'error',
                  6000
                );
                tabsApi?.setActiveTab('tags');
                return;
              }
            }
            setIncompatibleTagIds([]);
            onSubmit(event);
          } catch (_e) {
            // In case of failure, allow submit to avoid blocking user unexpectedly
            onSubmit(event);
          }
        }}
      >
        <div className="grid gap-4 md:gap-6 md:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-title">
              {avatarHeader}
            </h2>
            <p className="mt-2 text-sm text-description">
              {avatarDescription}
            </p>

            <CharacterAvatarUploader
              mode={mode}
              displayInitial={displayInitial}
              currentAvatar={avatarUrl ?? form.values.avatar ?? undefined}
              draftId={draftId}
              characterId={characterId}
              onAvatarChange={url => form.updateField('avatar', url)}
              refreshTrigger={avatarRefreshTrigger}
            />
          </div>

          <Tabs defaultTab="identity">
            <TabsApiBridge onReady={(api) => setTabsApi(api)} />
            <TabList>
              <Tab label="identity">{t('characters:form.tabs.identity', 'Identity')}</Tab>
              <Tab label="profile" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.profile', 'Profile')}
              </Tab>
              <Tab label="configuration" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.configuration', 'Configuration')}
              </Tab>
              <Tab label="tags" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.tags', 'Tags')}
              </Tab>
              <Tab label="images" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.images', 'Images')}
              </Tab>
            </TabList>
            {mode === 'create' && !canAccessAdditionalTabs && (
              <p className="mt-3 text-xs text-muted">
                {t('characters:form.tabs.lockedHint', 'Fill in the basic identity details to unlock the other sections.')}
              </p>
            )}
            <TabPanels>
              <TabPanel label="identity">
                <IdentityTab form={form} />
              </TabPanel>
              <TabPanel label="profile">
                <ProfileTab form={form} />
              </TabPanel>
              <TabPanel label="configuration">
                <ConfigurationTab form={form} />
              </TabPanel>
              <TabPanel label="tags">
                <TagsTab form={form} />
                {incompatibleTagIds.length > 0 && (
                  <p className="mt-2 text-xs text-danger">
                    {t('characters:form.tags.incompatibleHint', 'Tags highlighted are incompatible with the selected age rating. Remove them to continue.')}
                  </p>
                )}
              </TabPanel>
              <TabPanel label="images">
                <ImagesTab
                  form={form}
                  characterId={characterId}
                  onAvatarActivated={() => setAvatarRefreshTrigger(prev => prev + 1)}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {form.isDirty ? t('characters:form.labels.unsavedChanges') : t('characters:form.labels.allSaved')}
            </span>
            <div className="flex flex-wrap gap-3">
              <SmartDropdown
                  buttonContent={
                    <Button
                      type="button"
                      variant="light"
                      size="small"
                      icon="auto_awesome"
                      disabled={isSubmitting || isAutoCompleting}
                    >
                      {t('characters:form.autocomplete.button', 'Autocomplete')}
                    </Button>
                  }
                  menuWidth="w-72"
                >
                  <div className="py-1 text-sm">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
                      onClick={async () => {
                        setIsAutoCompleting(true);
                        try {
                          const patch = await characterService.autocomplete(form.values, 'ai');
                          const entries = Object.entries(patch || {});
                          if (entries.length === 0) {
                            addToast(t('characters:form.autocomplete.nothing', 'No suggestions available.'), 'info');
                          } else {
                            for (const [key, value] of entries as Array<[keyof typeof form.values, any]>) {
                              if (key === 'cover' || key === 'avatar') continue; // avoid media fields from autocomplete

                              // Handle contentTags as array
                              if (key === 'contentTags') {
                                const tags = Array.isArray(value) ? value : [];
                                form.updateField(key, tags as any);
                              } else if (Array.isArray(value)) {
                                // Keep arrays as arrays
                                form.updateField(key, value as any);
                              } else if (typeof value === 'object' && value !== null) {
                                // Convert objects to a readable string
                                const text = Object.entries(value as Record<string, unknown>)
                                  .map(([k, v]) => `${k}: ${String(v)}`).join('; ');
                                form.updateField(key, text as any);
                              } else if (key in form.values) {
                                form.updateField(key, value as any);
                              }
                            }
                            addToast(t('characters:form.autocomplete.applied', 'Autocomplete applied.'), 'success');
                          }
                        } catch (e) {
                          addToast(t('characters:form.autocomplete.failed', 'Failed to autocomplete.'), 'error');
                        } finally {
                          setIsAutoCompleting(false);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-base">auto_fix_high</span>
                      {t('characters:form.autocomplete.ai', 'Autocomplete with AI')}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
                      onClick={async () => {
                        setIsAutoCompleting(true);
                        try {
                          const patch = await characterService.autocomplete(form.values, 'web');
                          const entries = Object.entries(patch || {});
                          if (entries.length === 0) {
                            addToast(t('characters:form.autocomplete.nothing', 'No suggestions available.'), 'info');
                          } else {
                            for (const [key, value] of entries as Array<[keyof typeof form.values, any]>) {
                              if (key === 'cover' || key === 'avatar') continue; // avoid media fields

                              // Handle contentTags as array
                              if (key === 'contentTags') {
                                const tags = Array.isArray(value) ? value : [];
                                form.updateField(key, tags as any);
                              } else if (Array.isArray(value)) {
                                // Keep arrays as arrays
                                form.updateField(key, value as any);
                              } else if (typeof value === 'object' && value !== null) {
                                const text = Object.entries(value as Record<string, unknown>)
                                  .map(([k, v]) => `${k}: ${String(v)}`).join('; ');
                                form.updateField(key, text as any);
                              } else if (key in form.values) {
                                form.updateField(key, value as any);
                              }
                            }
                            addToast(t('characters:form.autocomplete.applied', 'Autocomplete applied.'), 'success');
                          }
                        } catch (e) {
                          addToast(t('characters:form.autocomplete.failed', 'Failed to autocomplete.'), 'error');
                        } finally {
                          setIsAutoCompleting(false);
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-base">language</span>
                      {t('characters:form.autocomplete.web', 'Autocomplete with web search')}
                    </button>
                  </div>
                </SmartDropdown>
              <Button
                type="button"
                variant="light"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? t('characters:form.labels.submitting') : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
function TabsApiBridge({ onReady }: { onReady: (api: { setActiveTab: (label: string) => void }) => void }) {
  const { setActiveTab } = useTabs();
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      onReady({ setActiveTab });
      initializedRef.current = true;
    }
  }, [onReady, setActiveTab]);
  return null;
}
