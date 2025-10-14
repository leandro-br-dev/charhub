import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label = '', ...props }, ref) => {
    const labelClasses = 'block text-sm font-medium text-content mb-1';

    const baseClasses =
      'w-full rounded-lg border border-normal bg-light text-content placeholder-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors duration-200';

    const combinedClasses = `${baseClasses} ${className}`.trim();

    return (
      <div>
        {label && (
          <label className={labelClasses}>
            {label}
          </label>
        )}
        <textarea ref={ref} className={combinedClasses} {...props} />
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
