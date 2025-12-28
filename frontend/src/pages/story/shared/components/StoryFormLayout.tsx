import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../../../components/ui/Tabs';
import { StoryCoverImageUploader } from './StoryCoverImageUploader';
import { StoryDetailsTab, PlotSettingTab, CharactersTab, MediaTab, ClassificationTab } from './index';
import { Visibility } from '../../../../types/common';
import type { StoryFormData } from '../../../../types/story';

interface StoryFormLayoutProps {
  mode: 'create' | 'edit';
  storyId?: string;
  data: StoryFormData;
  errors?: Record<string, string>;
  isSubmitting: boolean;
  onFieldChange: (field: keyof StoryFormData, value: any) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
}

export function StoryFormLayout({
  mode,
  storyId,
  data,
  errors,
  isSubmitting,
  onFieldChange,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
}: StoryFormLayoutProps): JSX.Element {
  const { t } = useTranslation(['story', 'common']);

  const pageTitle = mode === 'create'
    ? t('story:new.title', 'Create Story Manually')
    : t('story:edit.title', 'Edit Story');

  const subtitle = mode === 'create'
    ? t('story:new.subtitle', 'Fill in the details step by step')
    : t('story:edit.subtitle', 'Edit your story details');

  const displayInitial = data.title?.[0]?.toUpperCase() || '?';

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

      <form onSubmit={onSubmit}>
        <div className="grid gap-4 md:gap-6 md:grid-cols-[320px_1fr]">
          {/* Left Column - Cover Image */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-title">
              {t('story:form.coverImage', 'Cover Image')}
            </h2>
            <p className="mt-2 text-sm text-description">
              {t('story:form.coverImageHint', 'The visual representation of your story.')}
            </p>

            <StoryCoverImageUploader
              value={data.coverImage || ''}
              onChange={(url) => onFieldChange('coverImage', url)}
            />
          </div>

          {/* Right Column - Tabs */}
          <Tabs defaultTab="details">
            <TabList>
              <Tab label="details">
                <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                {t('story:form.tabs.details', 'Details')}
              </Tab>
              <Tab label="plot">
                <span className="material-symbols-outlined text-sm align-middle mr-1">menu_book</span>
                {t('story:form.tabs.plot', 'Plot & Setting')}
              </Tab>
              <Tab label="characters">
                <span className="material-symbols-outlined text-sm align-middle mr-1">groups</span>
                {t('story:form.tabs.characters', 'Characters')}
              </Tab>
              <Tab label="classification">
                <span className="material-symbols-outlined text-sm align-middle mr-1">flag</span>
                {t('story:form.tabs.classification', 'Classification')}
              </Tab>
              <Tab label="media">
                <span className="material-symbols-outlined text-sm align-middle mr-1">image</span>
                {t('story:form.tabs.media', 'Media')}
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel label="details">
                <StoryDetailsTab
                  title={data.title}
                  synopsis={data.synopsis}
                  visibility={data.visibility ?? Visibility.PUBLIC}
                  onTitleChange={(val) => onFieldChange('title', val)}
                  onSynopsisChange={(val) => onFieldChange('synopsis', val)}
                  onVisibilityChange={(val) => onFieldChange('visibility', val)}
                  errors={errors}
                />
              </TabPanel>

              <TabPanel label="plot">
                <PlotSettingTab
                  initialText={data.initialText}
                  objectives={data.objectives || []}
                  onInitialTextChange={(val) => onFieldChange('initialText', val)}
                  onObjectivesChange={(val) => onFieldChange('objectives', val)}
                  errors={errors}
                />
              </TabPanel>

              <TabPanel label="characters">
                <CharactersTab
                  selectedIds={data.characterIds || []}
                  mainCharacterId={data.mainCharacterId}
                  onChange={(ids) => onFieldChange('characterIds', ids)}
                  onMainCharacterChange={(id) => onFieldChange('mainCharacterId', id)}
                />
              </TabPanel>

              <TabPanel label="classification">
                <ClassificationTab
                  ageRating={data.ageRating}
                  contentTags={data.contentTags || []}
                  tagIds={data.tagIds || []}
                  onAgeRatingChange={(val) => onFieldChange('ageRating', val)}
                  onContentTagsChange={(val) => onFieldChange('contentTags', val)}
                  onTagIdsChange={(val) => onFieldChange('tagIds', val)}
                />
              </TabPanel>

              <TabPanel label="media">
                <MediaTab
                  value={data.coverImage || ''}
                  onChange={(url) => onFieldChange('coverImage', url)}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {/* Status indicator */}
            </span>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="light"
                onClick={onCancel}
                disabled={isSubmitting}
                icon="cancel"
                iconPosition="left"
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                icon={isSubmitting ? undefined : "save"}
                iconPosition="left"
              >
                {isSubmitting ? t('common:saving', 'Saving...') : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
