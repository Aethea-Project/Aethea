import React, { useState } from 'react';
import type { Medicine } from '../../services/medicineApi';
import { cn } from '../../lib/utils';
import { MedicineIcon } from '../Icons';

interface MedicineCardProps {
  medicine: Medicine;
  selected?: boolean;
  onClick?: () => void;
  tone?: 'slate' | 'rose' | 'amber'; // Kept for API compat
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  selected = false,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const showImage = Boolean(medicine.photoUrl) && !imageError;
  const hasWarning = !medicine.isSafe && medicine.flags.length > 0;

  const handleActivate = () => onClick?.();

  /* ── Price helpers ── */
  const hasPrice = medicine.priceNew !== null && medicine.priceNew !== undefined;
  const hasPriceChange = hasPrice && medicine.priceOld !== null && medicine.priceOld !== undefined && medicine.priceOld !== medicine.priceNew;



  return (
    <article
      className={cn(
        "flex flex-col h-full rounded-lg overflow-hidden cursor-pointer transition-all border bg-surface-card shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-sand-500 focus:ring-offset-2",
        selected ? "border-olive-600 ring-2 ring-sand-200" : "border-sand-200 hover:border-sand-300 hover:shadow-sm"
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
      {/* ── Image Container ── */}
      <div className="relative h-[220px] w-full flex flex-col items-center justify-center pt-8 bg-transparent shrink-0">
        {/* OTC / RX Badge */}
        <div className={cn(
          "absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm",
          medicine.isOtc ? "bg-sand-100/60 text-sand-600 border border-white/50" : "bg-rose-50/60 text-rose-700 border border-white/50"
        )}>
          {medicine.isOtc ? 'OTC' : 'RX'}
        </div>

        {/* Origin Badge */}
        {medicine.origin && (
          <div className={cn(
            "absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-md shadow-sm",
            medicine.origin === 'imported'
              ? "bg-blue-50/60 text-blue-700 border border-blue-200/50"
              : "bg-sand-50/60 text-sand-900 border border-sand-200/50"
          )}>
            {medicine.origin === 'imported' ? '🌍 Imported' : '🇪🇬 Local'}
          </div>
        )}

        {showImage ? (
          <img
            src={medicine.photoUrl ?? undefined}
            alt={`${medicine.brandNameEn || medicine.brandNameAr} package`}
            className="w-48 h-48 object-contain drop-shadow-md"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4" aria-hidden="true">
            <MedicineIcon className="w-20 h-20 text-sand-300 drop-shadow-sm" />
            <span className="text-xs font-bold text-sand-400 uppercase tracking-wider">No Image</span>
          </div>
        )}
      </div>

      {/* ── Info Panel ── */}
      <div className="flex flex-col flex-1 px-8 pb-8 pt-0 text-center">
        {/* Brand Name (English Preferred) */}
        <h3 className="font-serif text-2xl font-medium text-sand-900 tracking-tight mb-1 line-clamp-2" title={medicine.brandNameEn || medicine.brandNameAr}>
          {medicine.brandNameEn || medicine.brandNameAr}
        </h3>

        {/* Price */}
        {hasPrice && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-lg font-bold text-sand-900">
              {Number(medicine.priceNew).toFixed(0)} EGP
            </span>
            {hasPriceChange && (
              <span className="text-xs text-sand-400 line-through">
                {Number(medicine.priceOld).toFixed(0)}
              </span>
            )}
          </div>
        )}
        
        {/* Status */}
        <div className="flex justify-center items-center gap-2 mt-auto pt-4 border-t border-sand-100">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            hasWarning ? "bg-olive-500" : "bg-sand-500"
          )} />
          <span className={cn(
            "text-[11px] font-bold uppercase tracking-wider",
            hasWarning ? "text-olive-700" : "text-sand-900"
          )}>
            {hasWarning ? 'Interaction Warning' : 'Clear Match'}
          </span>
        </div>
      </div>
    </article>
  );
};
