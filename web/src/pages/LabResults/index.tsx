import { useMemo, useState } from 'react';
import { LabTest, LabStatus } from '@core/types/medical';
import { useLabFeedbacks, useLabTests } from '../../hooks/useLabTests';
import { Modal } from '../../components/Modal';
import { UploadLabModal } from './UploadLabModal';

/**
 * Aethea - Lab Results Page (Web)
 * Enterprise-level table view with charts and sorting
 */

const STATUS_BADGE_CLASSES: Record<LabStatus, string> = {
  normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  borderline: 'border-amber-200 bg-amber-50 text-amber-700',
  abnormal: 'border-red-200 bg-red-50 text-red-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_DOT_CLASSES: Record<LabStatus, string> = {
  normal: 'bg-emerald-500',
  borderline: 'bg-amber-500',
  abnormal: 'bg-red-500',
  critical: 'bg-red-600',
};

export default function LabResultsPage() {
  const { labTests, loading: testsLoading, error: testsError, refresh: refreshTests } = useLabTests();
  const { feedbacks, loading: feedbacksLoading, refresh: refreshFeedbacks } = useLabFeedbacks();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [aiResultData, setAiResultData] = useState<any>(null);

  const loading = testsLoading && feedbacksLoading;
  const error = testsError;

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(labTests.map((t) => t.category)))],
    [labTests]
  );

  const filteredTests = useMemo(() => {
    const base = selectedCategory === 'all'
      ? labTests
      : labTests.filter((t) => t.category === selectedCategory);

    return [...base].sort((a, b) => {
      if (sortBy === 'date') return b.date.getTime() - a.date.getTime();
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'name') return a.testName.localeCompare(b.testName);
      return 0;
    });
  }, [labTests, selectedCategory, sortBy]);

  const stats = {
    normal: labTests.filter((t) => t.status === 'normal').length,
    borderline: labTests.filter((t) => t.status === 'borderline').length,
    abnormal: labTests.filter((t) => t.status === 'abnormal' || t.status === 'critical').length,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-gray-500 text-center py-12 bg-white border border-gray-200 rounded-lg">
          Loading lab results…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-red-600 text-center py-12 bg-red-50 border border-red-200 rounded-lg">
          Failed to load lab results: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Lab Results</h1>
        <p className="mt-1 text-sm text-gray-600">{labTests.length} total tests</p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <select
          className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full sm:w-48 p-2.5"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'name')}
        >
          <option value="date">Sort by Date</option>
          <option value="status">Sort by Status</option>
          <option value="name">Sort by Name</option>
        </select>
        
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload New Result
          </button>
          <button type="button" className="inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Download All Reports
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-teal-600">{stats.normal}</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Normal</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-500">{stats.borderline}</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Borderline</div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{stats.abnormal}</div>
              <div className="text-sm font-medium text-gray-600 mt-1">Abnormal</div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">Filter by Category</h3>
            <ul className="space-y-1">
              {categories.map(category => (
                <li key={category}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedCategory === category
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <span>
                      {category === 'all' ? 'All Tests' : category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === category ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category === 'all'
                        ? labTests.length
                        : labTests.filter(t => t.category === category).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-900">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium w-4"></th>
                  <th scope="col" className="px-4 py-3 font-medium">Test Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Result</th>
                  <th scope="col" className="px-4 py-3 font-medium">Reference Range</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Ordered By</th>
                  <th scope="col" className="px-4 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-200">
                {filteredTests.map(test => (
                  <tr
                    key={test.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedTest(test)}
                  >
                    <td className="px-4 py-3 text-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT_CLASSES[test.status]}`}
                        title={test.status}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{test.testName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{test.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-gray-900 mr-1">{typeof test.value === 'number' ? test.value.toFixed(1) : test.value}</span>
                        <span className="text-xs text-gray-500">{test.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {test.referenceRange.text || 
                        `${test.referenceRange.min ?? '—'} - ${test.referenceRange.max ?? '—'} ${test.unit}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {test.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[120px]">{test.orderedBy}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="text-gray-400 hover:text-teal-600 transition-colors" aria-label="View Details">
                        →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Insights Section */}
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Medical Insights History</h2>
                <p className="mt-1 text-sm text-gray-500">Insights and warnings from your uploaded lab reports</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">AI Powered</span>
              </div>
            </div>

            {feedbacks.length === 0 && !feedbacksLoading ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900">No AI insights yet</h3>
                <p className="mt-1 text-xs text-gray-500">Upload a lab result to see AI-driven medical analysis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {feedbacks.map((fb: any) => (
                  <div key={fb.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                            {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900">{fb.condition}</h3>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          fb.riskLevel === 'high' ? 'bg-red-50 text-red-700 border border-red-100' :
                          fb.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {fb.riskLevel} Risk
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Patient Summary</h4>
                          <p className="text-sm text-gray-700 leading-relaxed italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                            "{fb.patientSummary || 'Analysis complete. Please consult your doctor for details.'}"
                          </p>
                        </div>

                        {fb.relatedMedicines?.length > 0 && (
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Medication Warnings</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {fb.relatedMedicines.map((med: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white text-amber-700 text-[10px] font-medium rounded border border-amber-200">
                                  {med}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {fb.doctorAnalysis && (
                          <details className="group">
                            <summary className="text-xs font-medium text-teal-600 cursor-pointer hover:text-teal-700 list-none flex items-center">
                              <svg className="w-3 h-3 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              View Technical Analysis (Doctor)
                            </summary>
                            <div className="mt-3 text-xs text-gray-600 whitespace-pre-wrap pl-4 border-l-2 border-teal-100 py-1">
                              {fb.doctorAnalysis}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedTest} onClose={() => setSelectedTest(null)} ariaLabel="Lab test details">
        {selectedTest && (
          <div className="p-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedTest.testName}</h2>
                <div
                  className={`text-sm border-2 inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full font-medium ${
                    STATUS_BADGE_CLASSES[selectedTest.status]
                  }`}
                >
                  {selectedTest.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-8">
              {/* Main Result */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Result</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 tracking-tight">
                    {typeof selectedTest.value === 'number' ? selectedTest.value.toFixed(1) : selectedTest.value}
                  </span>
                  <span className="text-lg font-medium text-gray-500">{selectedTest.unit}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 border-b border-gray-100 pb-2">Details</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedTest.category}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Test Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedTest.date.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered By</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedTest.orderedBy}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Range</dt>
                    <dd className="mt-1 text-sm font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block">
                      {selectedTest.referenceRange.text || 
                        `${selectedTest.referenceRange.min ?? '—'} - ${selectedTest.referenceRange.max ?? '—'} ${selectedTest.unit}`}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Notes */}
              {selectedTest.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Doctor's Notes</h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-900">
                    {selectedTest.notes}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Historical Trend</h3>
                <p className="text-sm text-gray-500">Trend data will appear once multiple results are recorded for this test.</p>
              </div>
            </div>

            {/* Action Footer */}
            <div className="bg-gray-50 p-4 sm:px-6 border-t border-gray-200 rounded-b-lg flex flex-col sm:flex-row justify-end gap-3">
              <button type="button" className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                Download Report
              </button>
              <button type="button" className="inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
                Schedule Follow-up
              </button>
            </div>
          </div>
        )}
      </Modal>

      <UploadLabModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(result) => {
          setIsUploadModalOpen(false);
          setAiResultData(result);
          // Refresh both data sources after a successful upload
          refreshTests();
          refreshFeedbacks();
        }}
      />

      {/* AI Result Modal */}
      <Modal isOpen={!!aiResultData} onClose={() => setAiResultData(null)} ariaLabel="AI Analysis Result">
        {aiResultData && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis Complete</h2>
            <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
              <h3 className="font-semibold text-teal-800 mb-2">Doctor View (Detailed)</h3>
              <p className="text-sm text-teal-700 whitespace-pre-wrap">{aiResultData.aiResult?.doctor_analysis || JSON.stringify(aiResultData.aiResult, null, 2)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Patient View (Simplified)</h3>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{aiResultData.aiResult?.patient_summary || "Please check with your doctor for more details."}</p>
            </div>
            
            {aiResultData.generatedFeedback?.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-amber-800 mb-2">⚠️ Medication Warnings Detected</h3>
                <ul className="list-disc list-inside text-sm text-amber-700">
                  {aiResultData.generatedFeedback.map((fb: any, idx: number) => (
                    <li key={idx}>Condition: {fb.condition} - Watch out for: {fb.relatedMedicines?.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button 
                onClick={() => setAiResultData(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
