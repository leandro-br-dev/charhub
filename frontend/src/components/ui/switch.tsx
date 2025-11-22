
// frontend/src/components/ui/switch.tsx
import { Switch as HeadlessSwitch } from '@headlessui/react';

interface SwitchProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  stateLabels?: { true: string; false: string };
}

const Switch = ({
  label = '',
  description = '',
  checked = false,
  onChange,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  stateLabels = { true: '', false: '' },
}: SwitchProps) => {
  const labelClasses = 
    'block text-sm font-medium text-content mb-1';

  const descriptionClasses = 
    'text-sm text-gray-500 mb-2';

  const stateLabelClasses = 
    'ml-3 text-sm text-content';

  const variants: Record<string, Record<string, string>> = {
    primary: {
      active: 'bg-primary shadow-sm ring-1 ring-primary/20',
      inactive: 'bg-input border border-border shadow-sm',
      disabled: 'bg-muted/20 border border-border'
    },
    secondary: {
      active: 'bg-secondary shadow-sm ring-1 ring-secondary/20',
      inactive: 'bg-input border border-border shadow-sm',
      disabled: 'bg-muted/20 border border-border'
    },
    success: {
      active: 'bg-success shadow-sm ring-1 ring-success/20',
      inactive: 'bg-input border border-border shadow-sm',
      disabled: 'bg-muted/20 border border-border'
    },
    danger: {
      active: 'bg-danger shadow-sm ring-1 ring-danger/20',
      inactive: 'bg-input border border-border shadow-sm',
      disabled: 'bg-muted/20 border border-border'
    }
  };

  const sizes: Record<string, Record<string, string>> = {
    small: {
      switch: 'h-5 w-9',
      thumb: 'h-3 w-3',
      translate: 'translate-x-4',
      initial: 'translate-x-1'
    },
    medium: {
      switch: 'h-6 w-11',
      thumb: 'h-4 w-4',
      translate: 'translate-x-6',
      initial: 'translate-x-1'
    },
    large: {
      switch: 'h-7 w-14',
      thumb: 'h-5 w-5',
      translate: 'translate-x-8',
      initial: 'translate-x-1'
    }
  };

  const getBaseClasses = () => {
    const baseClasses = [
      'relative inline-flex items-center rounded-full transition-all duration-200 ease-in-out',
      sizes[size].switch,
      disabled ? variants[variant].disabled : checked ? variants[variant].active : variants[variant].inactive,
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'
    ];

    return baseClasses.join(' ');
  };

  const getThumbClasses = () => {
    const thumbClasses = [
      'inline-block transform rounded-full transition-all duration-200 ease-in-out shadow-md',
      'bg-white dark:bg-card',
      sizes[size].thumb,
      checked ? sizes[size].translate : sizes[size].initial
    ];

    return thumbClasses.join(' ');
  };

  return (
    <div className={`${className}`}>
      {(label || description) && (
        <div className="mb-2">
          {label && (
            <label className={labelClasses}>
              {label}
            </label>
          )}
          {description && (
            <div className={descriptionClasses}>
              {description}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center">
        <HeadlessSwitch
          checked={checked}
          onChange={disabled ? undefined : onChange}
          className={getBaseClasses()}
          disabled={disabled}
        >
          <span 
            aria-hidden="true" 
            className={getThumbClasses()}
          />
        </HeadlessSwitch>
        {(stateLabels.true || stateLabels.false) && (
          <span className={stateLabelClasses}>
            {checked ? stateLabels.true : stateLabels.false}
          </span>
        )}
      </div>
    </div>
  );
};

export default Switch;
