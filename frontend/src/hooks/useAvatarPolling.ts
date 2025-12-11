import { useEffect, useState } from 'react';
import api from '../lib/api';

const API_VERSION = import.meta.env.VITE_API_VERSION || '/api/v1';

interface UseAvatarPollingOptions {
  characterId: string | null;
  enabled: boolean;
  onAvatarReady?: (avatarUrl: string) => void;
}

export function useAvatarPolling({ characterId, enabled, onAvatarReady }: UseAvatarPollingOptions) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!characterId || !enabled || avatarUrl) {
      return;
    }

    setIsPolling(true);
    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 60; // Max 5 minutes (60 * 5 seconds)

    const pollAvatar = async () => {
      try {
        const response = await api.get(`${API_VERSION}/characters/${characterId}`);
        const character = response.data?.data || response.data;

        // Try to find avatar URL from multiple sources
        let foundAvatarUrl: string | null = null;

        // 1. Check direct avatarUrl field
        if (character.avatarUrl) {
          foundAvatarUrl = character.avatarUrl;
        }

        // 2. Check avatar object
        else if (character.avatar?.url) {
          foundAvatarUrl = character.avatar.url;
        }

        // 3. Check images array for AVATAR type
        else if (Array.isArray(character.images)) {
          const avatarImage = character.images.find((img: any) => img.type === 'AVATAR');
          if (avatarImage?.url) {
            foundAvatarUrl = avatarImage.url;
          }
        }

        if (foundAvatarUrl) {
          if (isMounted) {
            console.log('[useAvatarPolling] Avatar found:', foundAvatarUrl);
            setAvatarUrl(foundAvatarUrl);
            setIsPolling(false);
            if (onAvatarReady) {
              onAvatarReady(foundAvatarUrl);
            }
          }
          return true; // Avatar ready
        }

        console.log('[useAvatarPolling] Avatar not ready yet, will retry...');
        return false; // Avatar not ready yet
      } catch (error) {
        console.error('[useAvatarPolling] Error fetching character:', error);
        return false;
      }
    };

    const interval = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        console.log('[useAvatarPolling] Max polls reached, stopping');
        clearInterval(interval);
        if (isMounted) {
          setIsPolling(false);
        }
        return;
      }

      const ready = await pollAvatar();
      if (ready) {
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    // Initial immediate poll
    pollAvatar().then((ready) => {
      if (ready) {
        clearInterval(interval);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [characterId, enabled, avatarUrl, onAvatarReady]);

  return {
    avatarUrl,
    isPolling,
  };
}
