import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef } from 'react';
import { Button } from '../../../../components/ui/Button';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Tabs, TabList, Tab, TabPanels, TabPanel, useTabs } from '../../../../components/ui/Tabs';
import { useToast } from '../../../../contexts/ToastContext';
import { assetService } from '../../../../services/assetService';
import type { UseAssetFormReturn } from '../hooks/useAssetForm';
import { AssetCoverUploader } from './AssetCoverUploader';
import { DetailsTab, ClassificationTab, ImagesTab } from './AssetTabs';

interface AssetFormLayoutProps {
  mode: 'create' | 'edit';
  assetName?: string;
  coverUrl?: string;
  assetId?: string;
  form: UseAssetFormReturn;
  error?: string | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
}

export function AssetFormLayout({
  mode,
  assetName,
  coverUrl,
  assetId,
  form,
  error,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel
}: AssetFormLayoutProps): JSX.Element {
  const { t } = useTranslation(['assets']);
  const { addToast } = useToast();
  const [tabsApi, setTabsApi] = useState<{ setActiveTab: (label: string) => void } | null>(null);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);

  const pageTitle = mode === 'create'
    ? t('assets:create.title')
    : t('assets:edit.title');

  const subtitle = mode === 'create'
    ? t('assets:create.subtitle')
    : t('assets:edit.subtitle', { name: assetName || t('assets:labels.untitledAsset') });

  const coverHeader = mode === 'create'
    ? t('assets:create.cover.header', 'Asset cover')
    : t('assets:edit.cover.header', 'Asset cover');

  const coverDescription = mode === 'create'
    ? t('assets:create.cover.description', 'Visual representation of your asset.')
    : t('assets:edit.cover.description', 'Visual representation of your asset.');

  const displayInitial = assetName?.[0]?.toUpperCase() || form.values.name?.[0]?.toUpperCase() || '?';
  const canAccessAdditionalTabs = mode === 'edit' || (form.values.name?.trim().length ?? 0) > 0;

  // Persist/restore cover locally keyed by assetId
  // NOTE: Only persist valid URLs, not base64 data URLs (to avoid 413 errors)
  useEffect(() => {
    if (assetId && !form.values.previewImageUrl) {
      try {
        const stored = window.localStorage.getItem(`charhub.asset.cover.${assetId}`);
        // Only restore if it's a valid URL (not base64)
        if (stored && !stored.startsWith('data:')) {
          form.updateField('previewImageUrl', stored);
        } else if (stored && stored.startsWith('data:')) {
          // Clear invalid base64 from localStorage
          window.localStorage.removeItem(`charhub.asset.cover.${assetId}`);
        }
      } catch {}
    }
  }, [assetId, form]);

  useEffect(() => {
    if (assetId && form.values.previewImageUrl) {
      try {
        // Only persist if it's a valid URL (not base64)
        if (!form.values.previewImageUrl.startsWith('data:')) {
          window.localStorage.setItem(`charhub.asset.cover.${assetId}`, form.values.previewImageUrl);
        } else {
          // Clear base64 from localStorage to prevent future issues
          window.localStorage.removeItem(`charhub.asset.cover.${assetId}`);
        }
      } catch {}
    }
  }, [assetId, form.values.previewImageUrl]);

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

            <AssetCoverUploader
              mode={mode}
              displayName={displayInitial}
              currentCover={coverUrl ?? form.values.previewImageUrl ?? undefined}
              assetId={assetId}
              onCoverChange={url => form.updateField('previewImageUrl', url)}
            />
          </div>

          <Tabs defaultTab="details">
            <TabsApiBridge onReady={(api) => setTabsApi(api)} />
            <TabList>
              <Tab label="details">{t('assets:form.tabs.details', 'Details')}</Tab>
              <Tab label="classification" disabled={!canAccessAdditionalTabs}>
                {t('assets:form.tabs.classification', 'Classification')}
              </Tab>
              <Tab label="images" disabled={!canAccessAdditionalTabs}>
                {t('assets:form.tabs.images', 'Images')}
              </Tab>
            </TabList>
            {mode === 'create' && !canAccessAdditionalTabs && (
              <p className="mt-3 text-xs text-muted">
                {t('assets:form.tabs.lockedHint', 'Fill in the basic details to unlock the other sections.')}
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
                <ImagesTab form={form} assetId={assetId} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {form.isDirty ? t('assets:form.labels.unsavedChanges') : t('assets:form.labels.allSaved')}
            </span>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="light"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? t('assets:form.labels.submitting') : submitLabel}
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
