import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { MedicineCard } from '../../components/MedicineCard';
import { useCategories, useMedicines } from '../../hooks/useMedicines';
import { cn } from '../../lib/utils';
import { FeatureHeader } from '../../components/FeatureHeader';
import { SearchBar } from '../../components/ui/SearchBar';
import { FilterSelect } from '../../components/ui/FilterSelect';

const CARD_TONES: Array<'slate' | 'rose' | 'amber'> = ['slate', 'rose', 'amber'];



export default function MedicineGuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<'all'|'clear'|'warning'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');

    if (q) {
      setSearchQuery(q);
    }
  }, [location]);

  const { categories } = useCategories();
  const { medicines, total, loading, search } = useMedicines();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, matchStatus]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void search({
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        matchStatus: matchStatus,
        page: currentPage,
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory, matchStatus, currentPage, search]);

  const handleCardClick = (id: string) => {
    navigate(`/medicines/${id}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <FeatureHeader 
        title="Medicine Guide" 
        subtitle="Search for botanical extracts, mindful remedies, and clinically verified prescriptions." 
      />

      <div className="grid gap-6 grid-cols-1">
        <section className="min-w-0 grid gap-10">
          {/* Floating Search & Tags */}
          <div className="grid gap-6 relative z-10">
            <div className="w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search medicine or conditions..."
                  className="!max-w-none !mb-0"
                />
              </div>
              <FilterSelect
                value={matchStatus}
                onChange={(e) => setMatchStatus(e.target.value as 'all'|'clear'|'warning')}
              >
                <option value="all">All Matches</option>
                <option value="clear">Clear Match</option>
                <option value="warning">Interaction Warning</option>
              </FilterSelect>
            </div>

            <div className="relative z-10 flex flex-wrap justify-start gap-3" role="tablist" aria-label="Medicine categories">
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === ''}
                className={cn(
                  'rounded-full px-5 py-2 text-[0.85rem] font-medium transition-all shadow-sm backdrop-blur-sm',
                  selectedCategory === '' 
                    ? 'bg-olive-600 text-white shadow-md' 
                    : 'bg-sand-200/60 text-sand-700 hover:bg-sand-300/80 border border-white/40'
                )}
                onClick={() => setSelectedCategory('')}
              >
                All Remedies
              </button>

              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === category}
                  className={cn(
                    'rounded-full px-5 py-2 text-[0.85rem] font-medium transition-all shadow-sm backdrop-blur-sm',
                    selectedCategory === category 
                      ? 'bg-olive-600 text-white shadow-md' 
                      : 'bg-sand-200/50 text-sand-800 hover:bg-sand-300/60 border border-transparent hover:border-white/30'
                  )}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>



          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-sand-900">Medicines</h2>
              <p className="mt-1 text-sm text-sand-500">
                {loading ? 'Loading medicine cards...' : `${total || medicines.length} results`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-surface-card border border-sand-200 rounded-lg shadow-sm min-h-[180px] grid place-items-center text-center text-sand-600 p-5">
              Loading medicine cards...
            </div>
          ) : medicines.length === 0 ? (
            <div className="bg-surface-card border border-sand-200 rounded-lg shadow-sm min-h-[180px] grid place-items-center text-center text-sand-600 p-5">
              <div className="text-sm font-bold text-sand-900">No results</div>
              <p className="mt-2 text-sm text-sand-500">Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(250px,1fr))]" role="list" aria-label="Medicine cards">
              {medicines.map((medicine, index) => (
                <div key={medicine.id} role="listitem">
                  <MedicineCard
                    medicine={medicine}
                    selected={false}
                    onClick={() => handleCardClick(medicine.id)}
                    tone={CARD_TONES[index % CARD_TONES.length]}
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination Controls ── */}
          {!loading && total > 20 && (
            <div className="mt-8 flex items-center justify-between pt-6">
              <button
                type="button"
                className="rounded-lg border border-sand-300 bg-surface-card px-4 py-2 text-sm font-semibold text-sand-900 transition-colors hover:bg-sand-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-sm font-medium text-sand-600">
                Page {currentPage} of {Math.ceil(total / 20)}
              </span>
              <button
                type="button"
                className="rounded-lg border border-sand-300 bg-surface-card px-4 py-2 text-sm font-semibold text-sand-900 transition-colors hover:bg-sand-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= Math.ceil(total / 20)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
