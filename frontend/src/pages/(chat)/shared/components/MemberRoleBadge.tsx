// frontend/src/pages/(chat)/shared/components/MemberRoleBadge.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

export type MemberRole = 'OWNER' | 'MODERATOR' | 'MEMBER' | 'VIEWER';

interface MemberRoleBadgeProps {
  role: MemberRole;
  size?: 'small' | 'medium';
  className?: string;
}

const roleConfig: Record<MemberRole, { icon: string; colorClass: string }> = {
  OWNER: {
    icon: 'shield_person',
    colorClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  MODERATOR: {
    icon: 'verified_user',
    colorClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  MEMBER: {
    icon: 'person',
    colorClass: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
  },
  VIEWER: {
    icon: 'visibility',
    colorClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
};

export const MemberRoleBadge: React.FC<MemberRoleBadgeProps> = ({
  role,
  size = 'small',
  className = '',
}) => {
  const { t } = useTranslation('chat');
  const config = roleConfig[role] || roleConfig.MEMBER;

  const sizeClasses = size === 'small'
    ? 'text-xs px-1.5 py-0.5 gap-0.5'
    : 'text-sm px-2 py-1 gap-1';

  const iconSize = size === 'small' ? 'text-sm' : 'text-base';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.colorClass} ${sizeClasses} ${className}`}
      title={t(`memberRole.${role.toLowerCase()}Tooltip`)}
    >
      <span className={`material-symbols-outlined ${iconSize}`}>
        {config.icon}
      </span>
      <span>{t(`memberRole.${role.toLowerCase()}`)}</span>
    </span>
  );
};

export default MemberRoleBadge;
