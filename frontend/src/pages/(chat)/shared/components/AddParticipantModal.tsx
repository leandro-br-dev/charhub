
// frontend/src/pages/(chat)/shared/components/AddParticipantModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Button } from "../../../../components/ui/Button";
import { Avatar } from "../../../../components/ui/Avatar";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui";
import { characterService } from "../../../../services/characterService";
import { assistantService } from "../../../../services/assistantService";
import api from "../../../../lib/api";

interface User {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParticipants: any[];
  onAddParticipant: (actorData: any) => void;
  // Multi-user props (optional - only needed for user invites)
  conversationId?: string;
  currentMemberIds?: string[];
  onInviteUser?: (userId: string) => Promise<void>;
  isMultiUser?: boolean;
}

const AddParticipantModal = React.memo(
  ({
    isOpen,
    onClose,
    currentParticipants = [],
    onAddParticipant,
    conversationId,
    currentMemberIds = [],
    onInviteUser,
    isMultiUser = false,
  }: AddParticipantModalProps) => {
    const { t } = useTranslation('chat');
    const { user } = useAuth();
    const userId = user?.id;

    const [activeTab, setActiveTab] = useState("characters");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    const currentActorIds = useMemo(() => {
      if (!Array.isArray(currentParticipants)) return new Set();
      return new Set(
        currentParticipants
          .map((p) =>
            String(
              p.actorId ||
                p.acting_character_id ||
                p.acting_assistant_id ||
                p.user_id
            )
          )
          .filter(Boolean)
      );
    }, [currentParticipants]);

    const fetchData = useCallback(
      async (currentSearchTerm: string) => {
        if (!userId || !isOpen) {
          setItems([]);
          return;
        }

        // For users tab, require at least 2 characters
        if (activeTab === "users") {
          if (!currentSearchTerm || currentSearchTerm.trim().length < 2) {
            setItems([]);
            if (currentSearchTerm && currentSearchTerm.trim().length > 0) {
              setError(t("inviteUser.minSearchLength"));
            }
            return;
          }
        }

        setLoading(true);
        setError(null);
        setItems([]);

        try {
          let result: any;
          const options = { search: currentSearchTerm.trim() || undefined };

          if (activeTab === "characters") {
            result = await characterService.getMyCharactersForConversation(options);
          } else if (activeTab === "myAssistants") {
            result = await assistantService.getMyAssistants(options);
          } else if (activeTab === "publicAssistants") {
            result = await assistantService.getPublicAssistants(options);
          } else if (activeTab === "users") {
            // Search users via API
            const response = await api.get<{ success: boolean; data: User[] }>(
              '/api/v1/users/search',
              { params: { q: currentSearchTerm.trim(), limit: 10 } }
            );
            if (response.data.success) {
              // Filter out current user and existing members
              const filtered = response.data.data.filter(
                (u) => u.id !== userId && !currentMemberIds.includes(u.id)
              );
              result = { success: true, data: filtered };
            } else {
              result = { success: false, error: t("inviteUser.searchFailed") };
            }
          } else {
            result = { success: true, data: [] };
          }

          if (result.success) {
            setItems(result.data || []);
          } else {
            const itemTypeName =
              activeTab === "characters"
                ? t("addParticipantModal.charactersTab").toLowerCase()
                : activeTab === "users"
                ? t("addParticipantModal.usersTab").toLowerCase()
                : t("addParticipantModal.assistantsTab").toLowerCase();
            setError(
              result.error ||
                t(
                  "addParticipantModal.errorFetchingItemsOfType",
                  "Erro ao buscar {{type}}.",
                  { type: itemTypeName }
                )
            );
            setItems([]);
          }
        } catch (err) {
          setError(t("addParticipantModal.connectionError"));
          setItems([]);
        } finally {
          setLoading(false);
        }
      },
      [userId, isOpen, activeTab, t, currentMemberIds]
    );

    useEffect(() => {
      if (isOpen && userId) {
        // For users tab, don't auto-fetch (require search)
        if (activeTab !== "users") {
          fetchData("");
        } else {
          setItems([]);
          setError(null);
        }
      } else if (!isOpen) {
        setActiveTab("characters");
        setSearchTerm("");
        setItems([]);
        setError(null);
      }
    }, [isOpen, activeTab, fetchData, userId]);

    const handleSearch = useCallback(() => {
      fetchData(searchTerm);
    }, [fetchData, searchTerm]);

    const availableItems = useMemo(() => {
      if (activeTab === "users") {
        // Users are already filtered in fetchData
        return items;
      }
      return items.filter(
        (item) => item.id && !currentActorIds.has(String(item.id))
      );
    }, [items, currentActorIds, activeTab]);

    const handleAddClick = useCallback(
      (item: any) => {
        const participantLimit = 5;
        if (currentParticipants.length >= participantLimit) {
          setError(
            t("addParticipantModal.maxParticipantsError", {
              max: participantLimit,
            })
          );
          setTimeout(() => setError(null), 3000);
          return;
        }
        const type = activeTab === "characters" ? "CHARACTER" : "ASSISTANT";
        const actorData = {
          type,
          id: item.id,
          name: activeTab === "characters"
            ? (item.lastName ? `${item.firstName} ${item.lastName}` : item.firstName)
            : item.name,
          defaultCharacterId:
            type === "ASSISTANT" ? item.defaultCharacterId : undefined,
        };
        onAddParticipant(actorData);
      },
      [currentParticipants.length, activeTab, onAddParticipant, t]
    );

    const handleInviteClick = useCallback(async (userToInvite: User) => {
      if (!onInviteUser || !conversationId) return;

      setInvitingUserId(userToInvite.id);
      setError(null);

      try {
        await onInviteUser(userToInvite.id);

        // Se não é multi-user, gerar link de convite para compartilhar
        if (!isMultiUser) {
          try {
            const response = await api.post(
              `/api/v1/conversations/${conversationId}/members/generate-invite-link`
            );
            if (response.data.success) {
              setGeneratedLink(response.data.data.link);
            }
          } catch (linkErr) {
            console.error('[AddParticipantModal] Error generating invite link:', linkErr);
            // Não bloquear o fluxo se falhar a geração do link
          }
        }

        // Remove user from list after successful invite
        setItems((prev) => prev.filter((u) => u.id !== userToInvite.id));
      } catch (err) {
        console.error('[AddParticipantModal] Invite error:', err);
        setError(t('inviteUser.inviteFailed'));
      } finally {
        setInvitingUserId(null);
      }
    }, [onInviteUser, conversationId, isMultiUser, t]);

    const changeTab = useCallback((tab: string) => {
      setSearchTerm("");
      setError(null);
      setActiveTab(tab);
    }, []);

    const handleCopyLink = useCallback(async () => {
      if (generatedLink) {
        try {
          await navigator.clipboard.writeText(generatedLink);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch (err) {
          console.error('Failed to copy link:', err);
        }
      }
    }, [generatedLink]);

    const handleCloseLinkView = useCallback(() => {
      setGeneratedLink(null);
      setCopiedLink(false);
      onClose();
    }, [onClose]);

    const getSearchPlaceholder = () => {
      if (activeTab === "characters")
        return t("addParticipantModal.searchCharactersPlaceholder");
      if (activeTab === "users")
        return t("inviteUser.searchPlaceholder");
      return t("addParticipantModal.searchAssistantsPlaceholder");
    };

    const renderItem = (item: any) => {
      let itemName = "";
      let itemAvatar = null;
      let descriptionText = "";

      if (activeTab === "users") {
        // User structure
        itemName = item.displayName || item.username || t("common.unknown");
        itemAvatar = item.avatarUrl;
        descriptionText = item.username ? `@${item.username}` : "";

        return (
          <li
            key={item.id}
            className="flex items-center justify-between p-2 bg-light dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <div className="flex items-center overflow-hidden mr-2">
              <Avatar
                src={itemAvatar}
                size="small"
                alt={itemName}
                className="flex-shrink-0"
              />
              <div className="ml-3 overflow-hidden">
                <h3 className="font-medium text-content dark:text-content-dark truncate">
                  {itemName}
                </h3>
                {descriptionText && (
                  <p className="text-sm text-muted truncate">
                    {descriptionText}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => handleInviteClick(item)}
              disabled={invitingUserId === item.id}
              icon={invitingUserId === item.id ? undefined : "person_add"}
              className="flex-shrink-0"
              title={t("inviteUser.invite")}
            >
              {invitingUserId === item.id ? t("inviteUser.inviting") : t("inviteUser.invite")}
            </Button>
          </li>
        );
      }

      if (activeTab === "characters") {
        // Character structure
        itemName = item.lastName
          ? `${item.firstName} ${item.lastName}`
          : item.firstName;
        itemAvatar = item.images?.[0]?.url || null;
        descriptionText = item.personality?.substring(0, 100) || "";
      } else {
        // Assistant structure
        itemName = item.name;
        itemAvatar = item.defaultCharacter?.images?.[0]?.url || null;
        descriptionText = item.description ||
          (item.instructions
            ? item.instructions.substring(0, 70) + "..."
            : "");
      }

      return (
        <li
          key={item.id}
          className="flex items-center justify-between p-2 bg-light dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <div className="flex items-center overflow-hidden mr-2">
            <Avatar
              src={itemAvatar}
              size="small"
              alt={itemName}
              className="flex-shrink-0"
            />
            <div className="ml-3 overflow-hidden">
              <h3 className="font-medium text-content dark:text-content-dark truncate">
                {itemName}
              </h3>
              <p className="text-sm text-description truncate">
                {descriptionText ||
                  t("addParticipantModal.noDescription")}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={() => handleAddClick(item)}
            disabled={currentParticipants.length >= 5}
            icon="add"
            className="flex-shrink-0"
            title={t(
              "addParticipantModal.addToConversationButtonTitle"
            )}
          />
        </li>
      );
    };

    const renderEmptyState = () => {
      if (activeTab === "users") {
        if (!searchTerm) {
          return (
            <div className="text-center text-muted p-4 text-sm">
              {t("inviteUser.searchHint")}
            </div>
          );
        }
        return (
          <div className="text-center text-muted p-4 italic text-sm">
            {t("inviteUser.noResults")}
          </div>
        );
      }

      return (
        <div className="text-center text-muted p-4 italic text-sm">
          {searchTerm
            ? t("addParticipantModal.noItemsForSearch", {
                searchTerm: searchTerm,
              })
            : t("addParticipantModal.noItemsAvailable")}
          {items.length > 0 &&
            availableItems.length === 0 &&
            ` ${t("addParticipantModal.alreadyAddedMaybe")}`}
        </div>
      );
    };

    // If we have a generated link, show it instead of the search interface
    if (generatedLink) {
      return (
        <Modal
          isOpen={isOpen}
          onClose={handleCloseLinkView}
          title={t('shareInvite.title')}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {t('shareInvite.description')}
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-grow font-mono text-sm select-all"
                onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                  e.currentTarget.select();
                }}
              />
              <Button
                variant="primary"
                icon={copiedLink ? "check" : "content_copy"}
                onClick={handleCopyLink}
                title={copiedLink ? t('shareInvite.copied') : t('shareInvite.copy')}
              >
                {copiedLink ? t('shareInvite.copied') : t('shareInvite.copy')}
              </Button>
            </div>
            <p className="text-xs text-muted flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {t('shareInvite.expiresIn', { days: 7 })}
            </p>
          </div>
        </Modal>
      );
    }

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("addParticipantModal.title")}
        size="lg"
      >
        <div className="flex border-b mb-4 overflow-x-auto">
          <button
            className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === "characters"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("characters")}
          >
            {t("addParticipantModal.charactersTab")}
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === "myAssistants"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("myAssistants")}
          >
            {t("addParticipantModal.myAssistantsTab")}
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
              activeTab === "publicAssistants"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("publicAssistants")}
          >
            {t("addParticipantModal.publicAssistantsTab")}
          </button>
          {/* Users tab - only show if multi-user is enabled or onInviteUser is provided */}
          {(isMultiUser || onInviteUser) && (
            <button
              className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
                activeTab === "users"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-content"
              }`}
              onClick={() => changeTab("users")}
            >
              {t("addParticipantModal.usersTab")}
            </button>
          )}
        </div>
        <div className="flex mb-4 space-x-2 items-center">
          <Input
            type="text"
            placeholder={getSearchPlaceholder()}
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="flex-grow"
            disabled={loading}
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            icon="search"
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        {error && (
          <div className="text-danger text-center mb-4 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {availableItems.length === 0
              ? renderEmptyState()
              : availableItems.map((item) => renderItem(item))}
          </ul>
        )}
      </Modal>
    );
  }
);

AddParticipantModal.displayName = "AddParticipantModal";
export default AddParticipantModal;
