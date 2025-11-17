// frontend/src/pages/(chat)/shared/components/MemoryIndicator.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface MemoryIndicatorProps {
  conversation: any; // Conversation with memoryLastUpdatedAt field
  className?: string;
}

export function MemoryIndicator({ conversation, className = '' }: MemoryIndicatorProps) {
  const { t, i18n } = useTranslation('chat');

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
      className={`flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-sm border border-primary/30 ${className}`}
      title={t('memory.activeTooltip')}
    >
      <span className="material-symbols-outlined text-primary text-lg">
        psychology
      </span>
      <span className="text-primary font-medium">
        {t('memory.active', { timeAgo })}
      </span>
    </div>
  );
}
