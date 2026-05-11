import { useMemo, useState, useEffect, useCallback } from 'react';
import { LabTest, LabStatus } from '@core/types/medical';
import { useAiUpload } from '../../contexts/AiUploadContext';
import { useLabFeedbacks, useLabTests } from '../../hooks/useLabTests';
import { Modal } from '../../components/Modal';
import { medicalApi } from '../../services/medicalApi';
import toast from 'react-hot-toast';

/**
 * Aethea - Lab Results Page (Web)
 * Enterprise-level analysis dashboard
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

const STATUS_TEXT_CLASSES: Record<LabStatus, string> = {
  normal: 'text-emerald-600',
  borderline: 'text-amber-600',
  abnormal: 'text-red-600',
  critical: 'text-red-700',
};

function LabResultsPage() {
  const { labTests, loading: testsLoading, error: testsError, refresh: refreshTests } = useLabTests();
  const { feedbacks, loading: feedbacksLoading, refresh: refreshFeedbacks } = useLabFeedbacks();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const { setIsModalOpen } = useAiUpload();
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [viewMode, setViewMode] = useState<'summary' | 'table'>('summary');

  const loadData = useCallback(async () => {
    refreshTests();
    refreshFeedbacks();
  }, [refreshTests, refreshFeedbacks]);

  const loading = testsLoading && feedbacksLoading;
  const error = testsError;

  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    window.addEventListener('lab-data-refresh', handleRefresh);
    return () => window.removeEventListener('lab-data-refresh', handleRefresh);
  }, [loadData]);

  const handleRenameFeedback = async (id: string) => {
    try {
      if (!editValue.trim()) return;
      await medicalApi.updateLabFeedback(id, editValue);
      setEditingFeedbackId(null);
      loadData();
      toast.success('Renamed successfully');
    } catch (err) {
      toast.error('Failed to rename');
    }
  };

  const handleRenameTest = async (id: string, newName: string) => {
    try {
      await medicalApi.updateLabTest(id, { testName: newName });
      loadData();
      toast.success('Test renamed');
    } catch (err) {
      toast.error('Failed to rename test');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this analysis session? This will also delete all associated lab results.')) return;
    try {
      await medicalApi.deleteLabFeedback(id);
      loadData();
      setSelectedFeedback(null);
      toast.success('Session deleted');
    } catch (err) {
      toast.error('Failed to delete session');
    }
  };

  // Grouping logic for comparison view
  const groupedTests = useMemo(() => {
    const groups: Record<string, { latest: LabTest; history: LabTest[] }> = {};
    labTests.forEach((t) => {
      if (!groups[t.testName]) {
        groups[t.testName] = { latest: t, history: [] };
      }
      groups[t.testName].history.push(t);
      if (t.date > groups[t.testName].latest.date) {
        groups[t.testName].latest = t;
      }
    });
    // Sort history by date desc
    Object.values(groups).forEach(g => {
      g.history.sort((a, b) => b.date.getTime() - a.date.getTime());
    });
    return groups;
  }, [labTests]);

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
      <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-500">Loading your health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <p className="text-sm font-black text-red-600">Failed to load lab results: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header Area */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Medical Lab Analysis</h1>
          <p className="mt-1 text-sm font-bold text-gray-500">Monitor and track your clinical biomarkers</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('summary')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'summary' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Summary View
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Detailed Table
            </button>
          </div>

          <button 
            type="button" 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-[10px] font-black text-white uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload Report
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          {/* Stats Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Results</p>
            <p className="text-4xl font-black text-gray-900 leading-none mb-6">{labTests.length}</p>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl">
                 <span className="text-lg font-black text-emerald-600">{stats.normal}</span>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Normal</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50/50 border border-amber-100/50 rounded-xl">
                 <span className="text-lg font-black text-amber-600">{stats.borderline}</span>
                 <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Warning</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-red-50/50 border border-red-100/50 rounded-xl">
                 <span className="text-lg font-black text-red-600">{stats.abnormal}</span>
                 <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Critical</span>
              </div>
            </div>
          </div>

          {/* Categories Sidebar */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Categories</h3>
            <div className="space-y-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold rounded-lg transition-all ${
                    selectedCategory === category
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{category === 'all' ? 'All Data' : category}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${selectedCategory === category ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {category === 'all' ? labTests.length : labTests.filter(t => t.category === category).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {viewMode === 'summary' ? (
            /* Summary Cards (Feedbacks) */
            <div className="space-y-8">
              {feedbacks.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">No Reports Found</h3>
                  <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto font-medium">Upload your lab results to see AI-powered health analysis</p>
                  <button onClick={() => setIsModalOpen(true)} className="px-8 py-3 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-teal-600/20">Analyze New Report</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {feedbacks.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((fb: any) => (
                    <div 
                      key={fb.id} 
                      onClick={() => setSelectedFeedback(fb)}
                      className="bg-white border border-gray-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group relative cursor-pointer active:scale-[0.98]"
                    >
                      {/* Delete Action (prevent bubbling) */}
                      <button 
                        onClick={(e) => {
                           e.stopPropagation();
                           handleDeleteFeedback(fb.id);
                        }}
                        className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>

                      <div className="p-10">
                        <div className="flex flex-col gap-6">
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50 px-3 py-1 rounded-lg">
                                {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                                {new Date(fb.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <h3 className="text-3xl font-black text-gray-900 group-hover:text-teal-600 transition-colors tracking-tight leading-none mb-4">{fb.condition}</h3>
                            
                            <div className="flex items-center gap-3">
                               <div className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                fb.riskLevel === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                fb.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                {fb.riskLevel} risk
                              </div>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                 {fb.labTests?.length || 0} biomarkers found
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                             <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2">
                                View Full Analysis
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                             </span>
                             <div className="flex -space-x-2">
                                {fb.labTests?.slice(0, 3).map((t: any) => (
                                   <div key={t.id} className={`w-6 h-6 rounded-full border-2 border-white shadow-sm ${STATUS_DOT_CLASSES[t.status as LabStatus]}`} />
                                ))}
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Detailed Table View */
            <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Biomarker</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Result</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Normal Limits</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Assessment</th>
                      <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTests.map((test) => (
                      <tr 
                        key={test.id} 
                        onClick={() => setSelectedTest(test)}
                        className="group hover:bg-teal-50/20 transition-all cursor-pointer"
                      >
                        <td className="px-10 py-8 text-center">
                          <p className="text-sm font-black text-gray-900">{test.testName}</p>
                          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1.5">{test.category}</p>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-lg font-black text-gray-900 tracking-tight">{test.value}</span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase">{test.unit}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-center">
                           <span className="text-[11px] font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100/50">
                              {test.referenceRange.text || `${test.referenceRange.min} — ${test.referenceRange.max}`}
                           </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className={`mx-auto w-fit px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASSES[test.status]} shadow-sm`}>
                            {test.status}
                          </div>
                        </td>
                        <td className="px-10 py-8 whitespace-nowrap text-center">
                          <div className="text-[11px] font-black text-gray-900">
                            {test.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {test.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Test Details Modal */}
      {selectedTest && (
        <Modal 
          isOpen={!!selectedTest} 
          onClose={() => setSelectedTest(null)}
          contentClassName="p-0 overflow-hidden rounded-[40px] max-w-4xl"
        >
          <div className="flex flex-col md:flex-row min-h-[500px]">
            <div className="flex-1 p-12 bg-white">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] block mb-4">Biomarker Analysis</span>
                  <div className="flex items-center gap-4 group/title">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none">{selectedTest.testName}</h2>
                    <button 
                      onClick={() => {
                        const newName = prompt('Rename this biomarker:', selectedTest.testName);
                        if (newName && newName.trim()) {
                          handleRenameTest(selectedTest.id, newName);
                          setSelectedTest({ ...selectedTest, testName: newName });
                        }
                      }}
                      className="opacity-0 group-hover/title:opacity-100 p-2 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-2xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>
                </div>
                <div className={`px-5 py-2.5 rounded-[20px] border text-[10px] font-black uppercase tracking-widest shadow-sm ${STATUS_BADGE_CLASSES[selectedTest.status]}`}>
                  {selectedTest.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 mb-12">
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Your Result</p>
                  <p className="text-5xl font-black text-gray-900 leading-none">
                    {selectedTest.value}
                    <span className="text-xl text-gray-400 ml-3 tracking-normal uppercase font-bold">{selectedTest.unit}</span>
                  </p>
                </div>
                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Normal Limit</p>
                  <p className="text-2xl font-black text-gray-900 mt-2">
                    {selectedTest.referenceRange.text || `${selectedTest.referenceRange.min} — ${selectedTest.referenceRange.max}`}
                  </p>
                </div>
              </div>

              <div className="mb-12">
                 <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analysis Range</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${STATUS_TEXT_CLASSES[selectedTest.status]}`}>{selectedTest.status} Assessment</span>
                 </div>
                 <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-red-400" style={{ width: '20%' }} />
                    <div className="h-full bg-emerald-400" style={{ width: '60%' }} />
                    <div className="h-full bg-red-400" style={{ width: '20%' }} />
                 </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clinical Guidance</h4>
                <div className="bg-teal-50/50 p-8 rounded-[32px] border border-teal-100/50 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-2 h-full bg-teal-500" />
                  <p className="text-sm font-bold text-teal-900 leading-relaxed italic">
                    "This measurement provides a snapshot of your physiological state. While AI analysis highlights key trends, all medical results should be reviewed with your primary healthcare provider."
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 bg-slate-50/50 p-12 border-l border-gray-100">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-12 text-center">Historical Timeline</h4>
              <div className="space-y-10 relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200" />
                {groupedTests[selectedTest.testName]?.history.map((h, idx) => (
                  <div key={h.id} className="relative pl-10 group/item">
                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all ${STATUS_DOT_CLASSES[h.status]} ${h.id === selectedTest.id ? 'scale-125 ring-2 ring-teal-100' : ''}`} />
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black text-gray-900 tracking-tight">
                          {h.value} <span className="text-[9px] text-gray-400 uppercase tracking-normal">{h.unit}</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        {h.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Feedback/Report Modal */}
      {selectedFeedback && (
         <Modal
            isOpen={!!selectedFeedback}
            onClose={() => setSelectedFeedback(null)}
            contentClassName="p-0 overflow-hidden rounded-[40px] max-w-5xl"
         >
            <div className="flex flex-col">
               {/* Modal Header */}
               <div className="p-10 bg-white border-b border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                     <div>
                        <div className="flex items-center gap-3 mb-3">
                           <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] bg-teal-50 px-3 py-1 rounded-lg">
                              {new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                           </span>
                           <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
                              {new Date(selectedFeedback.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        
                        {editingFeedbackId === selectedFeedback.id ? (
                           <input 
                              autoFocus
                              className="text-4xl font-black text-gray-900 bg-gray-50 border-b-4 border-teal-500 outline-none w-full py-1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRenameFeedback(selectedFeedback.id)}
                              onBlur={() => setEditingFeedbackId(null)}
                           />
                        ) : (
                           <div className="flex items-center gap-4 group/title">
                              <h3 className="text-4xl font-black text-gray-900 tracking-tight leading-none">{selectedFeedback.condition}</h3>
                              <button 
                                 onClick={() => {
                                    setEditingFeedbackId(selectedFeedback.id);
                                    setEditValue(selectedFeedback.condition);
                                 }}
                                 className="opacity-0 group-hover/title:opacity-100 p-2 text-gray-300 hover:text-teal-600 hover:bg-teal-50 rounded-2xl transition-all"
                              >
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                           </div>
                        )}
                     </div>

                     <div className="flex items-center gap-4">
                        <div className={`px-6 py-2.5 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest shadow-sm ${
                           selectedFeedback.riskLevel === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                           selectedFeedback.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                           {selectedFeedback.riskLevel} Health Risk
                        </div>
                        <button 
                           onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                           className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                        >
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                     </div>
                  </div>
               </div>

               {/* Modal Body */}
               <div className="p-12 bg-slate-50/30 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                     {/* Left Column: Recommendations */}
                     <div className="lg:col-span-2 space-y-10">
                        <section>
                           <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">AI Health Recommendations</h4>
                           <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 leading-relaxed text-gray-700 font-bold text-lg">
                              {selectedFeedback.recommendations}
                           </div>
                        </section>

                        <section>
                           <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Extracted Biomarkers</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {selectedFeedback.labTests?.map((t: LabTest) => (
                                 <div 
                                    key={t.id} 
                                    onClick={() => setSelectedTest(t)}
                                    className="bg-white p-6 rounded-[24px] border border-gray-100 hover:border-teal-500 shadow-sm transition-all cursor-pointer group"
                                 >
                                    <div className="flex justify-between items-center mb-3">
                                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.category}</span>
                                       <div className={`w-2 h-2 rounded-full ${STATUS_DOT_CLASSES[t.status]}`} />
                                    </div>
                                    <p className="text-lg font-black text-gray-900 group-hover:text-teal-600 transition-colors">{t.testName}</p>
                                    <div className="mt-4 flex items-baseline gap-2">
                                       <span className="text-2xl font-black text-gray-900">{t.value}</span>
                                       <span className="text-[11px] font-bold text-gray-400 uppercase">{t.unit}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </section>
                     </div>

                     {/* Right Column: Medications & Summary */}
                     <div className="space-y-10">
                        <section>
                           <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Medication Warnings</h4>
                           <div className="space-y-3">
                              {selectedFeedback.relatedMedicines?.map((med: string, i: number) => (
                                 <div key={i} className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                       <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <span className="text-sm font-black text-amber-800">{med}</span>
                                 </div>
                              ))}
                           </div>
                        </section>

                        <section className="bg-teal-600 p-8 rounded-[40px] text-white shadow-xl shadow-teal-600/20">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 opacity-60">Session Summary</h4>
                           <p className="text-sm font-bold leading-relaxed">
                              This analysis was generated on {new Date(selectedFeedback.createdAt).toLocaleDateString()} for clinical review. All extracted data is stored in your permanent medical history.
                           </p>
                           <div className="mt-8 flex justify-between items-end">
                              <div>
                                 <p className="text-2xl font-black">{selectedFeedback.labTests?.length}</p>
                                 <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Parameters</p>
                              </div>
                              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </div>
                           </div>
                        </section>
                     </div>
                  </div>
               </div>
            </div>
         </Modal>
      )}
    </div>
  );
}

export default LabResultsPage;
