import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-lg border border-sand-200 bg-surface-card px-3 py-2 text-sm text-sand-900 transition-colors focus:border-olive-600 focus:outline-none focus:ring-1 focus:ring-sand-50 disabled:cursor-not-allowed disabled:bg-sand-50",
          error && "border-red-600 focus:border-red-600 focus:ring-red-100",
          className
        )}
        {...props}
      />
    );
  }
);
Select.displayName = 'Select';
