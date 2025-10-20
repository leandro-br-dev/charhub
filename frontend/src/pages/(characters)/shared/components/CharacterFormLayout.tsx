import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../../../components/ui/Tabs';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { IdentityTab } from './IdentityTab';
import { ProfileTab } from './ProfileTab';
import { ConfigurationTab } from './ConfigurationTab';
import { CharacterAvatarUploader } from './CharacterAvatarUploader';

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

  const sectionTitle = mode === 'create'
    ? t('characters:create.sectionTitle', 'Character')
    : t('characters:edit.sectionTitle', 'Character');

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

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {sectionTitle}
        </p>
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
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
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
            />
          </div>

          <Tabs defaultTab="identity">
            <TabList>
              <Tab label="identity">{t('characters:form.tabs.identity', 'Identity')}</Tab>
              <Tab label="profile" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.profile', 'Profile')}
              </Tab>
              <Tab label="configuration" disabled={!canAccessAdditionalTabs}>
                {t('characters:form.tabs.configuration', 'Configuration')}
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
            </TabPanels>
          </Tabs>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {form.isDirty ? t('characters:form.labels.unsavedChanges') : t('characters:form.labels.allSaved')}
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
                {isSubmitting ? t('characters:form.labels.submitting') : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
