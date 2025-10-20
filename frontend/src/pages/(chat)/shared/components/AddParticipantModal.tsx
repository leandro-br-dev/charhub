
// frontend/src/pages/(chat)/shared/components/AddParticipantModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../hooks/useAuth";
import { Button } from "../../../../components/ui/Button";
import { Avatar } from "../../../../components/ui/Avatar";
import { Modal } from "../../../../components/ui/Modal";
import { Input } from "../../../../components/ui";

// --- Placeholder Services ---
const characterService = {
  getCharacters: async (userId: string, options: any) => {
    console.log("Fetching characters with options:", options);
    return {
      success: true,
      data: [
        { id: 'char1', name: 'Character One', description: 'Sample character for testing' },
        { id: 'char2', name: 'Character Two', description: 'Another sample character' },
      ],
    };
  },
};

const assistantService = {
  getMyAssistants: async (options: any) => {
    console.log("Fetching my assistants with options:", options);
    return { success: true, data: [] };
  },
  getPublicAssistants: async (options: any) => {
    console.log("Fetching public assistants with options:", options);
    return { success: true, data: [] };
  },
};
// --- End Placeholder Services ---

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParticipants: any[];
  onAddParticipant: (actorData: any) => void;
}

const AddParticipantModal = React.memo(
  ({
    isOpen,
    onClose,
    currentParticipants = [],
    onAddParticipant,
  }: AddParticipantModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const userId = user?.id;

    const [activeTab, setActiveTab] = useState("characters");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

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
        setLoading(true);
        setError(null);
        setItems([]);

        try {
          let result: any;
          const options = { search: currentSearchTerm.trim() || undefined };
          const itemTypeName =
            activeTab === "characters"
              ? t("addParticipantModal.charactersTab").toLowerCase()
              : t("addParticipantModal.assistantsTab").toLowerCase();

          if (activeTab === "characters") {
            result = await characterService.getCharacters(userId, {
              isPublic: false,
              ...options,
            });
          } else if (activeTab === "myAssistants") {
            result = await assistantService.getMyAssistants(options);
          } else if (activeTab === "publicAssistants") {
            result = await assistantService.getPublicAssistants(options);
          } else {
            result = { success: true, data: [] };
          }

          if (result.success) {
            setItems(result.data || []);
          } else {
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
      [userId, isOpen, activeTab, t]
    );

    useEffect(() => {
      if (isOpen && userId) {
        fetchData("");
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
      return items.filter(
        (item) => item.id && !currentActorIds.has(String(item.id))
      );
    }, [items, currentActorIds]);

    const handleAddClick = useCallback(
      (item: any) => {
        const participantLimit = 5;
        if (currentParticipants.length >= participantLimit) {
          setError(
            t("addParticipantModal.maxParticipantsError", {
              limit: participantLimit,
            })
          );
          setTimeout(() => setError(null), 3000);
          return;
        }
        const type = activeTab === "characters" ? "CHARACTER" : "ASSISTANT";
        const actorData = {
          type,
          id: item.id,
          name: item.name,
          defaultCharacterId:
            type === "ASSISTANT" ? item.default_character_id : undefined,
        };
        onAddParticipant(actorData);
      },
      [currentParticipants.length, activeTab, onAddParticipant, t]
    );

    const changeTab = useCallback((tab: string) => {
      setSearchTerm("");
      setActiveTab(tab);
    }, []);

    const getSearchPlaceholder = () => {
      if (activeTab === "characters")
        return t("addParticipantModal.searchCharactersPlaceholder");
      return t("addParticipantModal.searchAssistantsPlaceholder");
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("addParticipantModal.title")}
        size="lg"
      >
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === "characters"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("characters")}
          >
            {t("addParticipantModal.charactersTab")}
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === "myAssistants"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("myAssistants")}
          >
            {t("addParticipantModal.myAssistantsTab")}
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === "publicAssistants"
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-content"
            }`}
            onClick={() => changeTab("publicAssistants")}
          >
            {t("addParticipantModal.publicAssistantsTab")}
          </button>
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
            variant="dark"
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
            {availableItems.length === 0 ? (
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
            ) : (
              availableItems.map((item) => {
                const descriptionText =
                  activeTab === "characters"
                    ? item.description || item.personality
                    : item.description ||
                      (item.instructions
                        ? item.instructions.substring(0, 70) + "..."
                        : "");
                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-light dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <div className="flex items-center overflow-hidden mr-2">
                      <Avatar
                        src={item.avatar || item.default_character?.avatar}
                        size="small"
                        alt={item.name}
                        className="flex-shrink-0"
                      />
                      <div className="ml-3 overflow-hidden">
                        <h3 className="font-medium text-content dark:text-content-dark truncate">
                          {item.name}
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
              })
            )}
          </ul>
        )}
      </Modal>
    );
  }
);

AddParticipantModal.displayName = "AddParticipantModal";
export default AddParticipantModal;
