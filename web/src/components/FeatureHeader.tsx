import React, { useState } from 'react';

interface FeatureHeaderProps {
  title: string;
  subtitle: string;
  variant: 'lab' | 'scan' | 'med' | 'doc' | 'food' | 'rec' | 'chat';
  imageSrc?: string;
  imageAlt?: string;
}

/**
 * Reusable feature page header with optional background image
 * Fallback to gradient when no image provided
 */
export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  title,
  subtitle,
  variant,
  imageSrc,
  imageAlt = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const showImage = imageSrc && !imageError;
  const variantTone: Record<FeatureHeaderProps['variant'], string> = {
    lab: 'border-l-violet-500',
    scan: 'border-l-teal-600',
    med: 'border-l-amber-500',
    doc: 'border-l-emerald-500',
    food: 'border-l-orange-500',
    rec: 'border-l-sky-500',
    chat: 'border-l-indigo-500',
  };

  return (
    <header className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 ${variantTone[variant]} border-l-4`}>
      {showImage && (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="hidden"
          onError={() => setImageError(true)}
        />
      )}
      <h1 className="font-['Fraunces'] text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </header>
  );
};
