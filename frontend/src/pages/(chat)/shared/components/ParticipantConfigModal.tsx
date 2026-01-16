
// frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Button } from "../../../../components/ui/Button";
import { Avatar } from "../../../../components/ui/Avatar";
import { Modal } from "../../../../components/ui/Modal";
import { Textarea } from "../../../../components/ui/Textarea";
import { ImageViewerModal } from "../../../../components/ui/ImageViewerModal";
import ComboboxSelect from "./ComboboxSelect";
import ImageGalleryModal from "./ImageGalleryModal";

import { characterService } from "../../../../services/characterService";

// Types for user config override
interface UserConfigOverride {
  instructions?: string;
  genderOverride?: 'male' | 'female' | 'non-binary' | 'other' | null;
}

// Helper to parse user config from configOverride string
const parseUserConfig = (configOverride?: string | null): UserConfigOverride | null => {
  if (!configOverride) return null;
  try {
    return JSON.parse(configOverride);
  } catch {
    // If not JSON, treat as plain instructions string
    return { instructions: configOverride };
  }
};

const InfoItem = ({ icon, label, value }: { icon: string, label: string, value: any }) => {
  if (!value) return null;
  return (
    <div className="flex items-center space-x-2 p-2 bg-light rounded-lg">
      <span className="material-symbols-outlined text-base text-primary">
        {icon}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted">{label}:</span>
        <span className="text-sm font-semibold text-content">{value}</span>
      </div>
    </div>
  );
};

interface ParticipantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: any;
  onSaveConfiguration: (participantId: string, configData: any) => Promise<void>;
  onCloneAssistant: (assistantId: string) => Promise<void>;
  onPromoteCharacter: (characterId: string) => Promise<void>;
}

const ParticipantConfigModal = ({
  isOpen,
  onClose,
  participant,
  onSaveConfiguration,
  onCloneAssistant,
  onPromoteCharacter,
}: ParticipantConfigModalProps) => {
  // Use namespaces: chat, common, characters, and dashboard
  const { t } = useTranslation(["chat", "common", "characters", "dashboard"]);
  const { user: loggedInUser } = useAuth();
  const userId = loggedInUser?.id;

  // State for user instructions and config
  const [userInstructions, setUserInstructions] = useState("");
  const [genderOverride, setGenderOverride] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [availablePersonas, setAvailablePersonas] = useState<any[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  // State for character/assistant config
  const [localConfigOverride, setLocalConfigOverride] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (isOpen && participant) {
      setError(null);
      setSaving(false);
      setCloning(false);
      setPromoting(false);

      const rawParticipant = participant.raw || participant;
      const isUser = participant.actorType === "USER";

      if (isUser) {
        // Parse user config from JSON
        const userConfig = parseUserConfig(rawParticipant.configOverride);
        setUserInstructions(userConfig?.instructions || "");
        setGenderOverride(userConfig?.genderOverride || "");
      } else {
        // For characters/assistants, use plain string
        setLocalConfigOverride(rawParticipant.configOverride || "");
      }

      setSelectedPersonaId(rawParticipant.representingCharacterId || "");

      if (
        participant.actorType === "ASSISTANT" ||
        participant.actorType === "USER"
      ) {
        fetchAvailablePersonas();
      } else {
        setAvailablePersonas([]);
      }
    } else if (!isOpen) {
      setUserInstructions("");
      setGenderOverride("");
      setLocalConfigOverride("");
      setSelectedPersonaId("");
      setAvailablePersonas([]);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, participant]);

  // Fetch available personas for user/assistant selection
  const fetchAvailablePersonas = useCallback(async (search?: string) => {
    if (!userId) return;
    setLoadingPersonas(true);
    setError(null);
    try {
      const result = await characterService.getAvailablePersonas({
        page: 1,
        limit: 20,
        search,
      });

      if (result.success) {
        const personaOptions = (result.data || []).map((char) => ({
          value: char.id,
          label: char.lastName
            ? `${char.firstName} ${char.lastName}`
            : char.firstName,
          avatar: char.avatar || null,
        }));
        setAvailablePersonas(personaOptions);
      } else {
        throw new Error(t("participantConfigModal.errorFetchingPersonas"));
      }
    } catch (err: any) {
      setError(err.message || t("participantConfigModal.errorLoadingPersonas"));
      setAvailablePersonas([]);
    } finally {
      setLoadingPersonas(false);
    }
  }, [userId, t]);

  // Handle search in persona dropdown
  const handlePersonaSearch = useCallback((searchTerm: string) => {
    fetchAvailablePersonas(searchTerm);
  }, [fetchAvailablePersonas]);

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    setError(null);

    try {
      const configData: any = {};
      const rawParticipant = participant.raw || participant;
      const isUser = participant.actorType === "USER";

      if (isUser) {
        // For users: combine instructions + gender override into JSON
        const userConfig: UserConfigOverride = {};

        if (userInstructions.trim()) {
          userConfig.instructions = userInstructions.trim();
        }

        if (genderOverride) {
          userConfig.genderOverride = genderOverride as 'male' | 'female' | 'non-binary' | 'other';
        }

        configData.config_override = Object.keys(userConfig).length > 0
          ? JSON.stringify(userConfig)
          : null;

        configData.representing_character_id = selectedPersonaId || null;
      } else {
        // For characters/assistants: plain string instructions
        if (localConfigOverride !== (rawParticipant.configOverride || "")) {
          configData.config_override = localConfigOverride.trim() || null;
        }

        if (
          participant.actorType === "ASSISTANT"
        ) {
          const currentRepresentationId =
            rawParticipant.representingCharacterId || "";
          if (selectedPersonaId !== currentRepresentationId) {
            configData.representing_character_id = selectedPersonaId || null;
          }
        }
      }

      await onSaveConfiguration(participant.id, configData);
      onClose();
    } catch (err: any) {
      setError(err.message || t("chatPage.errorSavingConfig"));
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async () => {
    if (!participant?.actorId || participant.actorType !== "ASSISTANT") return;
    setCloning(true);
    setError(null);
    try {
      await onCloneAssistant(participant.actorId);
      onClose();
    } catch (err: any) {
      setError(err.message || t("chatPage.errorCloningAssistant"));
    } finally {
      setCloning(false);
    }
  };
  const handlePromote = async () => {
    if (!participant?.actorId || participant.actorType !== "CHARACTER") return;
    setPromoting(true);
    setError(null);
    try {
      await onPromoteCharacter(participant.actorId);
      onClose();
    } catch (err: any) {
      setError(err.message || t("chatPage.errorPromotingCharacter"));
    } finally {
      setPromoting(false);
    }
  };

  const modalTitle = useMemo(() => {
    if (!participant) return t("chatPage.configureParticipantTitle");
    const name = participant.representation?.name || participant.actorId;
    if (participant.actorType === "CHARACTER")
      return t("chatPage.configureBotTitle", { name });
    if (participant.actorType === "ASSISTANT")
      return t("chatPage.configureAssistantTitle", { name });
    if (participant.actorType === "USER")
      return t("chatPage.configureUserRoleplayTitle", { name });
    return t("chatPage.configureParticipantTitle");
  }, [participant, t]);

  const personaOptionsWithDefault = useMemo(
    () => [
      { value: "", label: `- ${t("common.none")} -`, avatar: null },
      ...availablePersonas,
    ],
    [availablePersonas, t]
  );

  const combinedFeatures = useMemo(() => {
    if (!participant?.representation) return null;
    const rep = participant.representation;
    const parts = [
      rep.physical_characteristics,
      rep.personality,
      rep.default_attire
    ].filter(Boolean);
    return parts.join(" \n\n ");
  }, [participant]);

  // Render user-specific content
  const renderUserContent = () => {
    return (
      <div className="space-y-4">
        {/* User Instructions */}
        <Textarea
          label={t("chatPage.userInstructionsLabel")}
          placeholder={t("chatPage.userInstructionsPlaceholder")}
          value={userInstructions}
          onChange={(e) => setUserInstructions(e.target.value)}
          rows={3}
          disabled={saving}
          maxLength={1000}
        />
        <p className="text-xs text-muted">
          {t("chatPage.userInstructionsHelp")}
        </p>

        {/* Gender Override for this Conversation */}
        <div>
          <label className="block text-sm font-medium text-content mb-2">
            {t("chatPage.genderOverrideLabel")}
          </label>
          <select
            value={genderOverride}
            onChange={(e) => setGenderOverride(e.target.value)}
            className="w-full bg-light border border-dark rounded-lg px-3 py-2 text-content"
            disabled={saving}
          >
            <option value="">{t("chatPage.genderUseDefault")}</option>
            <option value="male">{t("dashboard:filters.genders.male")}</option>
            <option value="female">{t("dashboard:filters.genders.female")}</option>
            <option value="non-binary">{t("dashboard:filters.genders.nonBinary")}</option>
            <option value="other">{t("dashboard:filters.genders.other")}</option>
          </select>
          <p className="text-xs text-muted mt-1">
            {t("chatPage.genderOverrideHelp")}
          </p>
        </div>

        {/* Assume Persona */}
        <div>
          <ComboboxSelect
            label={t("chatPage.assumePersonaLabel")}
            options={personaOptionsWithDefault}
            value={selectedPersonaId}
            onChange={setSelectedPersonaId}
            placeholder={t("chatPage.searchCharacterPlaceholder")}
            valueKey="value"
            labelKey="label"
            disabled={saving || loadingPersonas}
            searchable
            onSearch={handlePersonaSearch}
          />
          <p className="text-xs text-muted mt-1">
            {t("chatPage.assumePersonaHelp")}
          </p>
          {loadingPersonas && (
            <p className="text-xs text-primary mt-1">
              {t("chatPage.loadingPersonas")}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!participant)
      return <p className="text-muted">{t("chatPage.participantNotFound")}</p>;

    const rep = participant.representation || {};
    const isAssistant = participant.actorType === "ASSISTANT";
    const isCharacterBot = participant.actorType === "CHARACTER";
    const isUser = participant.actorType === "USER";
    const assistantDetails = isAssistant ? participant.acting_assistant : null;
    const canClone = 
      isAssistant && 
      assistantDetails?.public && 
      assistantDetails?.user_id !== userId;

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <div className="md:col-span-1 flex flex-col items-center space-y-4">
            <div className="relative group">
              <div className="w-48 h-64 rounded-2xl border-2 border-border overflow-hidden shadow-lg bg-light">
                <img
                  src={rep.avatar || "/default-avatar.png"}
                  alt={rep.name || t("common.unknown")}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/default-avatar.png";
                  }}
                />
              </div>
              <Button
                variant="light"
                size="small"
                icon="photo_library"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md"
                onClick={() => setIsGalleryOpen(true)}
                title={t("participantConfigModal.viewGalleryButton")}
              />
            </div>
            <div className="w-full space-y-2">
              {isCharacterBot && (
                <Button
                  variant="secondary"
                  onClick={handlePromote}
                  disabled={true}
                  icon="military_tech"
                  className="w-full opacity-50"
                  title={t("chatPage.promoteComingSoon")}
                >
                  {t("chatPage.promoteToAssistantButton")}
                  <span className="text-xs ml-2">({t("common.comingSoon")})</span>
                </Button>
              )}
              {canClone && (
                <Button
                  variant="secondary"
                  onClick={handleClone}
                  disabled={cloning || saving}
                  icon="content_copy"
                  className="w-full"
                >
                  {cloning
                    ? t("chatPage.cloningButton")
                    : t("chatPage.cloneButton")}
                </Button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-content">
                {rep.name || t("common.unknown")}
              </h3>
              {isAssistant && rep.id !== participant.actorId && (
                <p className="text-sm text-muted">
                  {t("participantConfigModal.assistantDetails", {
                    name:
                      assistantDetails?.name || t("common.nameNotAvailable"),
                  })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              <InfoItem
                icon="palette"
                label={t("characters:form.fields.style")}
                value={rep.style || "N/A"}
              />
              <InfoItem
                icon={
                  rep.gender === "male"
                    ? "male"
                    : rep.gender === "female"
                    ? "female"
                    : "transgender"
                }
                label={t("characters:form.fields.gender")}
                value={rep.gender ? t(`dashboard:filters.genders.${rep.gender.toUpperCase()}`, rep.gender) : "N/A"}
              />
              {rep.age && (
                <InfoItem
                  icon="cake"
                  label={t("characters:form.fields.age")}
                  value={rep.age}
                />
              )}
            </div>

            {combinedFeatures && (
              <p className="text-sm text-description text-left p-3 bg-light rounded-md whitespace-pre-wrap">
                {combinedFeatures}
              </p>
            )}

            <div className="pt-4 border-t border-gray-700 space-y-4">
              {/* User-specific configuration */}
              {isUser && renderUserContent()}

              {/* Character/Assistant instructions */}
              {(isCharacterBot || isAssistant) && (
                <div className="space-y-2">
                  <Textarea
                    label={t("chatPage.specificInstructionsLabel")}
                    placeholder={t("chatPage.specificInstructionsPlaceholder")}
                    value={localConfigOverride}
                    onChange={(e) => setLocalConfigOverride(e.target.value)}
                    rows={4}
                    disabled={saving}
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted">
                      {t("chatPage.specificInstructionsHelp")}
                    </p>
                    <span className="text-xs text-muted">
                      {localConfigOverride.length}/2000
                    </span>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:underline">
                      {t("chatPage.specificInstructionsExamples")}
                    </summary>
                    <ul className="mt-2 space-y-1 text-muted pl-4 list-disc">
                      <li>{t("chatPage.exampleInstruction1")}</li>
                      <li>{t("chatPage.exampleInstruction2")}</li>
                      <li>{t("chatPage.exampleInstruction3")}</li>
                    </ul>
                  </details>
                </div>
              )}

              {/* Assistant persona selection */}
              {isAssistant && (
                <div>
                  <ComboboxSelect
                    label={t("chatPage.changeVisualPersonaLabel")}
                    options={personaOptionsWithDefault}
                    value={selectedPersonaId}
                    onChange={setSelectedPersonaId}
                    placeholder={t("chatPage.selectCharacterPlaceholder")}
                    valueKey="value"
                    labelKey="label"
                    disabled={saving || loadingPersonas}
                  />
                  {loadingPersonas && (
                    <p className="text-xs text-muted mt-1">
                      {t("chatPage.loadingPersonas")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700 mt-4">
          <Button
            variant="light"
            onClick={onClose}
            disabled={saving || cloning || promoting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || cloning || promoting}
          >
            {saving
              ? t("chatPage.savingConfigurationButton")
              : t("chatPage.saveConfigurationButton")}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-danger text-center mt-2">{error}</p>
        )}
        <ImageGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          mode="select"
          characterId={participant.representation?.id}
          conversationId={participant.conversation_id}
          imageUrls={rep.gallery || []}
          title={t('participantConfigModal.galleryTitle', {
            name: rep.name || t('common.unknown'),
          })}
          onImageSelect={(url) => {
            // Open image in ImageViewerModal when user clicks on it
            setIsGalleryOpen(false); // Close gallery first
            setViewerImage({
              src: url,
              title: rep.name || t('common.unknown'),
            });
          }}
        />
        <ImageViewerModal
          isOpen={viewerImage !== null}
          onClose={() => setViewerImage(null)}
          src={viewerImage?.src || ''}
          title={viewerImage?.title || ''}
        />
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      className="!max-w-3xl"
    >
      {renderContent()}
    </Modal>
  );
};

export default ParticipantConfigModal;
