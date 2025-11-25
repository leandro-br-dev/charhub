// frontend/src/pages/(chat)/shared/components/OnlineUsersIndicator.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

interface OnlineUsersIndicatorProps {
  onlineUsers: string[];
  currentUserId?: string;
  className?: string;
}

export function OnlineUsersIndicator({
  onlineUsers,
  currentUserId,
  className = ''
}: OnlineUsersIndicatorProps) {
  const { t } = useTranslation('chat');

  // Filter out current user from count
  const otherUsers = currentUserId
    ? onlineUsers.filter((id) => id !== currentUserId)
    : onlineUsers;

  const otherCount = otherUsers.length;

  if (otherCount === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 bg-green-500/10 dark:bg-green-500/20 rounded-full text-xs border border-green-500/30 ${className}`}
      title={t('presence.onlineTooltip', { count: otherCount })}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-green-600 dark:text-green-400 font-medium">
        {otherCount === 1
          ? t('presence.oneOnline')
          : t('presence.manyOnline', { count: otherCount })}
      </span>
    </div>
  );
}
