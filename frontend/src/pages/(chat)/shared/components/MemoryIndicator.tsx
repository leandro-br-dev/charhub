// frontend/src/pages/(chat)/shared/components/MemoryIndicator.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MemoryIndicatorProps {
  conversation: any; // Conversation with memoryLastUpdatedAt field
  isCompressing?: boolean;
  className?: string;
}

export function MemoryIndicator({
  conversation,
  isCompressing = false,
  className = ''
}: MemoryIndicatorProps) {
  const { t, i18n } = useTranslation('chat');

  // Show compressing state
  if (isCompressing) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg text-xs border border-amber-500/30 ${className}`}
        title={t('memory.compressingTooltip')}
      >
        <span className="material-symbols-outlined text-amber-500 text-base animate-pulse">
          psychology
        </span>
        <span className="text-amber-600 dark:text-amber-400 font-medium">
          {t('memory.compressing')}
        </span>
      </div>
    );
  }

  // Don't show if no memory exists
  if (!conversation?.memoryLastUpdatedAt) {
    return null;
  }

  const locale = i18n.language === 'pt-BR' ? pt : undefined;
  const timeAgo = formatDistanceToNow(new Date(conversation.memoryLastUpdatedAt), {
    addSuffix: true,
    locale
  });

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-xs border border-primary/30 ${className}`}
      title={t('memory.activeTooltip')}
    >
      <span className="material-symbols-outlined text-primary text-base">
        psychology
      </span>
      <span className="text-primary font-medium">
        {t('memory.active', { timeAgo })}
      </span>
    </div>
  );
}
