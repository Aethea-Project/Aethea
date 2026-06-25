import { useNavigate, useParams } from 'react-router-dom';
import { useMedicineDetail } from '../../hooks/useMedicines';
import { useLabFeedbacks } from '../../hooks/useLabTests';
import { cn } from '../../lib/utils';
import { FeatureHeader } from '../../components/FeatureHeader';

export default function MedicineDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { medicine: detail, loading: detailLoading, error: detailError } = useMedicineDetail(id || null);
  const { feedbacks } = useLabFeedbacks();

  if (detailLoading) {
    return (
      <div className="max-w-4xl mx-auto p-10 min-h-screen flex items-center justify-center">
        <div className="text-sand-600 font-medium">Loading medicine details...</div>
      </div>
    );
  }

  if (detailError || !detail) {
    return (
      <div className="max-w-4xl mx-auto p-10 min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-rose-600 font-medium">{detailError || 'Medicine not found.'}</div>
        <button
          onClick={() => navigate('/medicines')}
          className="rounded-full bg-olive-600 text-white px-6 py-2.5 font-bold shadow-sm hover:bg-olive-700 transition-colors"
        >
          Back to Medicine Guide
        </button>
      </div>
    );
  }

  // Calculate if there are lab warnings
  const relevantFeedbacks = feedbacks.filter(fb => {
    if (!fb.relatedMedicines || !Array.isArray(fb.relatedMedicines)) return false;
    return fb.relatedMedicines.some((medName: string) => 
      (detail.brandNameAr && detail.brandNameAr.toLowerCase().includes(medName.toLowerCase())) || 
      (detail.brandNameEn && detail.brandNameEn.toLowerCase().includes(medName.toLowerCase())) || 
      (detail.activeIngredient && detail.activeIngredient.toLowerCase().includes(medName.toLowerCase()))
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-12 pb-24">
      <button
        onClick={() => navigate('/medicines')}
        className="inline-flex items-center gap-2 text-sm font-bold text-sand-500 hover:text-sand-900 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Guide
      </button>

      <div className="bg-surface-card border border-sand-200 rounded-2xl shadow-sm p-8 md:p-12">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Main Photo if exists */}
          {detail.photoUrl && (
            <div className="w-full md:w-1/3 shrink-0">
              <div className="aspect-square rounded-xl border border-sand-200 overflow-hidden bg-white shadow-sm flex items-center justify-center p-4">
                <img 
                  src={detail.photoUrl as string} 
                  alt={detail.brandNameEn || 'Medicine'} 
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </div>
            </div>
          )}

          <div className="flex-1 space-y-8 w-full">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sand-500 mb-2">Medicine Details</p>
              <h1 className="text-3xl font-black text-sand-900 leading-tight">
                {detail.brandNameEn || detail.brandNameAr} 
                {detail.brandNameEn && detail.brandNameAr && (
                  <span className="block mt-1 text-sand-500 font-semibold text-lg">({detail.brandNameAr})</span>
                )}
              </h1>
            </div>

            {detail.hasPdf && (
              <button
                type="button"
                onClick={() => {
                  const pdfUrl = detail.photoUrl ? detail.photoUrl.replace(/\/[^/]+$/, '/leaflet.pdf') : `/api/medicines/${detail.id}/pdf`;
                  window.open(pdfUrl, '_blank');
                }}
                className="w-full md:w-auto py-3 px-6 bg-olive-600 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-olive-700 transition-colors shadow flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Open Treatment Leaflet (PDF)
              </button>
            )}

            {relevantFeedbacks.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  AI Lab Result Warning
                </h3>
                <div className="mt-2 text-sm leading-relaxed">
                  {relevantFeedbacks.map((fb, idx) => (
                    <p key={idx} className="mt-1">
                      <span className="font-semibold">{fb.condition}:</span> Based on your recent lab results, this medication may pose a risk. Please consult your doctor.
                    </p>
                  ))}
                </div>
              </div>
            )}

            {!detail.isSafe && detail.flags.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Needs review
                </h3>
                <div className="mt-2 text-sm leading-relaxed">
                  {detail.flags.map((flag, index) => (
                    <p key={`${flag.condition}-${index}`} className="mt-1">
                      <span className="font-semibold">{flag.condition.replace('_', ' ')}:</span>{' '}
                      {flag.reasonEn}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {detail.isSafe && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Verified safe
                </h3>
                <p className="mt-2 text-sm">
                  No contraindications found for your saved health conditions.
                </p>
              </div>
            )}
          </div>
        </div>

        <hr className="my-10 border-sand-200" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(detail.priceNew !== null || detail.priceOld !== null) && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3 sm:col-span-2 md:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Price (EGP)</h3>
              <div className="mt-1 flex items-baseline gap-3">
                {detail.priceNew !== null && (
                  <span className="text-2xl font-black text-sand-900">{Number(detail.priceNew).toFixed(2)} EGP</span>
                )}
                {detail.priceOld !== null && detail.priceOld !== detail.priceNew && (
                  <span className="text-sm font-medium text-sand-400 line-through">{Number(detail.priceOld).toFixed(2)} EGP</span>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Active ingredient</h3>
            <p className="mt-1 text-sm font-bold text-sand-900 break-words">{detail.activeIngredient}</p>
          </div>

          <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Form</h3>
            <p className="mt-1 text-sm font-bold text-sand-900 break-words capitalize">{detail.form}</p>
          </div>

          {detail.strength && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Strength</h3>
              <p className="mt-1 text-sm font-bold text-sand-900 break-words">{detail.strength}</p>
            </div>
          )}

          <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Category</h3>
            <p className="mt-1 text-sm font-bold text-sand-900 break-words">{detail.category}</p>
          </div>

          {(detail.packSize || detail.packUnit) && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Pack Size</h3>
              <p className="mt-1 text-sm font-bold text-sand-900 break-words">
                {[detail.packSize && `${detail.packSize} units`, detail.packUnit].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}

          {detail.origin && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Origin</h3>
              <p className="mt-1 text-sm font-bold text-sand-900 break-words capitalize">
                {detail.origin === 'imported' ? '🌍 Imported' : '🇪🇬 Local'}
              </p>
            </div>
          )}

          {detail.manufacturer && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3 sm:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Manufacturer</h3>
              <p className="mt-1 text-sm font-bold text-sand-900 break-words">{detail.manufacturer}</p>
            </div>
          )}

          {detail.barcode && (
            <div className="rounded-xl border border-sand-200 bg-surface px-4 py-3 sm:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Barcode (EAN)</h3>
              <p className="mt-1 text-sm font-mono font-bold text-sand-900 break-words">{detail.barcode}</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-sand-500">Drug classes</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {detail.drugClasses.map((drugClass) => (
              <span key={drugClass} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-olive-100 text-olive-800 border border-olive-200 shadow-sm">
                {drugClass}
              </span>
            ))}
          </div>
        </div>

        {detail.labelWarning && (
          <div className="mt-10 space-y-4">
            <h3 className="text-lg font-black text-sand-900">FDA label warnings</h3>

            {detail.labelWarning.boxed_warning && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-rose-700">Boxed warning</h4>
                <p className="mt-2 text-sm text-rose-800 leading-relaxed font-medium">{detail.labelWarning.boxed_warning}</p>
              </div>
            )}

            {detail.labelWarning.contraindications && (
              <div className="rounded-xl border border-sand-200 bg-surface-card px-5 py-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-rose-700">Contraindications</h4>
                <p className="mt-2 text-sm text-sand-700 leading-relaxed">{detail.labelWarning.contraindications}</p>
              </div>
            )}

            {!detail.labelWarning.boxed_warning &&
              !detail.labelWarning.contraindications &&
              detail.labelWarning.warnings && (
                <div className="rounded-xl border border-sand-200 bg-surface-card px-5 py-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-amber-700">Warnings</h4>
                  <p className="mt-2 text-sm text-sand-700 leading-relaxed">{detail.labelWarning.warnings}</p>
                </div>
              )}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-sand-200">
          <p className="text-xs leading-relaxed text-sand-400 max-w-2xl font-medium">
            This information is sourced from OpenFDA and DrugBank and is intended for educational purposes only. It does not replace professional medical advice. Always consult your doctor before making changes to your medication.
          </p>
        </div>
      </div>
    </div>
  );
}
