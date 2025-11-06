import { type ReactNode } from 'react';
import { Modal } from './Modal';
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
  /** Severity level: 'critical' uses danger variant for primary action, 'normal' uses primary variant */
  severity?: 'critical' | 'normal';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  actions?: DialogAction[];
  children?: ReactNode;
}

export function Dialog({
  isOpen,
  onClose,
  title = '',
  description = '',
  severity = 'normal',
  className = '',
  size = 'md',
  actions = [],
  children,
}: DialogProps): JSX.Element | null {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      className={className}
    >
      <div className="space-y-4">
        {description && <p className="text-sm text-content">{description}</p>}
        {children}

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="flex justify-end gap-2">
            {actions.map((action, index) => {
              // Auto-assign danger variant for critical severity if not specified
              const buttonVariant = action.variant ||
                (severity === 'critical' && index === actions.length - 1 ? 'danger' : 'light');

              return (
                <Button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  variant={buttonVariant}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
