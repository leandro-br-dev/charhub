
// frontend/src/pages/(chat)/shared/components/Switch.tsx
import { Switch as HeadlessSwitch } from '@headlessui/react';

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
  ...props
}: any) => {
  const labelClasses = 
    'block text-sm font-medium text-content mb-1';

  const descriptionClasses = 
    'text-sm text-gray-500 mb-2';

  const stateLabelClasses = 
    'ml-3 text-sm text-content';

  const variants: any = {
    primary: {
      active: 'bg-primary-600',
      inactive: 'bg-gray-200',
      disabled: 'bg-gray-100'
    },
    secondary: {
      active: 'bg-gray-700',
      inactive: 'bg-gray-200',
      disabled: 'bg-gray-100'
    },
    success: {
      active: 'bg-green-600',
      inactive: 'bg-gray-200',
      disabled: 'bg-gray-100'
    },
    danger: {
      active: 'bg-red-600',
      inactive: 'bg-gray-200',
      disabled: 'bg-gray-100'
    }
  };

  const sizes: any = {
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
      'relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out bg-light',
      sizes[size].switch,
      disabled ? variants[variant].disabled : checked ? variants[variant].active : variants[variant].inactive,
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
    ];

    return baseClasses.join(' ');
  };

  const getThumbClasses = () => {
    const thumbClasses = [
      'inline-block transform rounded-full bg-white transition duration-200 ease-in-out',
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
          {...props}
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
