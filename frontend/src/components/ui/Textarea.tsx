import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label = '', error, ...props }, ref) => {
    const labelClasses = 'block text-sm font-medium text-content mb-1';

    const baseClasses =
      'w-full rounded-lg border bg-light text-content placeholder-muted focus:outline-none focus:ring-2 resize-none transition-colors duration-200';

    const borderClasses = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-normal focus:border-primary focus:ring-primary/20';

    const combinedClasses = `${baseClasses} ${borderClasses} ${className}`.trim();

    return (
      <div>
        {label && (
          <label className={labelClasses}>
            {label}
          </label>
        )}
        <textarea ref={ref} className={combinedClasses} {...props} />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
