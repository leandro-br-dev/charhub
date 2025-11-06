
// frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Button } from "../../../../components/ui/Button";
import { Avatar } from "../../../../components/ui/Avatar";
import { Modal } from "../../../../components/ui/Modal";
import { Textarea } from "../../../../components/ui/Textarea";
import ComboboxSelect from "./ComboboxSelect";
import ImageGalleryModal from "./ImageGalleryModal";

// --- Placeholder Services ---
const characterService = {
  getCharacters: async (userId: string, options: any) => ({
    success: true,
    data: [
      { id: 'char1', name: 'Persona One', avatar: null },
      { id: 'char2', name: 'Persona Two', avatar: null },
    ],
  }),
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
  // Use namespaces: chat, common, and characters
  const { t } = useTranslation(["chat", "common", "characters"]);
  const { user: loggedInUser } = useAuth();
  const userId = loggedInUser?.id;

  const [localConfigOverride, setLocalConfigOverride] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [availablePersonas, setAvailablePersonas] = useState<any[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    if (isOpen && participant) {
      setError(null);
      setSaving(false);
      setCloning(false);
      setPromoting(false);
      // Get data from raw ConversationParticipant
      const rawParticipant = participant.raw || participant;
      setLocalConfigOverride(rawParticipant.configOverride || "");
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
      setLocalConfigOverride("");
      setSelectedPersonaId("");
      setAvailablePersonas([]);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, participant]);

  const fetchAvailablePersonas = useCallback(async () => {
    if (!userId) return;
    setLoadingPersonas(true);
    setError(null);
    try {
      const result = await characterService.getCharacters(userId, {
        isPublic: false,
      });
      if (result.success) {
        const personaOptions = (result.data || []).map((char) => ({
          value: char.id,
          label: char.name,
          avatar: char.avatar || null,
        }));
        setAvailablePersonas(personaOptions);
      } else {
        throw new Error(
          (result as any).error || t("participantConfigModal.errorFetchingPersonas")
        );
      }
    } catch (err: any) {
      setError(err.message || t("participantConfigModal.errorLoadingPersonas"));
      setAvailablePersonas([]);
    } finally {
      setLoadingPersonas(false);
    }
  }, [userId, t]);

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    setError(null);
    const configData: any = {};
    let needsUpdate = false;
    const rawParticipant = participant.raw || participant;
    if (
      participant.actorType !== "USER" &&
      localConfigOverride !== (rawParticipant.configOverride || "")
    ) {
      configData.config_override = localConfigOverride;
      needsUpdate = true;
    }
    if (
      participant.actorType === "ASSISTANT" ||
      participant.actorType === "USER"
    ) {
      const currentRepresentationId =
        rawParticipant.representingCharacterId || "";
      if (selectedPersonaId !== currentRepresentationId) {
        configData.representing_character_id = selectedPersonaId || null;
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      try {
        await onSaveConfiguration(participant.id, configData);
        onClose();
      } catch (err: any) {
        setError(err.message || t("chatPage.errorSavingConfig"));
      } finally {
        setSaving(false);
      }
    } else {
      onClose();
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
              <Avatar src={rep.avatar} size="large" />
              <Button
                variant="light"
                size="small"
                icon="photo_library"
                className="absolute top-0 right-0 p-1.5"
                onClick={() => setIsGalleryOpen(true)}
                title={t("participantConfigModal.viewGalleryButton")}
              />
            </div>
            <div className="w-full space-y-2">
              {isCharacterBot && (
                <Button
                  variant="secondary"
                  onClick={handlePromote}
                  disabled={promoting || saving}
                  icon="military_tech"
                  className="w-full"
                >
                  {promoting
                    ? t("chatPage.promotingButton")
                    : t("chatPage.promoteToAssistantButton")}
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
                value={t(`characters:genders.${rep.gender}`, rep.gender || "N/A")}
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
              {(isCharacterBot || isAssistant) && (
                <Textarea
                  label={t("chatPage.specificInstructionsLabel")}
                  placeholder={t("chatPage.specificInstructionsPlaceholder")}
                  value={localConfigOverride}
                  onChange={(e) => setLocalConfigOverride(e.target.value)}
                  rows={4}
                  disabled={saving}
                />
              )}
              {(isAssistant || isUser) && (
                <div>
                  <ComboboxSelect
                    label={
                      isUser
                        ? t("chatPage.assumePersonaLabel")
                        : t("chatPage.changeVisualPersonaLabel")
                    }
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
          mode="view"
          characterId={participant.representation?.id}
          conversationId={participant.conversation_id}
          imageUrls={rep.gallery || []}
          title={t('participantConfigModal.galleryTitle', {
            name: rep.name || t('common.unknown'),
          })}
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
