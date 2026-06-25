import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import type { WeeklyTemplateInput } from '../../../services/medicalApi';
import { CloseIcon, CheckIcon, AlertTriangleIcon, PinIcon } from '../../../components/Icons';

interface SavedClinic {
  id: string;
  clinicName: string;
  city: string;
  consultFee: number;
  address: string;
  locationUrl: string;
}

interface PublishWizardProps {
  isOpen: boolean;
  onClose: () => void;
  clinicsList: SavedClinic[];
  templateFormState: WeeklyTemplateInput[];
  DAYS_OF_WEEK: { value: number; label: string }[];
  saveTemplates: (templates: WeeklyTemplateInput[]) => Promise<unknown>;
  generateSchedules: (weeksAhead: number) => Promise<{ created: number; skipped: number }>;
  onSuccess: () => void;
}

export function PublishWizard({
  isOpen,
  onClose,
  clinicsList,
  templateFormState,
  DAYS_OF_WEEK,
  saveTemplates,
  generateSchedules,
  onSuccess,
}: PublishWizardProps) {
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardSelectedClinicId, setWizardSelectedClinicId] = useState<string>('');
  const [wizardWeeksAhead, setWizardWeeksAhead] = useState(4);
  const [wizardPublishing, setWizardPublishing] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccessMessage, setWizardSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWizardStep(1);
      setWizardSelectedClinicId(clinicsList[0]?.id || '');
      setWizardWeeksAhead(4);
      setWizardError(null);
      setWizardSuccessMessage(null);
    }
  }, [isOpen, clinicsList]);

  if (!isOpen) return null;

  const activeTemplates = templateFormState.filter((t) => t.isActive);
  const selectedClinic = clinicsList.find((c) => c.id === wizardSelectedClinicId);

  const handlePublishFromWizard = async () => {
    if (!selectedClinic) {
      setWizardError('Please select a clinic to schedule.');
      return;
    }
    if (activeTemplates.length === 0) {
      setWizardError('Please configure and enable at least one template day in your settings before generating.');
      return;
    }

    setWizardPublishing(true);
    setWizardError(null);
    try {
      const updatedTemplates = templateFormState.map((t) => {
        if (t.isActive) {
          return {
            ...t,
            clinicInfo: {
              id: selectedClinic.id,
              clinicName: selectedClinic.clinicName,
              city: selectedClinic.city,
              consultFee: selectedClinic.consultFee,
              address: selectedClinic.address,
              locationUrl: selectedClinic.locationUrl,
            },
          };
        }
        return t;
      });

      await saveTemplates(updatedTemplates);
      const result = await generateSchedules(wizardWeeksAhead);
      
      setWizardSuccessMessage(`Generated ${result.created} schedule day${result.created !== 1 ? 's' : ''} as drafts${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}.`);
      
      onSuccess();
      setWizardStep(3);
    } catch (err) {
      setWizardError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setWizardPublishing(false);
    }
  };

  // Step indicator labels
  const steps = ['Setup', 'Review & Generate', 'Done'];

  return (
    <div className="fixed inset-0 bg-sand-900/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-sand-200 shadow-lg max-w-lg w-full p-0 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sand-200 bg-sand-50/30">
          <div>
            <h3 className="font-serif text-xl font-medium text-sand-900">
              Publish Schedules
            </h3>
            {wizardStep < 3 && (
              <p className="text-xs text-sand-500 mt-0.5">Step {wizardStep} of 2 · {steps[wizardStep - 1]}</p>
            )}
          </div>
          {wizardStep < 3 && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-sand-100 flex items-center justify-center text-sand-500 transition-colors"
              disabled={wizardPublishing}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        {wizardStep < 3 && (
          <div className="h-1 bg-sand-100">
            <div 
              className="h-full bg-olive-600 transition-all duration-300 ease-out"
              style={{ width: `${(wizardStep / 2) * 100}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {wizardError && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{wizardError}</p>}

          {/* ── Step 1: Clinic + Duration (combined) ── */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              {/* Clinic Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Clinic Location</Label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {clinicsList.map((clinic) => (
                    <div
                      key={clinic.id}
                      onClick={() => setWizardSelectedClinicId(clinic.id)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                        wizardSelectedClinicId === clinic.id
                          ? 'border-sand-500 bg-sand-50/30 shadow-sm'
                          : 'border-sand-200 hover:bg-sand-50'
                      }`}
                    >
                      <div className="font-bold text-sand-900 flex items-center justify-between">
                        {clinic.clinicName}
                        {wizardSelectedClinicId === clinic.id && <CheckIcon className="w-4 h-4 text-olive-600" />}
                      </div>
                      <div className="text-sand-500 mt-1">{clinic.city} · {clinic.consultFee} EGP</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration (was step 3, now combined) */}
              <div className="space-y-3 pt-2 border-t border-sand-100">
                <Label className="text-sm font-semibold">Publishing Horizon</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={wizardWeeksAhead}
                    onChange={(e) => setWizardWeeksAhead(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                    className="w-20 text-center text-lg h-12"
                  />
                  <div>
                    <span className="font-semibold text-sand-900 text-sm">Weeks ahead</span>
                    <p className="text-xs text-sand-400">Generates up to {wizardWeeksAhead * 7} days from today.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Review & Confirm (combined old steps 2+4) ── */}
          {wizardStep === 2 && (
            <div className="space-y-5">
              <Label className="text-sm font-semibold">Review & Generate</Label>
              
              <div className="p-4 bg-sand-50/20 border border-sand-200 rounded-xl text-xs space-y-4">
                {/* Clinic summary */}
                <div>
                  <span className="text-sand-400 font-bold uppercase tracking-wider text-[10px]">Clinic</span>
                  <div className="text-sand-900 font-bold mt-0.5">{selectedClinic?.clinicName}</div>
                  <div className="text-sand-600">{selectedClinic?.city} · {selectedClinic?.consultFee} EGP</div>
                </div>

                {/* Duration summary */}
                <div>
                  <span className="text-sand-400 font-bold uppercase tracking-wider text-[10px]">Generation Horizon</span>
                  <div className="text-sand-900 font-bold mt-0.5">{wizardWeeksAhead} Weeks Ahead</div>
                </div>

                {/* Template preview */}
                <div>
                  <span className="text-sand-400 font-bold uppercase tracking-wider text-[10px]">Active Days ({activeTemplates.length})</span>
                  <div className="space-y-1.5 mt-1.5">
                    {activeTemplates.length === 0 ? (
                      <p className="text-red-600 font-semibold flex items-center gap-1.5"><AlertTriangleIcon className="w-4 h-4" /> No active template days!</p>
                    ) : (
                      activeTemplates.map((t) => {
                        const dayLabel = DAYS_OF_WEEK.find((d) => d.value === t.dayOfWeek)?.label;
                        return (
                          <div key={t.dayOfWeek} className="flex items-center gap-2 text-sand-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-olive-600 shrink-0" />
                            <span className="font-semibold">{dayLabel}</span>
                            <span className="text-sand-500">·</span>
                            <span className="text-sand-500">
                              {t.bookingMode === 'token'
                                ? `Walk-in · ${t.startTime} · Max ${t.maxCases}`
                                : `${t.startTime} - ${t.endTime} · ${t.slotDurationMins}min`
                              }
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Immutability notice */}
                <div className="pt-3 border-t border-sand-200/50">
                  <p className="text-sand-500 leading-relaxed">
                    <PinIcon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Clinic details are snapshot at generation time. Updates to clinic settings won't affect existing schedules.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {wizardStep === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-sand-50 border border-sand-200 rounded-full flex items-center justify-center mx-auto text-sand-900 font-bold text-3xl">
                <CheckIcon className="w-8 h-8 text-olive-600" />
              </div>
              <div>
                <h4 className="font-serif font-semibold text-sand-900 text-lg">Schedules Generated as Drafts!</h4>
                <p className="text-xs text-sand-500 max-w-xs mx-auto mt-1">
                  Review them in your timeline and click "Publish Live" or "Publish All Drafts" to make them visible in the marketplace.
                </p>
              </div>
              {wizardSuccessMessage && (
                <p className="text-xs text-sand-900 bg-sand-50 p-3 rounded-lg border border-sand-200 max-w-sm mx-auto font-medium">
                  {wizardSuccessMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-sand-200 bg-sand-50/30">
          {wizardStep === 3 ? (
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              {wizardStep > 1 && (
                <Button variant="ghost" onClick={() => setWizardStep((s) => s - 1)} disabled={wizardPublishing} className="h-11">
                  Back
                </Button>
              )}
              
              {wizardStep < 2 ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!wizardSelectedClinicId) {
                      setWizardError('Please select a saved clinic.');
                      return;
                    }
                    setWizardError(null);
                    setWizardStep(2);
                  }}
                  className="h-11"
                >
                  Review & Confirm →
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => void handlePublishFromWizard()}
                  disabled={wizardPublishing || activeTemplates.length === 0}
                  className="h-11 shadow-sm min-w-[200px]"
                >
                  {wizardPublishing ? 'Generating...' : 'Generate Draft Schedules'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
