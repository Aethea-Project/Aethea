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

  return (
    <header className={`feature-header ${variant}`}>
      {showImage && (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="feature-header-bg"
          onError={() => setImageError(true)}
        />
      )}
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
};
