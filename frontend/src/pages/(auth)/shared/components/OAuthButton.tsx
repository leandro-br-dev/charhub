import type { ReactNode } from 'react';
import { Button } from '../../../../components/ui/Button';
import { GoogleIcon } from './GoogleIcon';
import { FacebookIcon } from './FacebookIcon';

interface OAuthButtonProps {
  provider: 'google' | 'facebook';
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export function OAuthButton({ provider, onClick, disabled, children }: OAuthButtonProps): JSX.Element {
  const Icon = provider === 'google' ? GoogleIcon : FacebookIcon;

  const variantStyles = provider === 'google'
    ? {
        variant: 'light' as const,
        className: 'w-full border-gray-300 dark:border-gray-600 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-50 dark:hover:!bg-gray-700'
      }
    : {
        variant: 'dark' as const,
        style: { backgroundColor: '#1877F2' },
        className: 'w-full !text-white hover:!opacity-90'
      };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      {...variantStyles}
    >
      <Icon />
      <span className="ml-2">{children}</span>
    </Button>
  );
}
