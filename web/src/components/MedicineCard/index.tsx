import React, { useState } from 'react';
import type { Medicine } from '../../services/medicineApi';
import { cn } from '../../lib/cn';

interface MedicineCardProps {
  medicine: Medicine;
  selected?: boolean;
  onClick?: () => void;
  tone?: 'slate' | 'rose' | 'amber'; // Kept for API compat
}

type ThemeConfig = {
  gradient: string;
  tagColor: string;
  textColor: string;
};

const getCategoryTheme = (category: string): ThemeConfig => {
  const lowerCat = category.toLowerCase();
  
  if (lowerCat.includes('vitamin') || lowerCat.includes('supplement')) {
    return { gradient: 'from-amber-400 to-orange-500', tagColor: 'bg-amber-500', textColor: 'text-amber-600' };
  }
  if (lowerCat.includes('antibiotic')) {
    return { gradient: 'from-rose-400 to-red-500', tagColor: 'bg-rose-500', textColor: 'text-rose-600' };
  }
  if (lowerCat.includes('cold') || lowerCat.includes('flu') || lowerCat.includes('cough')) {
    return { gradient: 'from-cyan-400 to-blue-500', tagColor: 'bg-cyan-500', textColor: 'text-cyan-600' };
  }
  if (lowerCat.includes('pain') || lowerCat.includes('analgesic')) {
    return { gradient: 'from-violet-400 to-purple-500', tagColor: 'bg-violet-500', textColor: 'text-violet-600' };
  }
  
  // Default elegant slate
  return { gradient: 'from-slate-600 to-slate-800', tagColor: 'bg-slate-600', textColor: 'text-slate-800' };
};

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  selected = false,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(medicine.photoUrl) && !imageError;
  const hasWarning = !medicine.isSafe && medicine.flags.length > 0;
  
  const theme = getCategoryTheme(medicine.category);
  const handleActivate = () => onClick?.();

  return (
    <article
      className={cn(
        "flex flex-col h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 relative group",
        "focus:outline-none focus:ring-4 focus:ring-teal-500/50",
        selected ? "ring-4 ring-white ring-offset-4 ring-offset-slate-900 shadow-2xl scale-[1.02]" : "hover:-translate-y-2 hover:shadow-2xl shadow-lg"
      )}
      onClick={handleActivate}
      role="button"
      tabIndex={0}
      aria-label={`${medicine.brandNameAr} medicine card`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
    >
      {/* ── Top Half: Dark Image Container ── */}
      <div className="relative h-48 w-full bg-[#1e2128] flex items-center justify-center p-6 shrink-0">
        
        {/* Dynamic OTC / RX Price-Tag Style Badge */}
        <div className={cn(
          "absolute top-0 right-4 px-3 py-1.5 rounded-b-lg font-bold text-xs tracking-widest text-white uppercase shadow-md",
          theme.tagColor
        )}>
          {medicine.isOtc ? 'OTC' : 'RX'}
        </div>

        {showImage ? (
          <img
            src={medicine.photoUrl ?? undefined}
            alt={`${medicine.brandNameAr} package`}
            className="max-w-full max-h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-2 opacity-30" aria-hidden="true">
            <span className="text-4xl">💊</span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">NO IMAGE</span>
          </div>
        )}
      </div>

      {/* ── Bottom Half: Colorful Gradient Information Panel ── */}
      <div className={cn(
        "flex flex-col flex-1 p-6 text-white bg-gradient-to-br",
        theme.gradient
      )}>
        <div className="mb-auto">
          {/* Brand Name */}
          <h3 className="text-xl font-bold tracking-tight mb-1 line-clamp-1" title={medicine.brandNameAr}>
            {medicine.brandNameAr}
          </h3>
          
          {/* Generic Name */}
          <p className="text-sm font-medium text-white/80 line-clamp-1 mb-4" title={medicine.activeIngredient}>
            {medicine.activeIngredient}
          </p>
          
          {/* Status Indicator (Simple & Elegant) */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-5 items-center">
              {hasWarning ? (
                // Warning Dots
                <div className="flex gap-1">
                  <span className="block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span className="block w-2 h-2 rounded-full bg-red-400" />
                  <span className="block w-2 h-2 rounded-full bg-red-400" />
                </div>
              ) : (
                // All Clear Stars (Inspiration match)
                <div className="flex gap-1 text-white/90 text-xs">
                  ★★★★★
                </div>
              )}
            </div>
            <span className="text-xs font-bold tracking-widest uppercase text-white/90 drop-shadow-sm">
              {hasWarning ? 'Interaction Warning' : 'Clear Match'}
            </span>
          </div>
        </div>

        {/* ── View Details Action Pill ── */}
        <div className="mt-6">
          <button
            type="button"
            className={cn(
              "w-full rounded-full bg-white py-3 px-6 text-sm font-bold uppercase tracking-wider transition-transform",
              "hover:scale-[1.02] active:scale-95 shadow-md",
              theme.textColor
            )}
            tabIndex={-1} // Handled by parent container focus
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
};
