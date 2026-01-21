
// frontend/src/pages/(chat)/shared/components/ParticipantConfigModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Button, Avatar, AvatarWithFallback, CharacterSelector } from "../../../../components/ui";
import { Modal } from "../../../../components/ui/Modal";
import { Textarea } from "../../../../components/ui/Textarea";
import { ImageViewerModal } from "../../../../components/ui/ImageViewerModal";
import ImageGalleryModal from "./ImageGalleryModal";

import { characterService } from "../../../../services/characterService";

// Types for user config override
interface UserConfigOverride {
  instructions?: string;
  nameOverride?: string;
  ageOverride?: number;
  genderOverride?: 'male' | 'female' | 'non-binary' | 'other' | null;
  avatarOverride?: string;
  descriptionOverride?: string;
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
    <div className="flex items-center gap-2 px-3 py-2 bg-light rounded-lg">
      <span className="material-symbols-outlined text-base text-primary flex-shrink-0">
        {icon}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted whitespace-nowrap">{label}:</span>
        <span className="text-sm font-semibold text-content whitespace-nowrap">{value}</span>
      </div>
    </div>
  );
};

// Component for expandable text description (3 lines max, with "see more")
const ExpandableText = ({ text, className }: { text: string, className?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation(['common']);

  return (
    <div className={className}>
      <p
        className={`text-sm text-description text-left p-3 bg-light rounded-md whitespace-pre-wrap ${
          isExpanded ? '' : 'line-clamp-3'
        }`}
      >
        {text}
      </p>
      {text.length > 150 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary hover:underline mt-1 ml-3"
        >
          {isExpanded ? t('common.showLess', 'Ver menos') : t('common.showMore', 'Ver mais')}
        </button>
      )}
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
  const [nameOverride, setNameOverride] = useState("");
  const [ageOverride, setAgeOverride] = useState("");
  const [genderOverride, setGenderOverride] = useState("male");
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [descriptionOverride, setDescriptionOverride] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [availablePersonas, setAvailablePersonas] = useState<any[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [personaCharacterData, setPersonaCharacterData] = useState<any>(null);

  // State for character/assistant config
  const [localConfigOverride, setLocalConfigOverride] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; title: string } | null>(null);

  // Debug: log viewerImage changes
  useEffect(() => {
    console.log('[ParticipantConfigModal] viewerImage changed:', viewerImage);
  }, [viewerImage]);

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
        setNameOverride(userConfig?.nameOverride || "");

        // Age: use override if available, otherwise calculate from birth date
        if (userConfig?.ageOverride) {
          setAgeOverride(String(userConfig.ageOverride));
        } else {
          const birthDate = (loggedInUser as any)?.birthDate || (loggedInUser as any)?.dateOfBirth;
          const age = calculateAge(birthDate);
          setAgeOverride(age ? String(age) : "");
        }

        setGenderOverride((userConfig?.genderOverride || loggedInUser?.gender || "male").toLowerCase());
        setAvatarOverride(userConfig?.avatarOverride || null);
        setDescriptionOverride(userConfig?.descriptionOverride || "");
      } else {
        // For characters/assistants, use plain string
        setLocalConfigOverride(rawParticipant.configOverride || "");
      }

      setSelectedPersonaId(rawParticipant.representingCharacterId || null);

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
      setNameOverride("");
      setAgeOverride("");
      setGenderOverride("male");
      setAvatarOverride(null);
      setDescriptionOverride("");
      setLocalConfigOverride("");
      setSelectedPersonaId(null);
      setAvailablePersonas([]);
      setPersonaCharacterData(null);
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
        limit: 500, // Load all user's characters + public characters
        search,
      });

      if (result.success) {
        const personaOptions = (result.data || []).map((char) => ({
          value: char.id,
          label: char.lastName
            ? `${char.firstName} ${char.lastName}`
            : char.firstName,
          avatar: char.avatar || null,
          gender: char.gender || null,
          isFavorite: false, // TODO: Fetch favorite status from API
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

  // Helper function to calculate age from birth date
  const calculateAge = (birthDate: string | Date | null | undefined): number | null => {
    if (!birthDate) return null;
    try {
      const dob = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  // Handle persona selection and auto-populate fields
  const handlePersonaChange = useCallback(async (personaId: string | null) => {
    setSelectedPersonaId(personaId);

    if (!personaId) {
      // Clear fields if no persona selected
      setPersonaCharacterData(null);
      return;
    }

    try {
      // Fetch full character data to get all details
      const characterData = await characterService.getById(personaId);
      setPersonaCharacterData(characterData);

      // Auto-populate fields with character data
      // Name: firstName + lastName
      const fullName = characterData.lastName
        ? `${characterData.firstName} ${characterData.lastName}`
        : characterData.firstName;
      setNameOverride(fullName);

      // Age: use character's age directly if available
      if (characterData.age) {
        setAgeOverride(String(characterData.age));
      } else {
        setAgeOverride("");
      }

      // Gender: always update, default to male if not set
      // Normalize gender to lowercase to match select values
      const newGender = (characterData.gender || "male").toLowerCase();
      console.log('[ParticipantConfigModal] Setting gender to:', newGender, 'from characterData.gender:', characterData.gender);
      setGenderOverride(newGender);

      // Avatar: use character's avatar or first avatar image
      let newAvatar = "";
      if (characterData.avatar) {
        newAvatar = characterData.avatar;
      } else if (characterData.images?.[0]?.url) {
        newAvatar = characterData.images[0].url;
      }
      console.log('[ParticipantConfigModal] Setting avatar to:', newAvatar, 'from characterData:', { avatar: characterData.avatar, hasImages: !!characterData.images?.length });
      setAvatarOverride(newAvatar || null);

      // Description: combine physical characteristics and personality
      const descriptionParts = [
        characterData.physicalCharacteristics,
        characterData.personality,
      ].filter(Boolean);
      if (descriptionParts.length > 0) {
        setDescriptionOverride(descriptionParts.join('\n\n'));
      } else {
        setDescriptionOverride("");
      }
    } catch (err) {
      console.error('[ParticipantConfigModal] Failed to fetch character details:', err);
      setError(t("participantConfigModal.errorLoadingPersonas"));
    }
  }, [t]);

  const handleSave = async () => {
    if (!participant) return;
    setSaving(true);
    setError(null);

    try {
      const configData: any = {};
      const rawParticipant = participant.raw || participant;
      const isUser = participant.actorType === "USER";

      if (isUser) {
        // For users: combine instructions + all override fields into JSON
        const userConfig: UserConfigOverride = {};

        if (userInstructions.trim()) {
          userConfig.instructions = userInstructions.trim();
        }

        if (nameOverride.trim()) {
          userConfig.nameOverride = nameOverride.trim();
        }

        if (ageOverride.trim()) {
          const ageNum = parseInt(ageOverride.trim(), 10);
          if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
            userConfig.ageOverride = ageNum;
          }
        }

        if (genderOverride) {
          userConfig.genderOverride = genderOverride as 'male' | 'female' | 'non-binary' | 'other';
        }

        if (avatarOverride && avatarOverride.trim()) {
          userConfig.avatarOverride = avatarOverride.trim();
        }

        if (descriptionOverride.trim()) {
          userConfig.descriptionOverride = descriptionOverride.trim();
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
            rawParticipant.representingCharacterId || null;
          if (selectedPersonaId !== currentRepresentationId) {
            configData.representing_character_id = selectedPersonaId;
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

  // Helper function to get the default "None" option with proper translation
  const getNoneOption = useCallback(() => {
    return { value: "", label: `- ${t("common.none")} -`, avatar: null };
  }, [t]);

  const personaOptionsWithDefault = useMemo(
    () => availablePersonas,
    [availablePersonas]
  );

  // Handle reset to default user values
  const handleResetToDefault = useCallback(() => {
    setSelectedPersonaId(null);
    setPersonaCharacterData(null);

    // Reset to user's default values
    if (loggedInUser) {
      setNameOverride(loggedInUser.displayName || loggedInUser.username || "");

      // Calculate age from birth date if available
      const birthDate = (loggedInUser as any).birthDate || (loggedInUser as any).dateOfBirth;
      const age = calculateAge(birthDate);
      setAgeOverride(age ? String(age) : "");

      setGenderOverride((loggedInUser.gender || "male").toLowerCase());

      // Clear avatar override (null will use the user's original photo)
      setAvatarOverride(null);
    } else {
      setNameOverride("");
      setAgeOverride("");
      setGenderOverride("male");
      setAvatarOverride(null);
    }
    setDescriptionOverride("");
  }, [loggedInUser]);

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
      <div className="space-y-3">
        {/* Quick Setup: Character Selector */}
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
          <label className="text-xs font-semibold text-primary mb-1.5 block flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {t("chatPage.assumePersonaLabel")}
          </label>
          <div className="flex gap-2">
            <CharacterSelector
              characters={personaOptionsWithDefault}
              selectedId={selectedPersonaId ?? undefined}
              onSelect={(character) => {
                handlePersonaChange(character ? (character as any).value : null);
              }}
              placeholder={t("chatPage.searchCharacterPlaceholder")}
              disabled={saving || loadingPersonas}
              searchable
              loading={loadingPersonas}
              enableFilters={true}
              className="flex-grow"
            />
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={saving}
              className="px-3 py-2 text-sm rounded-lg border border-border bg-light dark:bg-gray-700 text-content hover:bg-gray-100 dark:hover:bg-gray-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              title="Restaurar valores padrão do usuário"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
            </button>
          </div>
        </div>

        {/* Compact Grid: Name, Age, Gender */}
        <div className="grid grid-cols-3 gap-2">
          {/* Name Override */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">badge</span>
            <input
              type="text"
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder={t("chatPage.nameOverridePlaceholder")}
              disabled={saving}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-border bg-light dark:bg-gray-700 text-content placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Age Override */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">cake</span>
            <input
              type="number"
              value={ageOverride}
              onChange={(e) => setAgeOverride(e.target.value)}
              placeholder={t("chatPage.ageOverridePlaceholder")}
              disabled={saving}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-border bg-light dark:bg-gray-700 text-content placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Gender Override */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">wc</span>
            <select
              value={genderOverride}
              onChange={(e) => setGenderOverride(e.target.value)}
              disabled={saving}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-border bg-light dark:bg-gray-700 text-content focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
            >
              <option value="male">{t("dashboard:filters.genders.male")}</option>
              <option value="female">{t("dashboard:filters.genders.female")}</option>
              <option value="non-binary">{t("dashboard:filters.genders.nonBinary")}</option>
              <option value="other">{t("dashboard:filters.genders.other")}</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">expand_more</span>
          </div>
        </div>

        {/* Description Override */}
        <div>
          <label className="text-xs font-medium text-muted mb-1 block flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">description</span>
            {t("chatPage.descriptionOverrideLabel")}
          </label>
          <Textarea
            value={descriptionOverride}
            onChange={(e) => setDescriptionOverride(e.target.value)}
            placeholder={t("chatPage.descriptionOverridePlaceholder")}
            rows={2}
            disabled={saving}
            maxLength={2000}
            className="text-sm"
          />
        </div>

        {/* Additional Instructions */}
        <div>
          <label className="text-xs font-medium text-muted mb-1 block flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">edit_note</span>
            {t("chatPage.userInstructionsLabel")}
          </label>
          <Textarea
            value={userInstructions}
            onChange={(e) => setUserInstructions(e.target.value)}
            placeholder={t("chatPage.userInstructionsPlaceholder")}
            rows={2}
            disabled={saving}
            maxLength={1000}
            className="text-sm"
          />
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
                <AvatarWithFallback
                  src={
                    isUser && avatarOverride && avatarOverride.trim()
                      ? avatarOverride
                      : (isUser ? (loggedInUser?.photo || rep.avatar) : rep.avatar)
                  }
                  alt={rep.name || t("common.unknown")}
                  className="w-full h-full object-cover"
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
            {combinedFeatures && (
              <ExpandableText text={combinedFeatures} />
            )}

            <div className="space-y-4">
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
                  <label className="block text-sm font-medium text-content mb-2">
                    {t("chatPage.changeVisualPersonaLabel")}
                  </label>
                  <CharacterSelector
                    characters={personaOptionsWithDefault}
                    selectedId={selectedPersonaId ?? undefined}
                    onSelect={(character) => {
                      setSelectedPersonaId(character ? (character as any).value : null);
                    }}
                    placeholder={t("chatPage.selectCharacterPlaceholder")}
                    disabled={saving || loadingPersonas}
                    loading={loadingPersonas}
                    enableFilters={true}
                    searchable
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
        {error && (
          <div className="mt-4">
            <p className="text-sm text-danger text-center">{error}</p>
          </div>
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
            console.log('[ParticipantConfigModal] onImageSelect called with URL:', url);
            console.log('[ParticipantConfigModal] rep.gallery:', rep.gallery);
            // Set viewer image first, then close gallery
            const newViewerImage = {
              src: url,
              title: rep.name || t('common.unknown'),
            };
            console.log('[ParticipantConfigModal] Setting viewerImage to:', newViewerImage);
            setViewerImage(newViewerImage);
            // Close gallery after a small delay to ensure viewer is ready
            setTimeout(() => {
              console.log('[ParticipantConfigModal] Closing gallery');
              setIsGalleryOpen(false);
            }, 100);
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
      maxHeight="max-h-[90vh]"
      maxContentHeight="max-h-[65vh]"
      stickyFooter={
        <div className="flex gap-2">
          <Button
            variant="secondary"
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
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      }
    >
      {renderContent()}
    </Modal>
  );
};

export default ParticipantConfigModal;
