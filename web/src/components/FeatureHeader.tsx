import React from 'react';

interface FeatureHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Reusable feature page header — title + subtitle + optional actions
 * Unboxed editorial style matching the dashboard aesthetic.
 */
export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-sand-900 mb-2">{title}</h1>
        {subtitle && <p className="text-lg font-medium text-sand-500 max-w-2xl">{subtitle}</p>}
      </div>
      {children && (
        <div className="flex-shrink-0">
          {children}
        </div>
      )}
    </header>
  );
};
