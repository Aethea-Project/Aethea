import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import type { PatientHealthData } from '../services/medicalApi';

interface HealthDossierViewerProps {
  healthData: PatientHealthData | null;
  loadingHealthData: boolean;
  healthDataError: string | null;
  healthFolderUnlocked: boolean;
  onAccessData: () => void;
  sharedByPatient: boolean;
}

export function HealthDossierViewer({
  healthData,
  loadingHealthData,
  healthDataError,
  healthFolderUnlocked,
  onAccessData,
  sharedByPatient,
}: HealthDossierViewerProps) {
  const [healthTab, setHealthTab] = useState<'labs' | 'scans' | 'ai'>('labs');
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);

  const toggleLabExpand = (id: string) => {
    setExpandedLabId(prev => prev === id ? null : id);
  };

  if (!sharedByPatient) {
    return (
      <Card className="border-transparent bg-sand-50/30 p-6 text-center border-dashed mt-6">
        <p className="text-xs text-sand-500 italic">
          Patient has not checked the record-sharing toggle for this appointment. General historical medical records are strictly locked.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-transparent overflow-hidden mt-6 shadow-sm">
      <CardHeader className="py-4 px-6 flex flex-row justify-between items-center gap-3 bg-surface-card border-b border-sand-200">
        <div className="flex items-center gap-2 text-aethea-950">
          <svg className="h-5 w-5 shrink-0 text-sand-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-serif text-lg font-semibold tracking-tight">Decrypted Health Dossier</span>
        </div>
        
        {!healthFolderUnlocked && !loadingHealthData && (
          <Button 
            variant="outline" 
            onClick={onAccessData}
          >
            Access Folder
          </Button>
        )}
        {loadingHealthData && (
          <span className="text-xs text-sand-500 font-semibold animate-pulse">Decrypting dossier files...</span>
        )}
      </CardHeader>

      {healthDataError && (
        <CardContent className="p-6 bg-red-50/30 text-xs text-red-700 leading-relaxed border-t border-red-100">
          {healthDataError}
        </CardContent>
      )}

      {healthFolderUnlocked && healthData && (
        <div>
          {/* Tab Headers */}
          <div className="flex border-b border-sand-200 bg-sand-50/40 px-4 text-xs font-semibold text-sand-500">
            <button
              type="button"
              className={`px-4 py-3 border-b-2 transition-colors focus:outline-none ${
                healthTab === 'labs' 
                  ? 'border-olive-600 text-sand-900 font-bold' 
                  : 'border-transparent hover:text-sand-900'
              }`}
              onClick={() => setHealthTab('labs')}
            >
              Lab Panels ({healthData.feedbacks?.length ?? 0})
            </button>
            <button
              type="button"
              className={`px-4 py-3 border-b-2 transition-colors focus:outline-none ${
                healthTab === 'scans' 
                  ? 'border-olive-600 text-sand-900 font-bold' 
                  : 'border-transparent hover:text-sand-900'
              }`}
              onClick={() => setHealthTab('scans')}
            >
              Imaging Scans ({healthData.scans?.length ?? 0})
            </button>
            <button
              type="button"
              className={`px-4 py-3 border-b-2 transition-colors focus:outline-none ${
                healthTab === 'ai' 
                  ? 'border-olive-600 text-sand-900 font-bold' 
                  : 'border-transparent hover:text-sand-900'
              }`}
              onClick={() => setHealthTab('ai')}
            >
              AI Conditions ({healthData.conditions?.length ?? 0})
            </button>
          </div>

          <CardContent className="p-6">
            {/* Tabs Content: Labs */}
            {healthTab === 'labs' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {healthData.feedbacks && healthData.feedbacks.length > 0 ? (
                  <div className="space-y-4">
                    {healthData.feedbacks.map((fb) => (
                      <div key={fb.id} className="bg-white border border-sand-200 rounded-xl overflow-hidden shadow-sm transition-all">
                        <div 
                          className="p-4 border-b border-sand-100 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-sand-50/50"
                          onClick={() => toggleLabExpand(fb.id)}
                        >
                          <div>
                            <h4 className="font-bold text-sand-900 text-sm flex items-center gap-2">
                              Lab Report - {new Date(fb.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              <svg className={`w-4 h-4 text-sand-400 transition-transform ${expandedLabId === fb.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </h4>
                            <p className="text-xs text-sand-500 mt-1">{fb.labTests?.length || 0} biomarkers extracted</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                               fb.riskLevel === 'high' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                               fb.riskLevel === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                               'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {fb.riskLevel} Risk
                            </span>
                            {/* Removed hallucinated pdfUrl button since the backend doesn't store/serve original lab PDF urls for viewing */}
                          </div>
                        </div>
                        {expandedLabId === fb.id && fb.labTests && fb.labTests.length > 0 && (
                          <div className="divide-y divide-sand-100 bg-sand-50/20 max-h-[400px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                            {fb.labTests.map((lab) => (
                              <div key={lab.id} className="p-3 flex justify-between items-center text-xs hover:bg-sand-50/50 transition-colors">
                                <div>
                                  <p className="font-semibold text-sand-900">{lab.testName}</p>
                                  <p className="text-[9px] font-bold text-sand-400 uppercase tracking-widest mt-0.5">{lab.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sand-900">
                                    {lab.value} <span className="text-sand-500 font-medium">{lab.unit}</span>
                                  </p>
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 uppercase tracking-wider ${
                                    lab.status === 'high' || lab.status === 'low' || lab.status === 'borderline'
                                      ? 'text-red-600 bg-red-50'
                                      : 'text-sand-500 bg-sand-100/50'
                                  }`}>
                                    {lab.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-sand-500 text-center py-6">No historical lab reports decrypted.</p>
                )}
              </div>
            )}

            {/* Tabs Content: Scans */}
            {healthTab === 'scans' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {healthData.scans && healthData.scans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {healthData.scans.map((scan) => (
                      <div key={scan.id} className="flex flex-col bg-white rounded-xl border border-sand-200 overflow-hidden hover:shadow-sm transition-shadow">
                        <div className="p-4 border-b border-sand-100 flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-sand-400">Imaging &bull; {scan.type}</span>
                            <p className="font-semibold text-sand-900 text-sm mt-1">Medical Scan</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                            scan.priority === 'urgent' 
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-sand-100 text-sand-700 border border-sand-200'
                          }`}>
                            {scan.priority} Priority
                          </span>
                        </div>
                        <div className="p-4 bg-sand-50/30 flex-1">
                          <p className="text-xs text-sand-700 line-clamp-3 leading-relaxed">
                            <span className="font-bold text-sand-900">Findings: </span>
                            {scan.findings ?? 'Awaiting findings report...'}
                          </p>
                        </div>
                        <div className="p-3 bg-sand-50/80 border-t border-sand-100 flex gap-2">
                          {scan.fileUrl && (
                            <button
                              onClick={() => window.open(scan.fileUrl, '_blank')}
                              className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-white hover:bg-sand-50 text-sand-700 text-xs font-semibold rounded border border-sand-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              View Image
                            </button>
                          )}
                          {scan.reportUrl && (
                            <button
                              onClick={() => window.open(scan.reportUrl, '_blank')}
                              className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-white hover:bg-sand-50 text-sand-700 text-xs font-semibold rounded border border-sand-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              AI Report
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-sand-500 text-center py-6">No imaging scan folders found.</p>
                )}
              </div>
            )}

            {/* Tabs Content: AI Diagnosed Conditions */}
            {healthTab === 'ai' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {healthData.conditions && healthData.conditions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-sand-50 border border-sand-200 text-xs text-sand-600 leading-relaxed flex items-start gap-2">
                      <svg className="h-4 w-4 text-sand-900 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>AI warnings are processed locally using localized medical models over the patient's decrypted biomarkers. Always verify clinically.</span>
                    </div>
                    <div className="divide-y divide-sand-150 border border-sand-200 rounded-lg overflow-hidden bg-white">
                      {healthData.conditions.map((c) => (
                        <div key={c.id} className="p-3 flex justify-between items-center text-sm hover:bg-sand-50/30 transition-colors">
                          <div>
                            <p className="font-semibold text-sand-900">{c.condition}</p>
                            <p className="text-[10px] text-sand-400 mt-0.5">Source: {c.source}</p>
                          </div>
                          <span className="text-[10px] font-bold text-sand-500">
                            {new Date(c.detectedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-sand-500 text-center py-6">No auto-detected biomarkers flagged by local AI engine.</p>
                )}
              </div>
            )}
          </CardContent>
        </div>
      )}
    </Card>
  );
}
