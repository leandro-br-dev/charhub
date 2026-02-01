import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { Button } from '../../../../components/ui/Button';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Tabs, TabList, Tab, TabPanels, TabPanel, useTabs } from '../../../../components/ui/Tabs';
import { useToast } from '../../../../contexts/ToastContext';
import { sceneService } from '../../../../services/sceneService';
import type { UseSceneFormReturn } from '../hooks/useSceneForm';
import { SceneCoverUploader } from './SceneCoverUploader';
import { DetailsTab, ClassificationTab, ImagesTab, AreasTab } from './SceneTabs';

interface SceneFormLayoutProps {
  mode: 'create' | 'edit';
  sceneName?: string;
  coverUrl?: string;
  sceneId?: string;
  form: UseSceneFormReturn;
  error?: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
}

export function SceneFormLayout({
  mode,
  sceneName,
  coverUrl,
  sceneId,
  form,
  error,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel
}: SceneFormLayoutProps): JSX.Element {
  const { t } = useTranslation(['scenes']);
  const { addToast } = useToast();
  const [tabsApi, setTabsApi] = useState<{ setActiveTab: (label: string) => void } | null>(null);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  const pageTitle = mode === 'create'
    ? t('scenes:create.title')
    : t('scenes:edit.title');

  const subtitle = mode === 'create'
    ? t('scenes:create.subtitle')
    : t('scenes:edit.subtitle', { name: sceneName || t('scenes:labels.untitledScene') });

  const coverHeader = mode === 'create'
    ? t('scenes:create.cover.header', 'Scene cover')
    : t('scenes:edit.cover.header', 'Scene cover');

  const coverDescription = mode === 'create'
    ? t('scenes:create.cover.description', 'Visual representation of your scene.')
    : t('scenes:edit.cover.description', 'Visual representation of your scene.');

  const displayInitial = sceneName?.[0]?.toUpperCase() || form.values.name?.[0]?.toUpperCase() || '?';
  const canAccessAdditionalTabs = mode === 'edit' || (form.values.name?.trim().length ?? 0) > 0;

  // Persist/restore cover locally keyed by sceneId
  // NOTE: Only persist valid URLs, not base64 data URLs (to avoid 413 errors)
  useEffect(() => {
    if (sceneId && !form.values.coverImageUrl) {
      try {
        const stored = window.localStorage.getItem(`charhub.scene.cover.${sceneId}`);
        // Only restore if it's a valid URL (not base64)
        if (stored && !stored.startsWith('data:')) {
          form.updateField('coverImageUrl', stored);
        } else if (stored && stored.startsWith('data:')) {
          // Clear invalid base64 from localStorage
          window.localStorage.removeItem(`charhub.scene.cover.${sceneId}`);
        }
      } catch {}
    }
  }, [sceneId, form]);

  useEffect(() => {
    if (sceneId && form.values.coverImageUrl) {
      try {
        // Only persist if it's a valid URL (not base64)
        if (!form.values.coverImageUrl.startsWith('data:')) {
          window.localStorage.setItem(`charhub.scene.cover.${sceneId}`, form.values.coverImageUrl);
        } else {
          // Clear base64 from localStorage to prevent future issues
          window.localStorage.removeItem(`charhub.scene.cover.${sceneId}`);
        }
      } catch {}
    }
  }, [sceneId, form.values.coverImageUrl]);

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

      <form onSubmit={onSubmit}>
        <div className="grid gap-4 md:gap-6 md:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-title">
              {coverHeader}
            </h2>
            <p className="mt-2 text-sm text-description">
              {coverDescription}
            </p>

            <SceneCoverUploader
              mode={mode}
              displayName={displayInitial}
              currentCover={coverUrl ?? form.values.coverImageUrl ?? undefined}
              sceneId={sceneId}
              onCoverChange={url => form.updateField('coverImageUrl', url)}
            />
          </div>

          <Tabs defaultTab="details">
            <TabsApiBridge onReady={(api) => setTabsApi(api)} />
            <TabList>
              <Tab label="details">{t('scenes:form.tabs.details', 'Details')}</Tab>
              <Tab label="classification" disabled={!canAccessAdditionalTabs}>
                {t('scenes:form.tabs.classification', 'Classification')}
              </Tab>
              <Tab label="images" disabled={!canAccessAdditionalTabs}>
                {t('scenes:form.tabs.images', 'Images')}
              </Tab>
              <Tab label="areas" disabled={!canAccessAdditionalTabs}>
                {t('scenes:form.tabs.areas', 'Areas')}
              </Tab>
            </TabList>
            {mode === 'create' && !canAccessAdditionalTabs && (
              <p className="mt-3 text-xs text-muted">
                {t('scenes:form.tabs.lockedHint', 'Fill in the basic details to unlock the other sections.')}
              </p>
            )}
            <TabPanels>
              <TabPanel label="details">
                <DetailsTab form={form} />
              </TabPanel>
              <TabPanel label="classification">
                <ClassificationTab form={form} />
              </TabPanel>
              <TabPanel label="images">
                <ImagesTab form={form} />
              </TabPanel>
              <TabPanel label="areas">
                <AreasTab sceneId={sceneId} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {form.isDirty ? t('scenes:form.labels.unsavedChanges') : t('scenes:form.labels.allSaved')}
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
                    {t('scenes:form.autocomplete.button', 'Autocomplete')}
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
                        const patch = await sceneService.autocomplete(form.values, 'ai');
                        const entries = Object.entries(patch || {});
                        if (entries.length === 0) {
                          addToast(t('scenes:form.autocomplete.nothing', 'No suggestions available.'), 'info');
                        } else {
                          for (const [key, value] of entries as Array<[keyof typeof form.values, any]>) {
                            if (key === 'coverImageUrl' || key === 'mapImageUrl') continue; // avoid media fields

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
                          addToast(t('scenes:form.autocomplete.applied', 'Autocomplete applied.'), 'success');
                        }
                      } catch (e) {
                        addToast(t('scenes:form.autocomplete.failed', 'Failed to autocomplete.'), 'error');
                      } finally {
                        setIsAutoCompleting(false);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-base">auto_fix_high</span>
                    {t('scenes:form.autocomplete.ai', 'Autocomplete with AI')}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
                    onClick={async () => {
                      setIsAutoCompleting(true);
                      try {
                        const patch = await sceneService.autocomplete(form.values, 'web');
                        const entries = Object.entries(patch || {});
                        if (entries.length === 0) {
                          addToast(t('scenes:form.autocomplete.nothing', 'No suggestions available.'), 'info');
                        } else {
                          for (const [key, value] of entries as Array<[keyof typeof form.values, any]>) {
                            if (key === 'coverImageUrl' || key === 'mapImageUrl') continue; // avoid media fields

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
                          addToast(t('scenes:form.autocomplete.applied', 'Autocomplete applied.'), 'success');
                        }
                      } catch (e) {
                        addToast(t('scenes:form.autocomplete.failed', 'Failed to autocomplete.'), 'error');
                      } finally {
                        setIsAutoCompleting(false);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-base">language</span>
                    {t('scenes:form.autocomplete.web', 'Autocomplete with web search')}
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
                {isSubmitting ? t('scenes:form.labels.submitting') : submitLabel}
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
