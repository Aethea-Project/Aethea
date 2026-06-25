import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'dark';
  size?: 'default' | 'pill';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-nescafe text-white hover:bg-nescafe-hover focus-visible:outline-nescafe": variant === 'primary',
            "bg-sand-900 text-white hover:bg-black focus-visible:outline-sand-900": variant === 'dark',
            "border border-sand-200 bg-surface-card text-sand-700 hover:bg-sand-50 focus-visible:outline-olive-600": variant === 'outline',
            "bg-transparent text-sand-700 hover:bg-sand-50 focus-visible:outline-olive-600": variant === 'ghost',
          },
          {
            "px-4 py-2": size === 'default',
            "px-8 py-2": size === 'pill',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
