
// frontend/src/pages/(chat)/shared/hooks/useChatModalsManager.ts
import { useState, useCallback } from "react";

export const useChatModalsManager = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = useCallback((type: string, data: any = null) => {
    setActiveModal(type);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  const openAddParticipantModal = useCallback(() => {
    openModal("addParticipant");
  }, [openModal]);

  const openConfigModal = useCallback(
    (participant: any) => {
      openModal("configParticipant", participant);
    },
    [openModal]
  );

  const openDeleteDialog = useCallback(
    (messageId: string) => {
      openModal("deleteMessage", { messageId });
    },
    [openModal]
  );

  const openReprocessDialog = useCallback(
    (messageId: string, isUserMessage: boolean) => {
      openModal("reprocessMessage", { messageId, isUserMessage });
    },
    [openModal]
  );

  const openConversationSettingsModal = useCallback(
    (conversationData: any) => {
      openModal("conversationSettings", conversationData);
    },
    [openModal]
  );

  return {
    activeModal,
    modalData,
    openAddParticipantModal,
    openConfigModal,
    openDeleteDialog,
    openReprocessDialog,
    openConversationSettingsModal,
    closeActiveModal: closeModal,
  };
};
