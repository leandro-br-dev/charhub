import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { ProfileTab } from './components/ProfileTab';
import { PasswordTab } from './components/PasswordTab';
import { ContentClassificationTab } from './components/ContentClassificationTab';
import { DeleteAccountTab } from './components/DeleteAccountTab';
import { EditableAvatar } from '../../components/ui/EditableAvatar';

export default function ProfilePage(): JSX.Element {
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('profile:sectionTitle', 'Account')}</p>
        <h1 className="text-3xl font-semibold text-title">{t('profile:title', 'Manage your profile')}</h1>
        <p className="max-w-2xl text-sm text-description">
          {t(
            'profile:subtitle',
            'Update how other people see you on CharHub. Preferences that are still being migrated will appear here soon.'
          )}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-title">{t('profile:identity.header', 'Profile photo')}</h2>
          <p className="mt-2 text-sm text-description">
            {t('profile:identity.description', 'Pick an avatar to represent you across chats and characters.')}
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <EditableAvatar />
            <p className="text-xs text-muted">
              {t('profile:identity.placeholderNote', 'Avatar uploads will be available after we reconnect the media service.')}
            </p>
          </div>
        </div>

        <Tabs defaultTab="profile">
          <TabList>
            <Tab label="profile">{t('profile:tabs.profile', 'Profile')}</Tab>
            <Tab label="password">{t('profile:tabs.password', 'Password')}</Tab>
            <Tab label="content-classification">{t('profile:tabs.contentClassification', 'Content Classification')}</Tab>
            <Tab label="delete-account">{t('profile:tabs.deleteAccount', 'Delete Account')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel label="profile">
              <ProfileTab />
            </TabPanel>
            <TabPanel label="password">
              <PasswordTab />
            </TabPanel>
            <TabPanel label="content-classification">
              <ContentClassificationTab />
            </TabPanel>
            <TabPanel label="delete-account">
              <DeleteAccountTab />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </section>
  );
}