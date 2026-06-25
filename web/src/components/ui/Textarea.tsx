import React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-lg border border-sand-200 bg-surface-card px-3 py-2 text-sm text-sand-900 transition-colors placeholder:text-sand-400 focus:border-olive-600 focus:outline-none focus:ring-1 focus:ring-sand-50 disabled:cursor-not-allowed disabled:bg-sand-50 resize-y",
          error && "border-red-600 focus:border-red-600 focus:ring-red-100",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
