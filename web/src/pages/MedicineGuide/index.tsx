import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ConditionsBanner } from '../../components/ConditionsBanner';
import { MedicineCard } from '../../components/MedicineCard';
import { useCategories, useMedicineDetail, useMedicines } from '../../hooks/useMedicines';
import { useLabFeedbacks } from '../../hooks/useLabTests';
import { cn } from '../../lib/utils';

const CARD_TONES: Array<'slate' | 'rose' | 'amber'> = ['slate', 'rose', 'amber'];

const DETAIL_TONE_CLASSES: Record<string, string> = {
  slate: 'border-t-teal-600',
  rose: 'border-t-rose-500',
  amber: 'border-t-amber-600',
};

export default function MedicineGuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');

    if (q) {
      setSearchQuery(q);
    }
  }, [location]);

  const { categories } = useCategories();
  const { medicines, total, loading, search } = useMedicines();
  const { medicine: detail, loading: detailLoading, error: detailError } = useMedicineDetail(selectedMedicineId);
  const { feedbacks } = useLabFeedbacks();

  useEffect(() => {
    const timeout = setTimeout(() => {
      void search({
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory, search]);

  useEffect(() => {
    if (selectedMedicineId && !medicines.some((medicine) => medicine.id === selectedMedicineId)) {
      setSelectedMedicineId(null);
    }
  }, [medicines, selectedMedicineId]);

  const handleCardClick = (id: string) => {
    setSelectedMedicineId(id);
  };

  const closeDetails = () => setSelectedMedicineId(null);

  const selectedMedicineIndex = medicines.findIndex((medicine) => medicine.id === selectedMedicineId);
  const selectedMedicineTone = selectedMedicineIndex >= 0
    ? CARD_TONES[selectedMedicineIndex % CARD_TONES.length]
    : CARD_TONES[0];

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Medicine Guide</h1>
        <p className="mt-1 text-sm text-slate-600">
          Browse medicine cards with a placeholder image area until product photos are ready.
        </p>
      </header>

      <div className={cn('grid gap-6 grid-cols-1', selectedMedicineId && 'xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start')}>
        <section className="min-w-0 grid gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="medicine-search" className="text-sm font-semibold text-slate-700">
                Search medicines
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[0.7rem] font-bold uppercase tracking-widest text-slate-400" aria-hidden="true">
                  Search
                </span>
                <input
                  id="medicine-search"
                  type="text"
                  className="w-full min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 pl-16 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
                  placeholder="Search by brand name or active ingredient..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search medicines"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Medicine categories">
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === ''}
                className={cn(
                  'rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-[0.85rem] font-semibold text-slate-700 transition-colors hover:bg-slate-100',
                  selectedCategory === '' && 'border-teal-600 bg-teal-600 text-white hover:bg-teal-600',
                )}
                onClick={() => setSelectedCategory('')}
              >
                All Medicines
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category}
                  className={cn(
                    'rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-[0.85rem] font-semibold text-slate-700 transition-colors hover:bg-slate-100',
                    selectedCategory === category && 'border-teal-600 bg-teal-600 text-white hover:bg-teal-600',
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <ConditionsBanner />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Medicines</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? 'Loading medicine cards...' : `${total || medicines.length} results`}
              </p>
            </div>

            {selectedMedicineId && (
              <button
                type="button"
                className="w-full sm:w-auto rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[0.85rem] font-semibold text-slate-900 hover:bg-slate-50"
                onClick={closeDetails}
              >
                Clear selection
              </button>
            )}
          </div>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[180px] grid place-items-center text-center text-slate-600 p-5">
              Loading medicine cards...
            </div>
          ) : medicines.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm min-h-[180px] grid place-items-center text-center text-slate-600 p-5">
              <div className="text-sm font-bold text-slate-900">No results</div>
              <p className="mt-2 text-sm text-slate-500">Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(290px,1fr))]" role="list" aria-label="Medicine cards">
              {medicines.map((medicine, index) => (
                <div key={medicine.id} role="listitem">
                  <MedicineCard
                    medicine={medicine}
                    selected={selectedMedicineId === medicine.id}
                    onClick={() => handleCardClick(medicine.id)}
                    tone={CARD_TONES[index % CARD_TONES.length]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {selectedMedicineId && (
          <aside
            className="xl:sticky xl:top-6"
            role="complementary"
            aria-label="Medicine details"
          >
            {detailLoading ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                Loading details...
              </div>
            ) : detailError ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                {detailError}
              </div>
            ) : detail ? (
              <div
                className={cn(
                  'bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid gap-4 border-t-4',
                  DETAIL_TONE_CLASSES[selectedMedicineTone] || 'border-t-teal-600',
                )}
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Selected medicine</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">{detail.brandNameAr}</h2>
                  </div>

                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                    onClick={closeDetails}
                    aria-label="Close details"
                  >
                    Close
                  </button>
                </div>

                <div className="grid gap-4">
                  {(() => {
                    const relevantFeedbacks = feedbacks.filter(fb => {
                      if (!fb.relatedMedicines || !Array.isArray(fb.relatedMedicines)) return false;
                      return fb.relatedMedicines.some((medName: string) => 
                        (detail.brandNameAr && detail.brandNameAr.toLowerCase().includes(medName.toLowerCase())) || 
                        (detail.brandNameEn && detail.brandNameEn.toLowerCase().includes(medName.toLowerCase())) || 
                        (detail.activeIngredient && detail.activeIngredient.toLowerCase().includes(medName.toLowerCase()))
                      );
                    });

                    if (relevantFeedbacks.length > 0) {
                      return (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-amber-900 shadow-sm">
                          <h3 className="text-sm font-bold flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            AI Lab Result Warning
                          </h3>
                          <div className="mt-1.5 text-[0.85rem] leading-relaxed">
                            {relevantFeedbacks.map((fb, idx) => (
                              <p key={idx} className="mt-1">
                                <span className="font-semibold">{fb.condition}:</span> Based on your recent lab results, this medication may pose a risk. Please consult your doctor.
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {!detail.isSafe && detail.flags.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-red-800">
                      <h3 className="text-sm font-bold">Needs review</h3>
                      <div className="mt-1.5 text-[0.85rem] leading-relaxed">
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
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-emerald-800">
                      <h3 className="text-sm font-bold">Verified safe</h3>
                      <p className="mt-1.5 text-[0.85rem]">
                        No contraindications found for your saved health conditions.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Active ingredient</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{detail.activeIngredient}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Form</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{detail.form}</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">Category</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{detail.category}</p>
                    </div>

                    {detail.rxcui && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                        <h3 className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-500">RxCUI</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-900 break-words">{detail.rxcui}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Drug classes</h3>
                    <ul className="mt-2 grid gap-2 max-h-56 overflow-auto pr-1">
                      {detail.drugClasses.map((drugClass) => (
                        <li key={drugClass} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[0.85rem] text-slate-700">
                          {drugClass}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {detail.labelWarning && (
                    <div className="grid gap-3">
                      <h3 className="text-sm font-bold text-slate-900">FDA label warnings</h3>

                      {detail.labelWarning.boxed_warning && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                          <h4 className="text-[0.7rem] font-bold uppercase tracking-widest text-rose-700">Boxed warning</h4>
                          <p className="mt-2 text-[0.85rem] text-rose-800 leading-relaxed">{detail.labelWarning.boxed_warning}</p>
                        </div>
                      )}

                      {detail.labelWarning.contraindications && (
                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                          <h4 className="text-[0.7rem] font-bold uppercase tracking-widest text-rose-700">Contraindications</h4>
                          <p className="mt-2 text-[0.85rem] text-slate-700 leading-relaxed">{detail.labelWarning.contraindications}</p>
                        </div>
                      )}

                      {!detail.labelWarning.boxed_warning &&
                        !detail.labelWarning.contraindications &&
                        detail.labelWarning.warnings && (
                          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                            <h4 className="text-[0.7rem] font-bold uppercase tracking-widest text-amber-700">Warnings</h4>
                            <p className="mt-2 text-[0.85rem] text-slate-700 leading-relaxed">{detail.labelWarning.warnings}</p>
                          </div>
                        )}
                    </div>
                  )}

                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[0.8rem] leading-relaxed text-slate-600">
                    This information is from OpenFDA and DrugBank and is intended for educational purposes. It does not
                    replace professional medical advice. Always consult your doctor before making changes to your
                    medication.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                Details not found.
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
