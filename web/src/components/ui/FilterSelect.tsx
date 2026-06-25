import React from 'react';
import { cn } from '../../lib/utils';

export interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
}

export const FilterSelect = React.forwardRef<HTMLSelectElement, FilterSelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative w-full sm:w-auto", containerClassName)}>
        <select
          ref={ref}
          className={cn(
            "w-full sm:w-[220px] h-[52px] pl-6 pr-10 bg-white rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-nescafe/50 text-sand-900 transition-all text-sm md:text-base appearance-none cursor-pointer",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);

FilterSelect.displayName = 'FilterSelect';
