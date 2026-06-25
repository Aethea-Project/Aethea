import React from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  actionText?: string;
  onActionClick?: () => void;
  isActionLoading?: boolean;
  actionLoadingText?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  disabled = false,
  actionText,
  onActionClick,
  isActionLoading = false,
  actionLoadingText = 'Loading...',
  className = '',
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={`max-w-2xl relative group mb-8 ${className}`}>
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <svg
          className="w-5 h-5 text-sand-400 group-focus-within:text-nescafe transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full pl-12 pr-32 py-4 bg-white rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-nescafe/50 text-sand-900 transition-all text-sm md:text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {actionText && (
        <button
          type="button"
          onClick={onActionClick || handleSubmit}
          disabled={disabled || isActionLoading || !value.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-nescafe text-white text-sm font-semibold tracking-wide uppercase rounded-full hover:bg-nescafe-hover disabled:opacity-50 disabled:hover:bg-nescafe transition-colors flex items-center justify-center min-w-[120px]"
        >
          {isActionLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{actionLoadingText}</span>
            </div>
          ) : (
            actionText
          )}
        </button>
      )}
    </form>
  );
};
