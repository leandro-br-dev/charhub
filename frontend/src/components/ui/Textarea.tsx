import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    const baseClasses =
      'w-full rounded-lg border border-normal bg-light text-content placeholder-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-colors duration-200';

    const combinedClasses = `${baseClasses} ${className}`.trim();

    return <textarea ref={ref} className={combinedClasses} {...props} />;
  }
);

Textarea.displayName = 'Textarea';
