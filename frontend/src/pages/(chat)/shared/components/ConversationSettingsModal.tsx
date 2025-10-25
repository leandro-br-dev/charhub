
// frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Modal } from "../../../../components/ui/Modal";
import { Button } from "../../../../components/ui/Button";
import { Textarea } from "../../../../components/ui/Textarea";
import { Select } from "../../../../components/ui/Select";
import Switch from "../../../../components/ui/switch";
import ImageGalleryModal from "./ImageGalleryModal";
import { chatService } from "../../../../services/chatService";
import { characterService } from "../../../../services/characterService";


const ConversationSettingsModal = ({
  isOpen,
  onClose,
  conversation,
  onSave,
  isLoading,
}: any) => {
  const { t } = useTranslation('chat');
  const { user } = useAuth();

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
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const fetchGalleryImages = useCallback(async () => {
    if (!conversation?.id) return;
    setLoadingGallery(true);
    setGalleryError(null);
    try {
        const images = await chatService.getConversationGallery(conversation.id);
        setGalleryImages(images || []);
    } catch (err) {
        console.error('[ConversationSettings] Error loading gallery:', err);
        setGalleryError(t('conversationSettings.errorLoadingGallery'));
        setGalleryImages([]);
    } finally {
        setLoadingGallery(false);
    }
  }, [conversation, t]);

  const openGalleryForSelection = () => {
    setGalleryError(null);
    fetchGalleryImages();
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
      setError(null);
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

      await onSave(conversation.id, finalSettings);
      // TODO: Implement setBackground when view context is available
      // setBackground(finalSettings.view.background_value);
      onClose(); 
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

  if (!conversation) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("conversationSettings.modalTitle")}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-3">
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

          <div className="p-4 border-t border-gray-600 mt-4 space-y-4">
            <h3 className="text-md font-semibold text-content">
              {t("conversationSettings.viewOptionsTitle")}
            </h3>
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
                        {" "}
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

          {settings.interaction_mode === "roleplay" && (
            <div className="p-4 border-t border-gray-700 mt-4 space-y-4">
              <h3 className="text-md font-semibold text-content">
                {t("conversationSettings.roleplaySpecificTitle")}
              </h3>
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
                  value={
                    settings.roleplay_specific.custom_scenario_genre_details
                  }
                  onChange={(e: any) =>
                    handleRoleplayChange(
                      "custom_scenario_genre_details",
                      e.target.value
                    )
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
                  handleRoleplayChange(
                    "show_thoughts",
                    !settings.roleplay_specific.show_thoughts
                  )
                }
                disabled={isLoading}
                stateLabels={{
                  true: t("common.enabled"),
                  false: t("common.disabled"),
                }}
              />
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
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
        conversationId={conversation.id}
        participants={conversation.participants}
        imageUrls={galleryImages}
        loading={loadingGallery}
        error={galleryError}
        title={t("conversationSettings.selectFromGalleryButton")}
      />
    </>
  );
};

export default ConversationSettingsModal;
