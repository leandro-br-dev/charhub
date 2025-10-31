// frontend/src/pages/(chat)/shared/components/ChatView.tsx
import React, { useCallback, useState, useRef, useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from '../../../../components/ui/Button';
import DisplayAvatarParticipants from './DisplayAvatarParticipants';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import AddParticipantModal from './AddParticipantModal';
import ParticipantConfigModal from './ParticipantConfigModal';
import ConversationSettingsModal from './ConversationSettingsModal';
import { Dialog } from '../../../../components/ui';
import ImageGalleryModal from './ImageGalleryModal';
import { useChatModalsManager } from '../hooks/useChatModalsManager';
import { chatService } from '../../../../services/chatService';
import { scrollToBottom } from "../../../../utils/scroll";

const ChatView: React.FC<any> = ({
  userId,
  conversation,
  messages,
  processedParticipants,
  currentUserRepresentation,
  actionLoading,
  uiError,
  loadingConversationData,
  isWebSocketConnected,
  typingCharacters,
  activeBackgroundTasks,
  playingAudioState,
  audioCache,
  onSendMessage,
  onAddParticipant,
  onRemoveParticipant,
  onConfigureParticipant,
  onDeleteMessage,
  onEditMessage,
  onReprocessMessage,
  onRequestImageGeneration,
  onCloneAssistant,
  onPromoteCharacter,
  onPlayAudioRequest,
  onSaveConversationSettings,
  getSenderDetailsAndParticipantId,
  onReviewFileClick,
  onSendConfirmation,
}) => {
  const { t } = useTranslation('chat');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [bottomPad, setBottomPad] = useState<number>(160);

  useLayoutEffect(() => {
    const updatePad = () => {
      const h = footerRef.current?.offsetHeight ?? 0;
      setBottomPad(h + 8);
    };
    updatePad();
    window.addEventListener('resize', updatePad);
    return () => window.removeEventListener('resize', updatePad);
  }, []);

  useEffect(() => {
    scrollToBottom(scrollContainerRef.current, 'auto');
  }, [messages, bottomPad]);

  const {
    activeModal,
    modalData,
    openAddParticipantModal,
    openConfigModal,
    openDeleteDialog,
    openReprocessDialog,
    openConversationSettingsModal,
    closeActiveModal,
  } = useChatModalsManager();

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const fetchAndOpenChatGallery = async () => {
    if (!conversation?.id) return;
    setIsGalleryOpen(true);
    setLoadingGallery(true);
    setGalleryError(null);
    try {
      const images = await chatService.getConversationGallery(conversation.id);
      setGalleryImages(images);
    } catch (error) {
      console.error('[ChatView] Failed to load gallery', error);
      setGalleryError('Failed to load chat gallery.');
      setGalleryImages([]);
    }
    setLoadingGallery(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeaderVisible(entry.isIntersecting);
      },
      { rootMargin: "0px", threshold: 0.1 }
    );

    const currentHeaderRef = headerRef.current;
    if (currentHeaderRef) {
      observer.observe(currentHeaderRef);
    }

    return () => {
      if (currentHeaderRef) {
        observer.unobserve(currentHeaderRef);
      }
    };
  }, []);

  const confirmAndDelete = useCallback(async () => {
    if (modalData?.messageId) await onDeleteMessage(modalData.messageId);
    closeActiveModal();
  }, [modalData, onDeleteMessage, closeActiveModal]);

  const handleReprocessInternal = useCallback(async () => {
    if (modalData?.messageId)
      await onReprocessMessage(modalData.messageId, modalData.isUserMessage);
    closeActiveModal();
  }, [modalData, onReprocessMessage, closeActiveModal]);

  if (loadingConversationData && conversation?.id) {
    return (
      <div className="flex justify-center items-center h-full bg-normal text-content">
        {t("chatPage.loadingConversation")}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <div
        className={`fixed top-0 left-0 right-0 z-20 bg-normal/80 backdrop-blur-sm px-4 pt-4 pb-2 shadow-sm transition-opacity duration-300 ease-out ${
          isHeaderVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className={`flex items-center justify-end gap-2 ${uiError ? 'mt-8' : ''}`}>
          <div className="flex items-center gap-2">
            <DisplayAvatarParticipants
              participants={processedParticipants}
              onAvatarClick={openConfigModal}
              isSticky={true}
            />
            <Button
              variant="light"
              size="small"
              icon="add"
              onClick={openAddParticipantModal}
              className="flex-shrink-0 rounded-full p-2"
              title={t('displayAvatarParticipants.addParticipantButtonTitle')}
            />
          </div>
          {conversation && (
            <>
              <Button
                variant="light"
                size="small"
                icon="photo_library"
                onClick={fetchAndOpenChatGallery}
                title={t('conversationSettings.galleryButton')}
                className="p-2 flex-shrink-0"
                disabled={actionLoading || loadingConversationData || loadingGallery}
              />
              <Button
                variant="light"
                size="small"
                icon="settings"
                onClick={() => openConversationSettingsModal(conversation)}
                title={t('chatPage.conversationSettingsTitle')}
                className="p-2 flex-shrink-0"
                disabled={actionLoading || loadingConversationData}
              />
            </>
          )}
        </div>
      </div>

      {uiError && !activeModal && (
        <div className="sticky top-0 z-30 p-2 bg-danger/90 text-white text-sm text-center animate-pulse">
          <span className="material-symbols-outlined text-base align-middle mr-2">
            {isWebSocketConnected ? 'error' : 'wifi_off'}
          </span>
          {uiError}
        </div>
      )}

      <div className="px-4 flex flex-col flex-grow overflow-hidden">
        <div ref={headerRef} className="pt-2 pb-4 flex-shrink-0">
          <div className="flex justify-end mb-2 gap-2">
            {conversation && (
              <>
                <Button
                  variant="light"
                  size="small"
                  icon="photo_library"
                  onClick={fetchAndOpenChatGallery}
                  title={t("conversationSettings.galleryButton")}
                  className="p-2 flex-shrink-0"
                  disabled={actionLoading || loadingConversationData || loadingGallery}
                />
                <Button
                variant="light"
                size="small"
                icon="settings"
                onClick={() => openConversationSettingsModal(conversation)}
                title={t("chatPage.conversationSettingsTitle")}
                className="p-2 flex-shrink-0"
                disabled={actionLoading || loadingConversationData}
                />
              </>
            )}
          </div>
          <DisplayAvatarParticipants
            participants={processedParticipants}
            onAddClick={openAddParticipantModal}
            onRemoveClick={onRemoveParticipant}
            onAvatarClick={openConfigModal}
          />
          {processedParticipants.filter((p: any) => p.actorType !== "USER")
            .length === 0 &&
            !loadingConversationData &&
            conversation && (
              <p className="text-center text-xs text-muted mt-1 italic">
                {t("chatPage.addParticipantsPrompt")}
              </p>
            )}
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: bottomPad }}>
          <MessageList
            messages={messages}
            loading={loadingConversationData}
            error={uiError}
            participants={processedParticipants}
            userId={userId}
            typingCharacters={typingCharacters}
            activeBackgroundTasks={activeBackgroundTasks}
            onAvatarClick={openConfigModal}
            onDeleteClick={openDeleteDialog}
            onSaveEdit={onEditMessage}
            onReprocessClick={openReprocessDialog}
            getSenderDetailsAndParticipantId={getSenderDetailsAndParticipantId}
            playingAudioState={playingAudioState}
            onPlayAudioRequest={onPlayAudioRequest}
            audioCache={audioCache}
            onSendConfirmation={onSendConfirmation}
            onReviewFileClick={onReviewFileClick}
          />
          {/* bottom sentinel ensures last message is fully visible above input */}
          <div className="h-px" />
        </div>
      </div>

      <div ref={footerRef} className="fixed bottom-0 left-0 right-0 z-10 bg-normal/90 backdrop-blur-sm px-4 pb-4 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <MessageInput
            onSendMessage={onSendMessage}
            user={currentUserRepresentation}
            disabled={actionLoading}
            onUserAvatarClick={() => {
              const p = processedParticipants.find((p: any) => p.actorType === 'USER');
              if (p) openConfigModal(p);
            }}
            onRequestImageGeneration={onRequestImageGeneration}
          />
        </div>
      </div>

      <AddParticipantModal
        isOpen={activeModal === "addParticipant"}
        onClose={closeActiveModal}
        currentParticipants={processedParticipants}
        onAddParticipant={onAddParticipant}
      />
      {activeModal === "configParticipant" && modalData && (
        <ParticipantConfigModal
          isOpen={true}
          onClose={closeActiveModal}
          participant={modalData}
          onSaveConfiguration={onConfigureParticipant}
          onCloneAssistant={onCloneAssistant}
          onPromoteCharacter={onPromoteCharacter}
        />
      )}
      {activeModal === "conversationSettings" && modalData && conversation && (
        <ConversationSettingsModal
          isOpen={true}
          onClose={closeActiveModal}
          conversation={conversation}
          onSave={onSaveConversationSettings}
          isLoading={actionLoading}
        />
      )}
      <Dialog
        isOpen={activeModal === "deleteMessage"}
        onClose={closeActiveModal}
        title={t("chatPage.confirmDeleteTitle")}
        description={t("chatPage.confirmDeleteMessage")}
        variant="danger"
        actions={[
          {
            label: t("common.cancel"),
            onClick: closeActiveModal,
            variant: "light",
          },
          {
            label: actionLoading ? t("common.deleting") : t("common.delete"),
            onClick: confirmAndDelete,
            variant: "danger",
          },
        ]}
      />
      <Dialog
        isOpen={activeModal === "reprocessMessage"}
        onClose={closeActiveModal}
        title={t("chatPage.confirmReprocessTitle")}
        description={
          modalData?.isUserMessage
            ? t("chatPage.confirmReprocessUserMessage")
            : t("chatPage.confirmReprocessBotMessage")
        }
        variant="info"
        actions={[
          {
            label: t("common.cancel"),
            onClick: closeActiveModal,
            variant: "light",
          },
          {
            label: actionLoading
              ? t("common.processing")
              : t("chatPage.regenerateButton"),
            onClick: handleReprocessInternal,
            variant: "primary",
          },
        ]}
      />
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        mode="view"
        imageUrls={galleryImages}
        loading={loadingGallery}
        error={galleryError}
        title={t("conversationSettings.imageGalleryTitle")}
      />
    </div>
  );
};

export default ChatView;