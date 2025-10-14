
// frontend/src/components/ui/Dialog.tsx
import { Dialog as HUIDialog } from '@headlessui/react';
import { Button } from './Button';

interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'light' | 'secondary' | 'danger' | 'dark';
  disabled?: boolean;
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'info';
  className?: string;
  actions?: DialogAction[];
  children?: React.ReactNode;
}

export const Dialog = ({
  isOpen,
  onClose,
  title = '',
  description = '',
  variant = 'primary',
  className = '',
  actions = [],
  children,
  ...props
}: DialogProps) => {
  const baseClasses =
    'fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 overflow-y-auto';

  const contentBaseClasses =
    'bg-light p-6 rounded-lg shadow-lg max-w-md w-full flex flex-col gap-4 text-center';

  const variants = {
    primary: 'border border-primary',
    secondary: 'border border-gray-300',
    danger: 'border border-red-500',
    success: 'border border-green-500',
    info: 'border border-blue-500'
  };

  // Map Dialog variants to Button variants
  const variantToButtonVariant: Record<string, 'primary' | 'light' | 'secondary' | 'danger' | 'dark'> = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger',
    success: 'primary',
    info: 'primary'
  };

  const combinedClasses = `${contentBaseClasses} ${variants[variant]} ${className}`.trim();

  return (
    <HUIDialog
      open={isOpen}
      onClose={onClose}
      className={baseClasses}
      {...props}
    >
        <HUIDialog.Panel className={combinedClasses}>
            {title && (
            <HUIDialog.Title className="text-lg font-bold text-title">{title}</HUIDialog.Title>
            )}
            {description && (
            <HUIDialog.Description className="text-sm text-description">
                {description}
            </HUIDialog.Description>
            )}
            {children}
            <div className="flex flex-col gap-2 mt-4">
            {actions && actions.length > 0 ? (
                actions.map((action, index) => (
                <Button
                    key={index}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    variant={action.variant}
                >
                    {action.label}
                </Button>
                ))
            ) : (
                <Button
                onClick={onClose}
                variant={variantToButtonVariant[variant]}
                >
                Fechar
                </Button>
            )}
            </div>
        </HUIDialog.Panel>
    </HUIDialog>
  );
};
