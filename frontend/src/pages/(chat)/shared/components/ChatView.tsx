import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePageHeader } from '../../../../hooks/usePageHeader';
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
  const { setActions, setTitle } = usePageHeader();

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

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const fetchAndOpenChatGallery = useCallback(async () => {
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
  }, [conversation?.id]);

  const chatActions = useMemo(() => (
    <>
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
    </>
  ), [processedParticipants, openConfigModal, openAddParticipantModal, t, conversation, fetchAndOpenChatGallery, actionLoading, loadingConversationData, loadingGallery, openConversationSettingsModal]);

  useEffect(() => {
    if (conversation?.title) {
      setTitle(conversation.title);
    }

    setActions(chatActions);

    return () => {
      setActions(null);
      setTitle('CharHub');
    };
  }, [conversation?.title, chatActions, setActions, setTitle]);

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

  // Get background image from conversation settings
  const backgroundImage = conversation?.settings?.view?.background_type === 'image'
    ? conversation?.settings?.view?.background_value
    : null;

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Background layers - fixed position, behind all content */}
      {backgroundImage && (
        <>
          {/* Blurred background - covers entire viewport */}
          <div
            className="fixed inset-0 md:left-20 z-0 bg-normal"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'blur(20px)',
              transform: 'scale(1.1)', // Prevents blur edge artifacts
            }}
          />

          {/* Sharp background - centered, 100% height */}
          <div
            className="fixed top-0 bottom-0 left-0 md:left-20 right-0 z-0 flex items-center justify-center pointer-events-none"
          >
            <img
              src={backgroundImage}
              alt="Chat background"
              className="h-full w-auto object-contain"
              style={{ maxWidth: '100%' }}
            />
          </div>

          {/* Overlay to improve text readability */}
          <div className="fixed inset-0 md:left-20 z-0 bg-black/30" />
        </>
      )}

      {/* Content layer - sits above background */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {uiError && !activeModal && (
          <div className="sticky top-0 z-30 p-2 bg-danger/90 text-white text-sm text-center animate-pulse">
            <span className="material-symbols-outlined text-base align-middle mr-2">
              {isWebSocketConnected ? 'error' : 'wifi_off'}
            </span>
            {uiError}
          </div>
        )}

        <div className="px-4 flex flex-col flex-grow overflow-y-auto">
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
        </div>

        {/* Input fixo - considera NavigationRail (80px no desktop) */}
        <div className="fixed bottom-0 left-0 md:left-20 right-0 z-10 bg-normal/90 backdrop-blur-sm px-4 pb-4 shadow-lg">
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