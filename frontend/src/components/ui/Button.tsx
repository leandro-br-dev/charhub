import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'light' | 'secondary' | 'danger' | 'dark';
  size?: 'extra-small' | 'small' | 'regular' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'regular',
      icon,
      iconPosition = 'right',
      className = '',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-semibold shadow-sm border border-transparent hover:opacity-90 gap-2 transition-all duration-200';

    const variants = {
      primary:
        'bg-primary text-white hover:border-primary active:border-primary',
      light: 'bg-light text-content border-normal',
      secondary: 'bg-secondary text-white border-normal',
      danger: 'bg-red-600 text-white hover:border-dark active:border-dark',
      dark: 'bg-dark text-content-dark hover:border-primary active:border-primary',
    };

    const sizes = {
      'extra-small': 'w-fit text-xs',
      small: 'w-fit text-sm',
      regular: 'text-sm',
      large: 'text-sm',
    };

    const rounded =
      children === undefined && icon && size === 'small'
        ? 'rounded-full'
        : 'rounded-lg';

    let padding = 'px-3 py-2';
    if (children === undefined && icon && (size === 'small' || size === 'extra-small')) padding = 'p-1';
    if (children !== undefined && size === 'small') padding = 'py-1 px-2';
    if (children !== undefined && size === 'extra-small') padding = 'py-1 px-1';

    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

    const combinedClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${rounded} ${padding} ${disabledClasses} ${className}`.trim();

    return (
      <button ref={ref} type="button" className={combinedClasses} disabled={disabled} {...props}>
        {icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
