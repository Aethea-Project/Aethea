import { useState } from 'react';
import type { WeeklyTemplateInput } from '../../../services/medicalApi';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Select } from '../../../components/ui/Select';
import { CloseIcon, PencilIcon, TrashIcon, LocationIcon } from '../../../components/Icons';

export interface SavedClinic {
  id: string;
  clinicName: string;
  city: string;
  consultFee: number;
  address: string;
  locationUrl: string;
}

interface ClinicSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'clinics' | 'template';
  setActiveTab: (tab: 'clinics' | 'template') => void;
  clinicsList: SavedClinic[];
  onSaveClinicsList: (list: SavedClinic[]) => Promise<void>;
  templateFormState: WeeklyTemplateInput[];
  onToggleDay: (dayValue: number) => void;
  onTemplateFieldChange: (dayValue: number, field: keyof WeeklyTemplateInput, value: string | number | boolean) => void;
  templateSaving: boolean;
  templateSaveSuccess: string | null;
  templateSaveError: string | null;
  onSaveTemplates: () => void;
  DAYS_OF_WEEK: { value: number; label: string }[];
}

export function ClinicSettingsDrawer({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  clinicsList,
  onSaveClinicsList,
  templateFormState,
  onToggleDay,
  onTemplateFieldChange,
  templateSaving,
  templateSaveSuccess,
  templateSaveError,
  onSaveTemplates,
  DAYS_OF_WEEK,
}: ClinicSettingsDrawerProps) {
  // Clinic Form CRUD State (owned by the drawer)
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicFee, setClinicFee] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicLocationUrl, setClinicLocationUrl] = useState('');
  const [clinicFormError, setClinicFormError] = useState<string | null>(null);
  const [clinicFormSaving, setClinicFormSaving] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [clinicDeleteError, setClinicDeleteError] = useState<string | null>(null);

  const resetClinicForm = () => {
    setEditingClinicId(null);
    setClinicName('');
    setClinicCity('');
    setClinicFee('');
    setClinicAddress('');
    setClinicLocationUrl('');
    setClinicFormError(null);
  };

  const handleSaveClinic = async () => {
    if (!clinicName.trim() || !clinicCity.trim() || !clinicAddress.trim()) {
      setClinicFormError('Please fill in clinic name, city, and address.');
      return;
    }
    
    setClinicFormSaving(true);
    setClinicFormError(null);
    try {
      const clinicObj: SavedClinic = {
        id: editingClinicId === 'new' ? `clinic-${Date.now()}` : (editingClinicId || `clinic-${Date.now()}`),
        clinicName: clinicName.trim(),
        city: clinicCity.trim(),
        consultFee: parseInt(clinicFee, 10) || 0,
        address: clinicAddress.trim(),
        locationUrl: clinicLocationUrl.trim(),
      };

      let newList: SavedClinic[] = [];
      if (editingClinicId && editingClinicId !== 'new') {
        newList = clinicsList.map((c) => c.id === editingClinicId ? clinicObj : c);
      } else {
        newList = [...clinicsList, clinicObj];
      }

      await onSaveClinicsList(newList);
      resetClinicForm();
    } catch (err) {
      setClinicFormError(err instanceof Error ? err.message : 'Failed to save clinic');
    } finally {
      setClinicFormSaving(false);
    }
  };

  const handleEditClinicClick = (clinic: SavedClinic) => {
    setEditingClinicId(clinic.id);
    setClinicName(clinic.clinicName);
    setClinicCity(clinic.city);
    setClinicFee(clinic.consultFee.toString());
    setClinicAddress(clinic.address);
    setClinicLocationUrl(clinic.locationUrl);
    setClinicFormError(null);
  };

  const handleConfirmDeleteClinic = async (clinicId: string) => {
    try {
      setClinicDeleteError(null);
      const newList = clinicsList.filter((c) => c.id !== clinicId);
      await onSaveClinicsList(newList);
      setConfirmingDeleteId(null);
    } catch (err) {
      setClinicDeleteError(err instanceof Error ? err.message : 'Failed to delete clinic');
    }
  };

  return (
    <>
      {/* ─── Hub Drawer Overlay (Clinics CRUD + Templates Editor) ─── */}
      <div 
        className={`fixed inset-0 bg-sand-900/40 backdrop-blur-sm z-[150] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 w-full sm:max-w-lg bg-organic-ivory border-l border-sand-200 z-[160] flex flex-col shadow-lg transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-sand-200">
          <div>
            <h2 className="font-serif text-2xl font-medium text-sand-900">Clinics & Templates Hub</h2>
            <p className="text-xs text-sand-500 mt-0.5">Define your operational templates and saved clinics</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-sand-200 shrink-0 bg-surface">
          <button
            onClick={() => { setActiveTab('clinics'); resetClinicForm(); }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'clinics'
                ? 'border-olive-600 text-sand-900 font-semibold'
                : 'border-transparent text-sand-500 hover:text-sand-700'
            }`}
          >
            Saved Clinics List ({clinicsList.length})
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'template'
                ? 'border-olive-600 text-sand-900 font-semibold'
                : 'border-transparent text-sand-500 hover:text-sand-700'
            }`}
          >
            Weekly templates Editor
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: Saved Clinics List */}
          {activeTab === 'clinics' && (
            <div className="space-y-6">
              
              {/* If Add / Edit Clinic Form is Active */}
              {editingClinicId !== null ? (
                <Card selected className="p-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-sand-150">
                    <h3 className="font-serif font-medium text-sand-900 text-base">
                      {editingClinicId === 'new' ? 'Add New Clinic' : 'Edit Saved Clinic'}
                    </h3>
                    <button 
                      onClick={resetClinicForm} 
                      className="text-xs font-semibold text-sand-500 hover:text-sand-700"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Clinic Name</Label>
                      <Input
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="e.g. Al-Salam Plaza"
                        className="h-12"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input
                          value={clinicCity}
                          onChange={(e) => setClinicCity(e.target.value)}
                          placeholder="e.g. Cairo"
                          className="h-12"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Consult Fee (EGP)</Label>
                        <Input
                          type="number"
                          value={clinicFee}
                          onChange={(e) => setClinicFee(e.target.value)}
                          placeholder="e.g. 400"
                          className="h-12"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Clinic Address Details</Label>
                      <textarea
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        placeholder="Building 5, 2nd Floor, Roxi Square"
                        rows={2}
                        className="w-full rounded-lg border border-sand-200 bg-surface-card px-3 py-2 text-sm text-sand-900 placeholder:text-sand-400 focus:border-olive-600 focus:outline-none focus:ring-1 focus:ring-sand-50 resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Google Maps Share Link</Label>
                      <Input
                        value={clinicLocationUrl}
                        onChange={(e) => setClinicLocationUrl(e.target.value)}
                        placeholder="https://maps.google.com/..."
                        className="h-12"
                      />
                    </div>
                  </div>

                  {clinicFormError && <p className="text-xs text-red-600">{clinicFormError}</p>}

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={resetClinicForm}>
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => void handleSaveClinic()}
                      disabled={clinicFormSaving}
                    >
                      {clinicFormSaving ? 'Saving...' : 'Save Clinic'}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => setEditingClinicId('new')} 
                  className="w-full h-12 border-dashed border-sand-300 text-sand-900 hover:bg-sand-50"
                >
                  + Add Clinic Location
                </Button>
              )}

              {/* Clinics list */}
              <div className="space-y-4">
                {clinicsList.map((clinic, index) => (
                  <Card key={clinic.id} className="p-4 border-transparent">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-bold text-sand-900 text-sm flex items-center gap-2">
                          {clinic.clinicName}
                          {index === 0 && <span className="bg-sand-50 text-sand-900 text-[10px] px-1.5 py-0.5 rounded-lg font-normal shrink-0">Primary</span>}
                        </div>
                        <div className="text-xs text-sand-500 mt-0.5">{clinic.city} · {clinic.consultFee} EGP</div>
                        <div className="text-xs text-sand-400 mt-1">{clinic.address}</div>
                        
                        {clinic.locationUrl && (
                          <a
                            href={clinic.locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-olive-600 hover:text-sand-900 mt-2"
                          >
                            <LocationIcon className="w-3.5 h-3.5" />
                            Open Location Map
                          </a>
                        )}
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClinicClick(clinic)}
                          className="w-8 h-8 rounded hover:bg-sand-100 flex items-center justify-center text-sand-600 text-xs border border-transparent transition-colors"
                          title="Edit Clinic"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        {confirmingDeleteId === clinic.id ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => void handleConfirmDeleteClinic(clinic.id)}
                                className="px-2 py-1 rounded text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => { setConfirmingDeleteId(null); setClinicDeleteError(null); }}
                                className="px-2 py-1 rounded text-[11px] font-bold text-sand-600 hover:bg-sand-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            {clinicDeleteError && <p className="text-[10px] text-red-600 font-bold">{clinicDeleteError}</p>}
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteId(clinic.id)}
                            className="w-8 h-8 rounded hover:bg-red-50 flex items-center justify-center text-red-600 text-xs border border-transparent transition-colors"
                            title="Delete Clinic"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Weekly templates Editor */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              
              {templateSaveError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{templateSaveError}</p>}
              {templateSaveSuccess && <p className="text-sm text-sand-900 bg-sand-50/30 p-3 rounded-lg border border-sand-200">{templateSaveSuccess}</p>}

              <div className="flex flex-col gap-3">
                {templateFormState.map((day) => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.value === day.dayOfWeek)?.label;
                  return (
                    <div key={day.dayOfWeek} className="flex flex-col gap-3 p-3.5 rounded-lg border border-sand-200 bg-surface">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={day.isActive}
                          onChange={() => onToggleDay(day.dayOfWeek)}
                          className="w-4 h-4 rounded border-sand-300 text-olive-600 focus:ring-olive-600"
                        />
                        <Label className="mb-0 cursor-pointer text-sm font-semibold" onClick={() => onToggleDay(day.dayOfWeek)}>
                          {dayName}
                        </Label>
                      </div>
                      
                      {day.isActive ? (
                        <div className="space-y-3 pt-2 pl-7 border-l-2 border-sand-200">
                          <div>
                            <Label className="text-xs">Scheduling Booking Mode</Label>
                            <Select
                              value={day.bookingMode}
                              onChange={(e) => onTemplateFieldChange(day.dayOfWeek, 'bookingMode', e.target.value)}
                            >
                              <option value="slot">Appointments (Specific Time Slots)</option>
                              <option value="token">Walk-in Queue (First-Come, First-Served)</option>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Start Time</Label>
                              <Input
                                type="time"
                                value={day.startTime}
                                onChange={(e) => onTemplateFieldChange(day.dayOfWeek, 'startTime', e.target.value)}
                              />
                            </div>
                            
                            {day.bookingMode === 'slot' ? (
                              <div>
                                <Label className="text-xs">End Time</Label>
                                <Input
                                  type="time"
                                  value={day.endTime}
                                  onChange={(e) => onTemplateFieldChange(day.dayOfWeek, 'endTime', e.target.value)}
                                />
                              </div>
                            ) : (
                              <div>
                                <Label className="text-xs">Max Walk-ins</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  className="text-center"
                                  value={day.maxCases}
                                  onChange={(e) => onTemplateFieldChange(day.dayOfWeek, 'maxCases', parseInt(e.target.value, 10))}
                                />
                              </div>
                            )}
                          </div>

                          {day.bookingMode === 'slot' && (
                            <div>
                              <Label className="text-xs">Slot Duration (Minutes)</Label>
                              <Input
                                type="number"
                                min="5"
                                max="180"
                                value={day.slotDurationMins}
                                onChange={(e) => onTemplateFieldChange(day.dayOfWeek, 'slotDurationMins', parseInt(e.target.value, 10))}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-sand-400 font-medium pl-7 italic">Unavailable</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="primary"
                onClick={onSaveTemplates}
                disabled={templateSaving}
                className="w-full"
              >
                {templateSaving ? 'Saving Pattern...' : 'Save Weekly Template Pattern'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
