import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../contexts/ToastContext';
import type { Socket } from 'socket.io-client';
import api from '../../../../lib/api';

interface MessageTranslations {
  [messageId: string]: {
    translations: Record<string, string>; // language -> translated text
    showOriginal: boolean;
    isLoading: boolean;
  };
}

interface MessageTranslationsPayload {
  messageId: string;
  translations: Record<string, string>;
}

interface UseMessageTranslationsOptions {
  socket: Socket | null;
  userLanguage: string;
  conversationId: string;
}

interface UseMessageTranslationsReturn {
  translations: MessageTranslations;
  toggleTranslation: (messageId: string) => void;
  requestTranslation: (messageId: string, targetLanguage: string) => Promise<void>;
  getTranslatedText: (messageId: string, originalText: string) => string;
  hasTranslation: (messageId: string) => boolean;
  isTranslationLoading: (messageId: string) => boolean;
  autoTranslateEnabled: boolean;
  toggleAutoTranslate: () => void;
}

/**
 * Hook for managing message translations in multi-user chats
 * Handles WebSocket events for pre-generated translations
 * and allows users to toggle between original and translated text
 */
export function useMessageTranslations({
  socket,
  userLanguage,
  conversationId,
}: UseMessageTranslationsOptions): UseMessageTranslationsReturn {
  const { t } = useTranslation('chat');
  const { addToast } = useToast();
  const [translations, setTranslations] = useState<MessageTranslations>({});
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [membershipLoaded, setMembershipLoaded] = useState(false);

  // Fetch user's membership settings on mount
  useEffect(() => {
    if (!conversationId) return;

    const fetchMembershipSettings = async () => {
      try {
        // Get all members and find current user's membership
        const response = await api.get(`/api/v1/conversations/${conversationId}/members`);
        const members = response.data.data;

        // Find current user's membership (we'll need userId from auth)
        // For now, we'll use a simpler approach - fetch membership directly
        const membershipResponse = await api.get(`/api/v1/conversations/${conversationId}/membership`);
        if (membershipResponse.data.success) {
          setAutoTranslateEnabled(membershipResponse.data.data?.autoTranslateEnabled ?? false);
        }
      } catch (error) {
        console.error('[useMessageTranslations] Failed to fetch membership settings:', error);
      } finally {
        setMembershipLoaded(true);
      }
    };

    fetchMembershipSettings();
  }, [conversationId]);

  // Handle message_translations event from WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleTranslations = (payload: MessageTranslationsPayload) => {
      const { messageId, translations: newTranslations } = payload;

      console.log('[useMessageTranslations] Received message_translations event:', {
        messageId,
        translations: newTranslations,
        userLanguage,
        hasUserLanguage: newTranslations[userLanguage],
      });

      setTranslations(prev => ({
        ...prev,
        [messageId]: {
          translations: newTranslations,
          showOriginal: prev[messageId]?.showOriginal ?? !autoTranslateEnabled, // Auto-show if enabled
          isLoading: false,
        },
      }));
    };

    socket.on('message_translations', handleTranslations);

    return () => {
      socket.off('message_translations', handleTranslations);
    };
  }, [socket, userLanguage, autoTranslateEnabled]);

  // Toggle between original and translated text
  const toggleTranslation = useCallback((messageId: string) => {
    setTranslations(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        showOriginal: !prev[messageId]?.showOriginal,
      },
    }));
  }, []);

  // Toggle auto-translate setting
  const toggleAutoTranslate = useCallback(async () => {
    const newValue = !autoTranslateEnabled;
    try {
      const response = await api.patch(`/api/v1/conversations/${conversationId}/membership`, {
        autoTranslateEnabled: newValue
      });

      if (response.data.success) {
        setAutoTranslateEnabled(newValue);
        addToast(newValue ? t('translation.autoEnabled') : t('translation.autoDisabled'), 'success');
      }
    } catch (error) {
      console.error('[useMessageTranslations] Failed to toggle auto-translate:', error);
      addToast(t('translation.toggleFailed'), 'error');
    }
  }, [autoTranslateEnabled, conversationId, addToast, t]);

  // Request translation for a specific message and language
  const requestTranslation = useCallback(async (messageId: string, targetLanguage: string) => {
    try {
      // Mark as loading
      setTranslations(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          isLoading: true,
        },
      }));

      // Call API to request translation
      const response = await fetch(
        `/api/v1/conversations/${conversationId}/messages/${messageId}/translate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetLanguage }),
        }
      );

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();

      // Update translations state
      setTranslations(prev => ({
        ...prev,
        [messageId]: {
          translations: {
            ...prev[messageId]?.translations,
            [targetLanguage]: data.data.translatedText,
          },
          showOriginal: prev[messageId]?.showOriginal ?? false,
          isLoading: false,
        },
      }));
    } catch (error) {
      console.error('[useMessageTranslations] Translation request failed:', error);

      // Remove loading state
      setTranslations(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId],
          isLoading: false,
        },
      }));

      addToast(t('translation.requestFailed'), 'error');
    }
  }, [conversationId, addToast, t]);

  // Get the appropriate text (original or translated) for a message
  const getTranslatedText = useCallback((messageId: string, originalText: string): string => {
    const messageTrans = translations[messageId];

    console.log('[useMessageTranslations] getTranslatedText called:', {
      messageId,
      originalText,
      userLanguage,
      hasTranslations: !!messageTrans,
      hasTranslationsMap: !!messageTrans?.translations,
      showOriginal: messageTrans?.showOriginal,
      autoTranslateEnabled,
      availableLanguages: messageTrans?.translations ? Object.keys(messageTrans.translations) : [],
      hasUserLanguageTranslation: !!messageTrans?.translations?.[userLanguage],
      translatedText: messageTrans?.translations?.[userLanguage],
    });

    // If no translation exists or user wants to see original, return original
    if (!messageTrans || !messageTrans.translations || messageTrans.showOriginal) {
      return originalText;
    }

    // Get translation for user's language
    const translatedText = messageTrans.translations[userLanguage];

    // If translation exists, return it; otherwise return original
    return translatedText || originalText;
  }, [translations, userLanguage, autoTranslateEnabled]);

  // Check if a message has translations available
  const hasTranslation = useCallback((messageId: string): boolean => {
    const messageTrans = translations[messageId];
    return !!messageTrans && !!messageTrans.translations && Object.keys(messageTrans.translations).length > 0;
  }, [translations]);

  // Check if a translation is currently loading
  const isTranslationLoading = useCallback((messageId: string): boolean => {
    return translations[messageId]?.isLoading ?? false;
  }, [translations]);

  return {
    translations,
    toggleTranslation,
    requestTranslation,
    getTranslatedText,
    hasTranslation,
    isTranslationLoading,
    autoTranslateEnabled,
    toggleAutoTranslate,
  };
}
