import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { ProfileTab } from './components/ProfileTab';
import { PasswordTab } from './components/PasswordTab';
import { SessionsTab } from './components/SessionsTab';
import { ApiKeysTab } from './components/ApiKeysTab';
import { DeleteAccountTab } from './components/DeleteAccountTab';

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
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <Button variant="light" size="small" icon="upload">
              {t('profile:identity.upload', 'Upload image')}
            </Button>
            <p className="text-xs text-muted">
              {t('profile:identity.placeholderNote', 'Avatar uploads will be available after we reconnect the media service.')}
            </p>
          </div>
        </div>

        <Tabs defaultTab="profile">
          <TabList>
            <Tab label="profile">{t('profile:tabs.profile', 'Profile')}</Tab>
            <Tab label="password">{t('profile:tabs.password', 'Password')}</Tab>
            <Tab label="sessions">{t('profile:tabs.sessions', 'Sessions')}</Tab>
            <Tab label="api-keys">{t('profile:tabs.apiKeys', 'API Keys')}</Tab>
            <Tab label="delete-account">{t('profile:tabs.deleteAccount', 'Delete Account')}</Tab>
          </TabList>
          <TabPanels>
            <TabPanel label="profile">
              <ProfileTab />
            </TabPanel>
            <TabPanel label="password">
              <PasswordTab />
            </TabPanel>
            <TabPanel label="sessions">
              <SessionsTab />
            </TabPanel>
            <TabPanel label="api-keys">
              <ApiKeysTab />
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