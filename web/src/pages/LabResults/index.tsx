import { useMemo, useState, useEffect, useCallback, Fragment } from 'react';
import type { LabTest, LabStatus } from '../../services/medicalApi';
import { useAiUpload } from '../../contexts/AiUploadContext';
import { useLabFeedbacks, useLabTests } from '../../hooks/useLabTests';
import { medicalApi } from '../../services/medicalApi';
import toast from 'react-hot-toast';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Button } from '../../components/ui/Button';
import { getLabDefinition } from '../../lib/labDictionary';

/**
 * Aethea - Lab Results Page (Web)
 * Enterprise-level analysis dashboard - Progressive Disclosure Layout
 */

const STATUS_BADGE_CLASSES: Record<LabStatus, string> = {
  normal: 'bg-emerald-50/70 text-emerald-700',
  borderline: 'bg-amber-50/70 text-amber-700',
  high: 'bg-amber-50/70 text-amber-700',
  low: 'bg-blue-50/70 text-blue-700',
};

const STATUS_DOT_CLASSES: Record<LabStatus, string> = {
  normal: 'bg-emerald-500',
  borderline: 'bg-amber-500',
  high: 'bg-amber-500', // unified warning color
  low: 'bg-blue-500',
};

const getSafeTime = (dateVal?: any) => {
  if (!dateVal) return 0;
  const t = new Date(dateVal).getTime();
  return isNaN(t) ? 0 : t;
};

function LabResultsPage() {
  const { labTests, loading: testsLoading, error: testsError, refresh: refreshTests } = useLabTests();
  const { feedbacks, loading: feedbacksLoading, refresh: refreshFeedbacks } = useLabFeedbacks();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  const { isUploading, status, elapsedSeconds, setIsModalOpen } = useAiUpload();

  const formatSessionTime = (createdAt: string, updatedAt?: string) => {
    try {
      const start = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!updatedAt) return start;
      const end = new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return start === end ? start : `${start} - ${end}`;
    } catch {
      return '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    
    const handleViewFeedback = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { feedbackId } = customEvent.detail;
      const feedback = feedbacks.find((fb: any) => fb.id === feedbackId);
      if (feedback) {
        setSelectedFeedback(feedback);
        setSelectedCategory('all');
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('lab-data-refresh', handleRefresh);
    window.addEventListener('view-feedback', handleViewFeedback);
    return () => {
      window.removeEventListener('lab-data-refresh', handleRefresh);
      window.removeEventListener('view-feedback', handleViewFeedback);
    };
  }, [loadData, feedbacks]);

  const handleDeleteFeedback = async (id: string) => {
    setIsDeleting(true);
    try {
      await medicalApi.deleteLabFeedback(id);
      loadData();
      if (selectedFeedback?.id === id) {
         setSelectedFeedback(null);
      }
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    } finally {
      setIsDeleting(false);
      setConfirmingDeleteId(null);
    }
  };

  const groupedTests = useMemo(() => {
    const groups: Record<string, { latest: LabTest; history: LabTest[] }> = {};
    labTests.forEach((t) => {
      if (!groups[t.testName]) {
        groups[t.testName] = { latest: t, history: [] };
      }
      groups[t.testName].history.push(t);
      if (getSafeTime(t.date) > getSafeTime(groups[t.testName].latest.date)) {
        groups[t.testName].latest = t;
      }
    });
    Object.values(groups).forEach(g => {
      g.history.sort((a, b) => getSafeTime(b.date) - getSafeTime(a.date));
    });
    return groups;
  }, [labTests]);

  // Filter tests based on the selected feedback session OR global if no session selected
  const activeTests = useMemo<LabTest[]>(() => {
    if (selectedFeedback) {
      return selectedFeedback.labTests || [];
    }
    return labTests;
  }, [labTests, selectedFeedback]);

  const categories = useMemo<string[]>(
    () => ['all', ...Array.from(new Set(activeTests.map((t: LabTest) => t.category)))],
    [activeTests]
  );

  const labMetrics = useMemo(() => {
    if (labTests.length === 0) return { normal: 0, borderline: 0, abnormal: 0 };
    const normal = labTests.filter((t: LabTest) => t.status === 'normal').length;
    const borderline = labTests.filter((t: LabTest) => t.status === 'borderline').length;
    const abnormal = labTests.filter((t: LabTest) => t.status === 'high' || t.status === 'low').length;
    const total = labTests.length;
    return {
      normal: Math.round((normal / total) * 100),
      borderline: Math.round((borderline / total) * 100),
      abnormal: Math.round((abnormal / total) * 100),
    };
  }, [labTests]);

  const filteredTests = useMemo(() => {
    const base = selectedCategory === 'all'
      ? activeTests
      : activeTests.filter((t: LabTest) => t.category === selectedCategory);

    // If viewing a specific feedback session, preserve extraction order (do not sort by date)
    if (selectedFeedback) {
      return base;
    }

    // Otherwise (Global Hub view), sort by newest first
    return [...base].sort((a: LabTest, b: LabTest) => getSafeTime(b.date) - getSafeTime(a.date));
  }, [activeTests, selectedCategory, selectedFeedback]);

  const detailStats = useMemo(() => {
    if (!selectedFeedback) return null;
    const tests = selectedFeedback.labTests || [];
    const normal = tests.filter((t: any) => t.status === 'normal').length;
    const borderline = tests.filter((t: any) => t.status === 'borderline').length;
    const high = tests.filter((t: any) => t.status === 'high').length;
    const low = tests.filter((t: any) => t.status === 'low').length;
    
    const cats = Array.from(new Set(tests.map((t: any) => t.category))) as string[];
    
    return {
      total: tests.length,
      normal,
      abnormal: borderline + high + low,
      categories: cats.map(cat => ({
        name: cat,
        count: tests.filter((t: any) => t.category === cat).length
      }))
    };
  }, [selectedFeedback]);

  const handleBackToHub = () => {
    setSelectedFeedback(null);
    setSelectedCategory('all');
    setSelectedTest(null);
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-100px)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-sand-500">Loading your health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-100 rounded-lg p-8 text-center">
          <p className="text-sm font-bold text-red-600">Failed to load lab results: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full relative min-h-full">
        {/* INLINE AI PROGRESS BANNER */}
        {isUploading && (
          <div className="max-w-5xl mx-auto px-10 pt-10 pb-2">
            <div className="bg-sand-50/80 backdrop-blur-sm border border-sand-200 p-6 rounded-2xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 fade-in duration-500">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-amber-600 relative overflow-hidden shadow-sm">
                  <div className="absolute inset-0.5 border-[3px] border-sand-200 border-t-nescafe animate-spin rounded-full" />
                  <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-sand-900 tracking-tight">
                    {status === 'starting' || status === 'downloaded' || status === 'analyzing' || status === 'extracting' ? 'Working...' : status === 'saving' ? 'Almost done...' : 'Processing Document...'}
                  </h3>
                  <p className="text-sm font-medium text-sand-500">Please wait while the AI analyzes your document.</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-1">Time Elapsed</span>
                <span className="text-xl font-mono font-bold text-sand-900">{formatTime(elapsedSeconds)}</span>
              </div>
            </div>
          </div>
        )}

        {!selectedFeedback ? (
          // GLOBAL OVERVIEW STATE (HUB)
          <div className="max-w-5xl mx-auto p-10 space-y-12">
            <FeatureHeader 
              title="Lab Reports" 
              subtitle="A comprehensive view of your health data and AI analysis."
            >
              <Button 
                variant="primary" 
                className="rounded-full"
                onClick={() => setIsModalOpen(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Upload New Report
              </Button>
            </FeatureHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="col-span-1 bg-surface-card border border-sand-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center text-sand-900 bg-olive-50 rounded-full">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-sand-900">{labTests.length}</p>
                  <p className="text-sm text-sand-600 font-medium">Total Individual Tests</p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 bg-surface-card border border-sand-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-sand-900 mb-4 uppercase tracking-wider">Overall Lab Health</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-xs font-semibold text-sand-500 uppercase">Normal</span>
                    <div className="flex-1 h-2 w-full rounded-full bg-sand-200 overflow-hidden">
                      <div className="h-full bg-sand-400 rounded-full transition-all duration-1000" style={{ width: `${labMetrics.normal}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-sand-600">{labMetrics.normal}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-xs font-semibold text-sand-500 uppercase">Borderline</span>
                    <div className="flex-1 h-2 w-full rounded-full bg-sand-200 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${labMetrics.borderline}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-amber-600">{labMetrics.borderline}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-20 text-xs font-semibold text-sand-500 uppercase">Abnormal</span>
                    <div className="flex-1 h-2 w-full rounded-full bg-sand-200 overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-1000" style={{ width: `${labMetrics.abnormal}%` }}></div>
                    </div>
                    <span className="w-8 text-right text-sm font-bold text-rose-600">{labMetrics.abnormal}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-sand-900 mb-6">Past Reports</h2>
              {feedbacks.length === 0 ? (
                <div className="text-center p-10 bg-surface-card rounded-2xl border border-sand-100 border-dashed">
                  <p className="text-sm font-medium text-sand-500">No reports uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...feedbacks].sort((a: any, b: any) => getSafeTime(b.createdAt) - getSafeTime(a.createdAt)).map((fb: any) => (
                    <div 
                      key={fb.id}
                      onClick={() => { setSelectedFeedback(fb); setSelectedCategory('all'); }}
                      className="group bg-surface-card p-6 rounded-2xl cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-sand-200 flex flex-col justify-between min-h-[160px]"
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1 pr-2">
                             <span className="text-base font-bold text-sand-900 group-hover:text-amber-600 transition-colors">
                               Lab Report - {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </span>
                             <span className="text-xs font-medium text-sand-500">
                               {formatSessionTime(fb.createdAt, fb.updatedAt)}
                             </span>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${
                            fb.riskLevel === 'high' ? 'bg-amber-500' :
                            fb.riskLevel === 'medium' ? 'bg-amber-400' :
                            'bg-emerald-500'
                          } shadow-sm`} />
                       </div>
                       <div>
                          <p className="text-sm font-medium text-sand-500">{fb.labTests?.length || 0} biomarkers extracted</p>
                          <div className="mt-4 flex items-center text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0">
                            View Details <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : selectedFeedback ? (
          // INTEGRATED FULL ANALYSIS VIEW (DETAIL)
          <div className="max-w-5xl mx-auto p-10 space-y-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-sand-100 pb-10">
               <div className="flex-1">
                  <button 
                     onClick={handleBackToHub}
                     className="flex items-center text-sm font-bold text-sand-500 hover:text-sand-900 transition-colors mb-6 group/back"
                  >
                     <svg className="w-4 h-4 mr-2 group-hover/back:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                     Back to All Reports
                  </button>

                  <div className="flex items-center gap-4 mb-4">
                     <span className="text-xs font-semibold text-sand-700 bg-sand-100 px-3 py-1 rounded-full">
                        {new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                     </span>
                     <div className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase shadow-sm ${
                        selectedFeedback.riskLevel === 'high' ? 'bg-amber-50/70 text-amber-700' :
                        selectedFeedback.riskLevel === 'medium' ? 'bg-amber-50/70 text-amber-600' :
                        'bg-emerald-50/70 text-emerald-700'
                     }`}>
                        {selectedFeedback.riskLevel} Health Risk
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 group/title">
                     <h1 className="text-4xl font-bold text-sand-900 tracking-tight leading-none">
                        Lab Report - {new Date(selectedFeedback.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                     </h1>
                     <span className="text-sm font-semibold text-sand-500">
                        {formatSessionTime(selectedFeedback.createdAt, selectedFeedback.updatedAt)}
                     </span>
                  </div>
               </div>
               
               <div className="flex gap-2">
                 {confirmingDeleteId === selectedFeedback.id ? (
                   <>
                     <button
                       onClick={() => handleDeleteFeedback(selectedFeedback.id)}
                       disabled={isDeleting}
                       className="p-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-50"
                     >
                       Yes, Delete
                     </button>
                     <button
                       onClick={() => setConfirmingDeleteId(null)}
                       disabled={isDeleting}
                       className="p-2 text-xs font-bold text-sand-600 bg-sand-50 hover:bg-sand-100 rounded-lg transition-all disabled:opacity-50"
                     >
                       Cancel
                     </button>
                   </>
                 ) : (
                   <button 
                      onClick={() => setConfirmingDeleteId(selectedFeedback.id)}
                      disabled={isDeleting}
                      className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all shrink-0 disabled:opacity-50"
                      title="Delete Report"
                   >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                 )}
               </div>
            </div>

            {/* Report Overview Stats */}
            {detailStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                 <div className="col-span-1 bg-surface-card rounded-2xl p-8 shadow-sm">
                   <p className="text-sm font-semibold text-sand-500 mb-2">Total Results</p>
                   <p className="text-5xl font-bold text-sand-900 leading-none mb-8">{detailStats.total}</p>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/50 rounded-xl">
                        <span className="text-lg font-bold text-emerald-600">{detailStats.normal}</span>
                        <span className="text-xs font-semibold text-emerald-600">Normal</span>
                     </div>
                     <div className="flex items-center justify-between px-4 py-3 bg-amber-50/50 rounded-xl">
                        <span className="text-lg font-bold text-amber-600">{detailStats.abnormal}</span>
                        <span className="text-xs font-semibold text-amber-600">Abnormal</span>
                     </div>
                   </div>
                 </div>

                 <div className="col-span-2 bg-surface-card rounded-2xl p-8 shadow-sm">
                    <h3 className="text-sm font-semibold text-sand-500 mb-6">Biomarker Categories</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {detailStats.categories.map(({ name, count }) => (
                          <div key={name} className="p-4 bg-sand-50/50 rounded-xl flex justify-between items-center">
                             <span className="text-sm font-bold text-sand-900 truncate pr-4">{name}</span>
                             <span className="text-xs font-semibold text-sand-500 bg-surface px-2 py-1 rounded-md">
                                {count}
                             </span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}



            {/* Detailed Table Section */}
            <div className="pb-10">
               <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
                  <h4 className="text-lg font-bold text-sand-900">Extracted Biomarkers</h4>
                  
                  {/* Inline Category Filter */}
                  <div className="flex items-center bg-surface-card p-1 rounded-full shadow-sm">
                     {categories.map(category => (
                        <button
                           key={category}
                           onClick={() => setSelectedCategory(category)}
                           className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                              selectedCategory === category
                                 ? 'bg-sand-800 text-sand-50'
                                 : 'text-sand-500 hover:text-sand-900'
                           }`}
                        >
                           {category === 'all' ? 'All' : category}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="bg-surface-card rounded-2xl overflow-hidden shadow-sm">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-surface/50">
                         <th className="px-8 py-5 text-xs font-semibold text-sand-500 uppercase">Biomarker</th>
                         <th className="px-8 py-5 text-xs font-semibold text-sand-500 uppercase text-center">Result</th>
                         <th className="px-8 py-5 text-xs font-semibold text-sand-500 uppercase text-center">Normal Limits</th>
                         <th className="px-8 py-5 text-xs font-semibold text-sand-500 uppercase text-center">Assessment</th>
                         <th className="px-8 py-5 text-xs font-semibold text-sand-500 uppercase text-right">Date</th>
                         <th className="px-6 py-5"></th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-sand-50">
                       {filteredTests.map((test: LabTest) => {
                         const def = getLabDefinition(test.testName);
                         const isExpanded = expandedRowId === test.id;
                         
                         return (
                           <Fragment key={test.id}>
                             <tr 
                               onClick={() => setExpandedRowId(isExpanded ? null : test.id)}
                               className={`group transition-all cursor-pointer ${isExpanded ? 'bg-sand-50/50' : 'hover:bg-sand-50/50'}`}
                             >
                               <td className="px-8 py-6">
                                 <p className="text-sm font-bold text-sand-900">{test.testName}</p>
                                 <p className="text-xs font-medium text-sand-400 mt-1">{test.category}</p>
                               </td>
                               <td className="px-8 py-6 text-center">
                                 <div className="flex items-baseline justify-center gap-1.5">
                                   <span className="text-lg font-bold text-sand-900 tracking-tight">{test.value}</span>
                                   <span className="text-xs font-medium text-sand-400">{test.unit}</span>
                                 </div>
                               </td>
                               <td className="px-8 py-6 text-center">
                                  <span className="text-xs font-medium text-sand-500 bg-surface px-3 py-1 rounded-full">
                                     {test.referenceRange ? (test.referenceRange.text || `${test.referenceRange.min ?? ''} — ${test.referenceRange.max ?? ''}`) : 'N/A'}
                                  </span>
                               </td>
                               <td className="px-8 py-6 text-center">
                                 <div className={`mx-auto w-fit px-4 py-1.5 rounded-full text-xs font-semibold uppercase ${STATUS_BADGE_CLASSES[test.status]} shadow-sm`}>
                                   {test.status}
                                 </div>
                               </td>
                               <td className="px-8 py-6 whitespace-nowrap text-right">
                                 <div className="text-xs font-semibold text-sand-900">
                                   {test.date && !isNaN(new Date(test.date).getTime()) 
                                     ? new Date(test.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                     : <span className="text-sand-400 italic">Date is missing</span>}
                                 </div>
                               </td>
                               <td className="px-6 py-6 text-right">
                                 <svg className={`w-5 h-5 text-sand-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                 </svg>
                               </td>
                             </tr>
                             
                             {isExpanded && (
                               <tr className="bg-sand-50/50 border-b border-sand-100">
                                 <td colSpan={6} className="px-8 pb-6 pt-0">
                                   <div className="flex flex-col gap-4 max-w-3xl animate-in slide-in-from-top-2 fade-in duration-300">
                                      {def ? (
                                        <div className="bg-white p-5 rounded-xl border border-sand-200 shadow-sm">
                                          <h4 className="text-xs font-bold uppercase tracking-wider text-sand-500 mb-2">What is {def.title}?</h4>
                                          <p className="text-sm text-sand-800 leading-relaxed">{def.definition}</p>
                                          
                                          {test.status === 'low' && def.low && (
                                            <p className="mt-3 text-sm font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">↓ {def.low}</p>
                                          )}
                                          {test.status === 'high' && def.high && (
                                            <p className="mt-3 text-sm font-semibold text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">↑ {def.high}</p>
                                          )}
                                          {(test.status === 'borderline') && (def.low || def.high) && (
                                            <p className="mt-3 text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                                              Your result is borderline. Keeping this within normal limits is important for your health.
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="bg-white p-5 rounded-xl border border-sand-200 border-dashed">
                                          <p className="text-sm text-sand-500 italic">No detailed explanation available for this biomarker.</p>
                                        </div>
                                      )}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedTest(test); }}
                                        className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 w-fit ml-2"
                                      >
                                        View Historical Timeline <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                      </button>
                                   </div>
                                 </td>
                               </tr>
                             )}
                           </Fragment>
                         );
                       })}
                       {filteredTests.length === 0 && (
                          <tr>
                             <td colSpan={6} className="px-8 py-12 text-center text-sm font-medium text-sand-400">
                                No biomarkers found for this category.
                             </td>
                          </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* OVERLAY FOR SIDE DRAWER */}
      {selectedTest && (
         <div 
            className="fixed inset-0 bg-sand-900/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedTest(null)}
         />
      )}

      {/* SLIDE-OUT DRAWER FOR TEST DETAILS */}
      <div 
         className={`fixed inset-y-0 right-0 w-full md:w-[480px] bg-surface-card shadow-2xl transition-transform duration-300 ease-in-out z-50 overflow-y-auto border-l border-sand-100 ${
            selectedTest ? 'translate-x-0' : 'translate-x-full'
         }`}
      >
         {selectedTest && (
            <div className="flex flex-col h-full">
               {/* Drawer Header */}
               <div className="p-8 border-b border-sand-100 bg-surface/50 sticky top-0 z-10 flex justify-between items-start">
                  <div>
                     <span className="text-xs font-semibold text-sand-500 uppercase block mb-3">Biomarker Details</span>
                     <h2 className="text-3xl font-bold text-sand-900 tracking-tight leading-none mb-4">{selectedTest.testName}</h2>
                     <div className={`w-fit px-4 py-1.5 rounded-full text-xs font-semibold uppercase shadow-sm ${STATUS_BADGE_CLASSES[selectedTest.status]}`}>
                        {selectedTest.status} Assessment
                     </div>
                  </div>
                  <button 
                     onClick={() => setSelectedTest(null)}
                     className="p-2 text-sand-400 hover:text-sand-900 bg-surface rounded-full shadow-sm transition-all"
                  >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>

               {/* Drawer Content */}
               <div className="p-8 space-y-10 flex-1">
                  
                  {/* Result vs Normal Limits */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-surface p-6 rounded-2xl shadow-sm">
                        <p className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-2">Result</p>
                        <p className="text-3xl font-bold text-sand-900">
                           {selectedTest.value}
                           <span className="text-base text-sand-400 ml-1 font-bold">{selectedTest.unit}</span>
                        </p>
                     </div>
                     <div className="bg-surface p-6 rounded-2xl shadow-sm">
                        <p className="text-xs font-semibold text-sand-400 uppercase tracking-wider mb-2">Limit</p>
                        <p className="text-lg font-bold text-sand-900 mt-2">
                           {selectedTest.referenceRange ? (selectedTest.referenceRange.text || `${selectedTest.referenceRange.min ?? ''} — ${selectedTest.referenceRange.max ?? ''}`) : 'N/A'}
                        </p>
                     </div>
                  </div>

                  {/* Visual Analysis Scale */}
                  <div>
                     <div className="flex justify-between mb-3">
                        <span className="text-xs font-semibold text-sand-500 uppercase">Analysis Range</span>
                     </div>
                     <div className="h-3 w-full bg-sand-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-amber-300" style={{ width: '20%' }} />
                        <div className="h-full bg-emerald-300" style={{ width: '60%' }} />
                        <div className="h-full bg-amber-300" style={{ width: '20%' }} />
                     </div>
                  </div>

                  {/* Clinical Guidance */}
                  <div>
                     <h4 className="text-xs font-semibold text-sand-500 uppercase mb-3">Clinical Guidance</h4>
                     <div className="bg-sand-50/50 p-6 rounded-2xl">
                        <p className="text-sm font-medium text-sand-700 leading-relaxed italic">
                           "This measurement provides a snapshot of your physiological state. While AI analysis highlights key trends, all medical results should be reviewed with your primary healthcare provider."
                        </p>
                     </div>
                  </div>

                  {/* Historical Timeline */}
                  <div>
                     <h4 className="text-xs font-semibold text-sand-500 uppercase mb-6">Historical Timeline</h4>
                     <div className="space-y-6 relative pl-4">
                        <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-sand-200" />
                        {groupedTests[selectedTest.testName]?.history.map((h) => (
                           <div key={h.id} className="relative pl-10 group/item">
                              <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all ${STATUS_DOT_CLASSES[h.status]} ${h.id === selectedTest.id ? 'scale-125 ring-2 ring-sand-100' : ''}`} />
                              <div className="flex flex-col gap-1">
                                 <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-sand-900 tracking-tight">
                                       {h.value} <span className="text-xs text-sand-400 ml-1">{h.unit}</span>
                                    </span>
                                 </div>
                                 <span className="text-xs font-medium text-sand-500">
                                    {h.date && !isNaN(new Date(h.date).getTime())
                                       ? new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                       : <span className="text-sand-400 italic">Date is missing</span>}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>

    </>
  );
}

export default LabResultsPage;
