import React from 'react';
import { useTranslation } from 'react-i18next';
import Switch from '../../../../components/ui/switch';

interface MultiUserSettingsProps {
  isMultiUser: boolean;
  onIsMultiUserChange: (value: boolean) => void;
  maxUsers: number;
  onMaxUsersChange: (value: number) => void;
  allowUserInvites: boolean;
  onAllowUserInvitesChange: (value: boolean) => void;
  requireApproval: boolean;
  onRequireApprovalChange: (value: boolean) => void;
  showVisibility?: boolean;
  visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  onVisibilityChange?: (value: 'UNLISTED' | 'PUBLIC') => void;
  showInviteLink?: boolean;
  inviteLinkUrl?: string;
  showConversionWarning?: boolean;
}

export default function MultiUserSettings({
  isMultiUser,
  onIsMultiUserChange,
  maxUsers,
  onMaxUsersChange,
  allowUserInvites,
  onAllowUserInvitesChange,
  requireApproval,
  onRequireApprovalChange,
  showVisibility = false,
  visibility = 'PRIVATE',
  onVisibilityChange,
  showInviteLink = false,
  inviteLinkUrl,
  showConversionWarning = false,
}: MultiUserSettingsProps) {
  const { t } = useTranslation('chat');

  const handleMultiUserToggle = (enabled: boolean) => {
    onIsMultiUserChange(enabled);
    // Ensure maxUsers is at least 2 when enabling multi-user
    if (enabled && maxUsers < 2) {
      onMaxUsersChange(2);
    }
  };

  const handleCopyLink = () => {
    if (inviteLinkUrl) {
      navigator.clipboard.writeText(inviteLinkUrl);
    }
  };

  return (
    <div className="space-y-4">
      <Switch
        label={t('multiUser.label', { defaultValue: 'Multi-user conversation' })}
        description={t('multiUser.description', { defaultValue: 'Allow multiple users to participate in this conversation' })}
        checked={isMultiUser}
        onChange={handleMultiUserToggle}
      />

      {isMultiUser && (
        <div className="mt-4 space-y-4">
          <div className="pl-4 space-y-4 border-l-2 border-primary/20">
            {/* Max Users Slider */}
            <div>
              <label className="block text-sm font-medium text-content mb-2">
                {t('multiUser.maxUsers', { defaultValue: 'Maximum users' })}:{' '}
                <span className="text-primary font-semibold">{maxUsers}</span>
              </label>
              <input
                type="range"
                min="2"
                max="4"
                value={maxUsers}
                onChange={(e) => onMaxUsersChange(parseInt(e.target.value))}
                className="h-2 bg-input rounded-lg appearance-none cursor-pointer accent-primary"
                style={{ width: '200px' }}
              />
              <p className="text-xs text-muted mt-1">
                {t('multiUser.maxUsersHint', {
                  defaultValue: 'Up to 4 human users can join (plus unlimited characters)',
                })}
              </p>
            </div>

            {/* Allow user invites */}
            <Switch
              label={t('multiUser.allowInvites', { defaultValue: 'Allow members to invite' })}
              description={t('multiUser.allowInvitesHint', {
                defaultValue: 'Members can invite other users to join',
              })}
              checked={allowUserInvites}
              onChange={onAllowUserInvitesChange}
              size="small"
            />

            {/* Require approval */}
            <Switch
              label={t('multiUser.requireApproval', { defaultValue: 'Require approval to join' })}
              description={t('multiUser.requireApprovalHint', {
                defaultValue: 'Owner must approve new members before they can participate',
              })}
              checked={requireApproval}
              onChange={onRequireApprovalChange}
              size="small"
            />
          </div>

          {/* Visibility Section - Only shown in settings modal */}
          {showVisibility && onVisibilityChange && (
            <div className="pt-4 border-t border-normal space-y-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-base">visibility</span>
                {t('conversationSettings.visibility.sectionTitle')}
              </h3>
              <div>
                <label className="block text-sm font-medium text-content mb-2">
                  {t('conversationSettings.visibility.label')}
                </label>
                <select
                  value={visibility === 'PRIVATE' ? 'UNLISTED' : visibility}
                  onChange={(e) => onVisibilityChange(e.target.value as 'UNLISTED' | 'PUBLIC')}
                  className="w-full px-3 py-2 bg-light border border-normal rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-content"
                >
                  <option value="UNLISTED">
                    {t('conversationSettings.visibility.unlisted')}
                  </option>
                  <option value="PUBLIC">{t('conversationSettings.visibility.public')}</option>
                </select>
              </div>
              {visibility !== 'PRIVATE' && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-warning text-sm mt-0.5">
                      warning
                    </span>
                    <p className="text-sm text-warning-content">
                      {visibility === 'PUBLIC'
                        ? t('conversationSettings.visibility.publicWarning')
                        : t('conversationSettings.visibility.unlistedWarning')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invite Link Section */}
          {showInviteLink && inviteLinkUrl && (
            <div className="pt-4 border-t border-normal space-y-3">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <span className="material-symbols-outlined text-base">link</span>
                {t('multiUser.inviteLink', { defaultValue: 'Invite Link' })}
              </h3>
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                <p className="text-xs text-content/70 mb-2">
                  {t('multiUser.inviteLinkDescription', {
                    defaultValue: 'Share this link with users you want to invite:',
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLinkUrl}
                    className="flex-1 px-3 py-2 text-sm bg-normal border-2 border-success/50 rounded-lg text-content focus:outline-none focus:border-success"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                    title={t('common.copy', { defaultValue: 'Copy' })}
                  >
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversion Warning */}
      {showConversionWarning && isMultiUser && (
        <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-info text-sm mt-0.5">info</span>
            <p className="text-sm text-info-content">
              {t('multiUser.conversionWarning', {
                defaultValue:
                  'This will convert your solo conversation to multi-user mode. You will become the owner with full control.',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
