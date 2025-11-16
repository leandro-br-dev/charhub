import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePageHeader } from '../../hooks/usePageHeader';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';
import { ProfileTab } from './components/ProfileTab';
import { SubscriptionTab } from './components/SubscriptionTab';
import { ContentClassificationTab } from './components/ContentClassificationTab';
import { DeleteAccountTab } from './components/DeleteAccountTab';
import { UrlImageUploader } from '../../components/ui/UrlImageUploader';
import { userService } from '../../services/userService';

export default function ProfilePage(): JSX.Element {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation(['profile', 'common']);
  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle(t('profile:sectionTitle', 'Account'));
  }, [setTitle, t]);

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('profile:title', 'Manage your profile')}</h1>
        <p className="max-w-2xl text-sm text-description">
          {t(
            'profile:subtitle',
            'Update how other people see you on CharHub. Preferences that are still being migrated will appear here soon.'
          )}
        </p>
      </header>

      <div className="grid items-stretch gap-6 md:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-title">{t('profile:identity.header', 'Profile photo')}</h2>
          <p className="mt-2 text-sm text-description">
            {t('profile:identity.description', 'Pick an avatar to represent you across chats and characters.')}
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <UrlImageUploader
              value={user?.photo ?? null}
              onChange={() => { /* no-op; afterCropSave updates auth state */ }}
              displayInitial={(user?.displayName?.[0] || '?').toUpperCase()}
              cropShape="round"
              aspect={1}
              previewClassName="h-24 w-24 rounded-full object-cover shadow-sm"
              uploadLabel="Select image"
              changeLabel="Change image"
              removeLabel="Remove"
              urlModalTitle="Use image from URL"
              urlLabel="Image URL"
              invalidUrlMessage="Enter a valid image URL (http/https)."
              loadingMessage="Uploading..."
              useActionLabel="Use"
              cancelLabel="Cancel"
              previewAlt="Avatar preview"
              enableDeviceUpload
              afterCropSave={async (blob) => {
                const file = new File([blob], 'avatar.png', { type: 'image/png' });
                const updated = await userService.uploadAvatar(file);
                updateUser(updated);
                return updated.photo || null;
              }}
            />
          </div>
        </div>

        <div className="flex h-full flex-col">
          <Tabs defaultTab="profile">
            <TabList>
              <Tab label="profile">{t('profile:tabs.profile', 'Profile')}</Tab>
              <Tab label="subscription">{t('profile:subscription.header', 'Subscription & Credits')}</Tab>
              <Tab label="content-classification">{t('profile:tabs.contentClassification', 'Content Classification')}</Tab>
              <Tab label="delete-account">{t('profile:tabs.deleteAccount', 'Delete Account')}</Tab>
            </TabList>
            <TabPanels className="mt-4 flex-1 h-full flex flex-col">
              <TabPanel label="profile" className="h-full">
                <ProfileTab />
              </TabPanel>
              <TabPanel label="subscription" className="h-full">
                <SubscriptionTab />
              </TabPanel>
              <TabPanel label="content-classification" className="h-full">
                <ContentClassificationTab />
              </TabPanel>
              <TabPanel label="delete-account" className="h-full flex flex-col">
                <DeleteAccountTab />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
