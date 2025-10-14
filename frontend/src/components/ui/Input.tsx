
// frontend/src/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  iconPosition?: 'left' | 'right';
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = 'text',
      variant = 'primary',
      placeholder = '',
      icon = '',
      iconPosition = 'right',
      className = '',
      label = '',
      ...props
    },
    ref
  ) => {
    const labelClasses = 'block text-sm font-medium text-content mb-1';

    const inputPaddingClasses = icon
      ? iconPosition === 'left' ? 'pl-10' : 'pr-10'
      : 'px-3';

    const inputBaseClasses = `
      w-full rounded-lg py-2 px-3 text-sm shadow-sm border bg-light text-content
      focus:ring-2 focus:outline-none 
      ${inputPaddingClasses}
    `;

    const variants = {
      primary: 'border-gray-300 focus:border-primary focus:ring-primary',
      secondary: 'border-gray-200 focus:border-primary focus:ring-primary',
      danger: 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500',
    };

    const iconBaseClasses = 'absolute inset-y-0 flex items-center text-content pointer-events-none';
    const iconPositionClasses = iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3';
    const iconClasses = `${iconBaseClasses} ${iconPositionClasses}`;

    const combinedInputClasses = `${inputBaseClasses} ${variants[variant]}`.trim();

    return (
      <div className={className}>
        {label && (
          <label className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className={iconClasses}>
              <span className="material-symbols-outlined">{icon}</span>
            </span>
          )}
          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            className={combinedInputClasses}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
