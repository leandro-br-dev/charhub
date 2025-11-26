
// frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Modal } from "../../../../components/ui/Modal";
import { Button } from "../../../../components/ui/Button";
import { Textarea } from "../../../../components/ui/Textarea";
import { Select } from "../../../../components/ui/Select";
import Switch from "../../../../components/ui/switch";
import ImageGalleryModal from "./ImageGalleryModal";
import MultiUserSettings from "./MultiUserSettings";
import { chatService } from "../../../../services/chatService";
import { characterService } from "../../../../services/characterService";

type TabType = 'general' | 'roleplay' | 'view' | 'multiuser';

const ConversationSettingsModal = ({
  isOpen,
  onClose,
  conversation,
  onSave,
  isLoading,
}: any) => {
  const { t } = useTranslation('chat');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const defaultSettings = {
    interaction_mode: "normal",
    response_length: "medium",
    use_emojis: true,
    use_slang: "low",
    roleplay_specific: {
      scenario_genre: "none",
      custom_scenario_genre_details: "",
      allow_nsfw_conversation: false,
      show_thoughts: false,
      narration_style: "balanced",
    },
    view: {
      background_type: "theme",
      background_value: null,
    },
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Multi-user settings
  const [isMultiUser, setIsMultiUser] = useState(false);
  const [maxUsers, setMaxUsers] = useState(2);
  const [allowUserInvites, setAllowUserInvites] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);

  // Extract characters from conversation participants
  const charactersInConversation = useMemo(() => {
    if (!conversation?.participants) return [];

    const characters: Array<{ id: string; name: string }> = [];
    const seenIds = new Set<string>();

    for (const participant of conversation.participants) {
      // Check actingCharacter
      if (participant.actingCharacter && !seenIds.has(participant.actingCharacter.id)) {
        characters.push({
          id: participant.actingCharacter.id,
          name: `${participant.actingCharacter.firstName}${participant.actingCharacter.lastName ? ' ' + participant.actingCharacter.lastName : ''}`
        });
        seenIds.add(participant.actingCharacter.id);
      }

      // Check representingCharacter
      if (participant.representingCharacter && !seenIds.has(participant.representingCharacter.id)) {
        characters.push({
          id: participant.representingCharacter.id,
          name: `${participant.representingCharacter.firstName}${participant.representingCharacter.lastName ? ' ' + participant.representingCharacter.lastName : ''}`
        });
        seenIds.add(participant.representingCharacter.id);
      }
    }

    return characters;
  }, [conversation?.participants]);

  const openGalleryForSelection = () => {
    setIsGalleryOpen(true);
  };

  useEffect(() => {
    if (isOpen && conversation) {
      const cs = conversation.settings || {};
      const rps = cs.roleplay_specific || {};
      const vs = cs.view || {};

      setSettings({
        interaction_mode: cs.interaction_mode || "normal",
        response_length: cs.response_length || "medium",
        use_emojis: cs.use_emojis !== undefined ? cs.use_emojis : true,
        use_slang: cs.use_slang || "low",
        roleplay_specific: {
          scenario_genre: rps.scenario_genre || "none",
          custom_scenario_genre_details:
            rps.custom_scenario_genre_details || "",
          allow_nsfw_conversation: rps.allow_nsfw_conversation || false,
          show_thoughts: rps.show_thoughts || false,
          narration_style: rps.narration_style || "balanced",
        },
        view: {
          background_type: vs.background_type || "theme",
          background_value: vs.background_value || null,
        },
      });
      setVisibility(conversation.visibility || 'PRIVATE');

      // Load multi-user settings
      setIsMultiUser(conversation.isMultiUser || false);
      setMaxUsers(conversation.maxUsers || 2);
      setAllowUserInvites(conversation.allowUserInvites || false);
      setRequireApproval(conversation.requireApproval || false);

      setError(null);
    }

    // Reset invite link visibility when modal closes
    if (!isOpen) {
      setShowInviteLink(false);
    }
  }, [isOpen, conversation]);

  const handleChange = (field: string, value: any) =>
    setSettings((p) => ({ ...p, [field]: value }));
  const handleRoleplayChange = (field: string, value: any) =>
    setSettings((p) => ({
      ...p,
      roleplay_specific: { ...p.roleplay_specific, [field]: value },
    }));
  const handleViewChange = (field: string, value: any) =>
    setSettings((p) => ({ ...p, view: { ...p.view, [field]: value } }));

  const handleImageSelect = (imageUrl: string) => {
    handleViewChange("background_value", imageUrl);
  };

  const handleRemoveBg = () => {
    handleViewChange("background_type", "theme");
    handleViewChange("background_value", null);
  };

  const handleSave = async () => {
    setError(null);
    try {
      let finalSettings = { ...settings };
      if (
        finalSettings.roleplay_specific.allow_nsfw_conversation &&
        (!user || !user.allow_nsfw)
      ) {
        finalSettings.roleplay_specific.allow_nsfw_conversation = false;
      }
      if (finalSettings.view.background_type === "theme") {
        finalSettings.view.background_value = null;
      }

      // Prepare multi-user settings
      const multiUserSettings = {
        isMultiUser,
        maxUsers: isMultiUser ? maxUsers : 1,
        allowUserInvites: isMultiUser ? allowUserInvites : false,
        requireApproval: isMultiUser ? requireApproval : false,
      };

      // Force PRIVATE visibility if not multi-user
      const finalVisibility = isMultiUser ? visibility : 'PRIVATE';

      await onSave(conversation.id, finalSettings, finalVisibility, multiUserSettings);

      // Show invite link if multi-user was enabled (don't close modal)
      if (isMultiUser) {
        setShowInviteLink(true);
        // Don't close the modal - user needs to see the invite link
      } else {
        // Only close modal if not multi-user
        onClose();
      }

      // TODO: Implement setBackground when view context is available
      // setBackground(finalSettings.view.background_value);
    } catch (err: any) {
      setError(err.message || t("chatPage.errorSavingConfig"));
    }
  };

  const interactionModeOptions = [
    { value: "normal", label: t("conversationSettings.modeNormal") },
    { value: "roleplay", label: t("conversationSettings.modeRoleplay") },
  ];
  const responseLengthOptions = [
    { value: "short", label: t("conversationSettings.lengthShort") },
    { value: "medium", label: t("conversationSettings.lengthMedium") },
    { value: "long", label: t("conversationSettings.lengthLong") },
  ];
  const slangOptions = [
    { value: "none", label: t("conversationSettings.slangNone") },
    { value: "low", label: t("conversationSettings.slangLow") },
    { value: "medium", label: t("conversationSettings.slangMedium") },
  ];
  const scenarioGenreOptions = [
    { value: "none", label: t("conversationSettings.genreNone") },
    { value: "fantasy", label: t("conversationSettings.genreFantasy") },
    { value: "sci_fi", label: t("conversationSettings.genreSciFi") },
    { value: "modern", label: t("conversationSettings.genreModern") },
    { value: "custom", label: t("conversationSettings.genreCustom") },
  ];
  const narrationStyleOptions = [
    { value: "balanced", label: t("conversationSettings.narrationBalanced") },
    {
      value: "descriptive",
      label: t("conversationSettings.narrationDescriptive"),
    },
    {
      value: "dialogue_focused",
      label: t("conversationSettings.narrationDialogue"),
    },
  ];
  const backgroundTypeOptions = [
    { value: "theme", label: t("conversationSettings.bgTypeTheme") },
    { value: "image", label: t("conversationSettings.bgTypeImage") },
  ];

  const visibilityOptions = [
    { value: "PRIVATE", label: t("conversationSettings.visibility.private") },
    { value: "UNLISTED", label: t("conversationSettings.visibility.unlisted") },
    { value: "PUBLIC", label: t("conversationSettings.visibility.public") },
  ];

  if (!conversation) return null;

  const tabs = [
    { id: 'general' as TabType, label: t('conversationSettings.tabs.general', { defaultValue: 'General' }), icon: 'settings' },
    { id: 'roleplay' as TabType, label: t('conversationSettings.tabs.roleplay', { defaultValue: 'Roleplay' }), icon: 'theater_comedy' },
    { id: 'view' as TabType, label: t('conversationSettings.tabs.view', { defaultValue: 'Appearance' }), icon: 'palette' },
    { id: 'multiuser' as TabType, label: t('conversationSettings.tabs.multiuser', { defaultValue: 'Multi-User' }), icon: 'group' },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("conversationSettings.modalTitle")}
        size="lg"
      >
        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-normal mb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted hover:text-content'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <Select
                label={t("conversationSettings.interactionModeLabel")}
                options={interactionModeOptions}
                value={settings.interaction_mode}
                onChange={(v: string) => handleChange("interaction_mode", v)}
                disabled={isLoading}
              />
              <Select
                label={t("conversationSettings.responseLengthLabel")}
                options={responseLengthOptions}
                value={settings.response_length}
                onChange={(v: string) => handleChange("response_length", v)}
                disabled={isLoading}
              />
              <Switch
                label={t("conversationSettings.useEmojisLabel")}
                checked={settings.use_emojis}
                onChange={() => handleChange("use_emojis", !settings.use_emojis)}
                disabled={isLoading}
                stateLabels={{
                  true: t("common.enabled"),
                  false: t("common.disabled"),
                }}
              />
              <Select
                label={t("conversationSettings.useSlangLabel")}
                options={slangOptions}
                value={settings.use_slang}
                onChange={(v: string) => handleChange("use_slang", v)}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Roleplay Tab */}
          {activeTab === 'roleplay' && (
            <div className="space-y-4">
              <Select
                label={t("conversationSettings.scenarioGenreLabel")}
                options={scenarioGenreOptions}
                value={settings.roleplay_specific.scenario_genre}
                onChange={(v: string) => handleRoleplayChange("scenario_genre", v)}
                disabled={isLoading}
              />
              {settings.roleplay_specific.scenario_genre === "custom" && (
                <Textarea
                  label={t("conversationSettings.customGenreDetailsLabel")}
                  value={settings.roleplay_specific.custom_scenario_genre_details}
                  onChange={(e: any) =>
                    handleRoleplayChange("custom_scenario_genre_details", e.target.value)
                  }
                  placeholder={t("conversationSettings.customGenrePlaceholder")}
                  rows={2}
                  disabled={isLoading}
                />
              )}
              <Select
                label={t("conversationSettings.narrationStyleLabel")}
                options={narrationStyleOptions}
                value={settings.roleplay_specific.narration_style}
                onChange={(v: string) => handleRoleplayChange("narration_style", v)}
                disabled={isLoading}
              />
              <Switch
                label={t("conversationSettings.allowNsfwLabel")}
                description={
                  !user?.allow_nsfw
                    ? t("conversationSettings.nsfwGlobalDisabledWarning")
                    : ""
                }
                checked={settings.roleplay_specific.allow_nsfw_conversation}
                onChange={() =>
                  handleRoleplayChange(
                    "allow_nsfw_conversation",
                    !settings.roleplay_specific.allow_nsfw_conversation
                  )
                }
                disabled={isLoading || !user?.allow_nsfw}
                variant={
                  settings.roleplay_specific.allow_nsfw_conversation
                    ? "danger"
                    : "secondary"
                }
                stateLabels={{
                  true: t("common.allowed"),
                  false: t("common.denied"),
                }}
              />
              <Switch
                label={t("conversationSettings.showThoughtsLabel")}
                checked={settings.roleplay_specific.show_thoughts}
                onChange={() =>
                  handleRoleplayChange("show_thoughts", !settings.roleplay_specific.show_thoughts)
                }
                disabled={isLoading}
                stateLabels={{
                  true: t("common.enabled"),
                  false: t("common.disabled"),
                }}
              />
            </div>
          )}

          {/* View Tab */}
          {activeTab === 'view' && (
            <div className="space-y-4">
              <Select
                label={t("conversationSettings.bgTypeLabel")}
                options={backgroundTypeOptions}
                value={settings.view.background_type}
                onChange={(v: string) => handleViewChange("background_type", v)}
                disabled={isLoading}
              />
              {settings.view.background_type === "image" && (
                <div className="flex flex-col items-center gap-2">
                  {settings.view.background_value ? (
                    <div className="relative w-48 h-24 rounded-md overflow-hidden group">
                      <img
                        src={settings.view.background_value}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="danger"
                          size="small"
                          icon="delete"
                          onClick={handleRemoveBg}
                        >
                          {t("conversationSettings.removeBgImageButton")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">
                      {t("conversationSettings.noImageSelected")}
                    </p>
                  )}
                  <Button
                    variant="light"
                    onClick={openGalleryForSelection}
                    disabled={isLoading}
                  >
                    {t("conversationSettings.selectFromGalleryButton")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Multi-User Tab */}
          {activeTab === 'multiuser' && (
            <MultiUserSettings
              isMultiUser={isMultiUser}
              onIsMultiUserChange={(value) => {
                setIsMultiUser(value);
                if (value && maxUsers < 2) {
                  setMaxUsers(2);
                }
              }}
              maxUsers={maxUsers}
              onMaxUsersChange={setMaxUsers}
              allowUserInvites={allowUserInvites}
              onAllowUserInvitesChange={setAllowUserInvites}
              requireApproval={requireApproval}
              onRequireApprovalChange={setRequireApproval}
              showVisibility={true}
              visibility={visibility}
              onVisibilityChange={setVisibility}
              showInviteLink={conversation?.isMultiUser || showInviteLink}
              inviteLinkUrl={conversation?.id ? `${window.location.origin}/chat/join/${conversation.id}` : undefined}
              showConversionWarning={!conversation?.isMultiUser && isMultiUser}
            />
          )}

          {error && <p className="text-sm text-danger mt-4">{error}</p>}
          <div className="flex justify-end gap-2 pt-4 border-t mt-6">
            <Button variant="light" onClick={onClose} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        mode="select"
        onImageSelect={handleImageSelect}
        characters={charactersInConversation}
        title={t("conversationSettings.selectFromGalleryButton")}
      />
    </>
  );
};

export default ConversationSettingsModal;
