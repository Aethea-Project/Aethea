import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Label } from '../../components/ui/Label';
import { 
  CalendarIcon, 
  LabIcon, 
  DashboardIcon 
} from '../../components/Icons';
import { medicalApi, DoctorSchedule, ScheduleSlot, PatientHealthData, ReservationStatus } from '../../services/medicalApi';
import { FeatureHeader } from '../../components/FeatureHeader';
import { HealthDossierViewer } from '../../components/HealthDossierViewer';

export default function DoctorQueue() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  
  // Health records decryption state
  const [healthData, setHealthData] = useState<PatientHealthData | null>(null);
  const [loadingHealthData, setLoadingHealthData] = useState(false);
  const [healthDataError, setHealthDataError] = useState<string | null>(null);
  const [healthFolderUnlocked, setHealthFolderUnlocked] = useState(false);

  // Core status changes
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchedules() {
      try {
        setLoading(true);
        const docProfile = await medicalApi.fetchMyDoctorProfile();
        const scheduleResult = await medicalApi.fetchDoctorSchedules(docProfile.id);
        
        const allSchedules = scheduleResult.schedules;
        setSchedules(allSchedules);
        
        if (allSchedules.length > 0) {
          // Try to find today's schedule
          const todayStr = new Date().toISOString().split('T')[0];
          const todaySchedule = allSchedules.find(s => s.scheduleDate.split('T')[0] === todayStr);
          
          const defaultId = todaySchedule ? todaySchedule.id : allSchedules[0].id;
          setSelectedScheduleId(defaultId);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load schedules:', err);
        setError('Could not retrieve clinical schedules. Please verify profile details.');
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      void loadSchedules();
    }
  }, [session]);

  // Load slots whenever schedule changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedScheduleId) return;
      try {
        setLoading(true);
        const slotView = await medicalApi.fetchScheduleSlots(selectedScheduleId);
        setSlots(slotView.slots);
        
        // Reset slot selection and health data cache
        setSelectedSlot(null);
        setHealthFolderUnlocked(false);
        setHealthData(null);
        setNotes('');
        setError(null);
      } catch (err) {
        console.error('Failed to load schedule slots:', err);
        setError('Error loading patients queue list.');
      } finally {
        setLoading(false);
      }
    }

    void loadSlots();
  }, [selectedScheduleId]);

  // Fetch health records when authorized, unlocked and requested
  const handleAccessHealthData = async (reservationId: string) => {
    try {
      setLoadingHealthData(true);
      setHealthDataError(null);
      
      const data = await medicalApi.fetchPatientDataForReservation(reservationId);
      setHealthData(data);
      setHealthFolderUnlocked(true);
    } catch (err) {
      console.error('Access audit or timeframe verification failed:', err);
      setHealthDataError(
        err instanceof Error 
          ? err.message 
          : 'Access Forbidden: Medical histories are encrypted. Under HIPAA compliance, records are only accessible during the schedule day of the reservation.'
      );
    } finally {
      setLoadingHealthData(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, targetStatus: ReservationStatus) => {
    try {
      setUpdatingStatus(true);
      setError(null);
      
      await medicalApi.updateReservationStatus(reservationId, targetStatus, notes);
      
      // Refresh current slots list
      const slotView = await medicalApi.fetchScheduleSlots(selectedScheduleId);
      setSlots(slotView.slots);
      
      // Keep local selection synced
      const updatedSlot = slotView.slots.find(s => s.reservationId === reservationId);
      if (updatedSlot) {
        setSelectedSlot(updatedSlot);
      }
      
      // Clear notes after completing the appointment
      if (targetStatus === 'completed') {
        setNotes('');
        setHealthFolderUnlocked(false);
        setHealthData(null);
      }
    } catch (err) {
      console.error('Failed to transition queue state:', err);
      setError(err instanceof Error ? err.message : 'Failed to update queue slot status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-sand-50 text-sand-500 border border-sand-150">Empty Slot</span>;
      case 'scheduled':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sand-100 text-sand-800 border border-sand-200">Scheduled / Waiting</span>;
      case 'confirmed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sand-50 text-sand-900 border border-sand-200 font-semibold animate-pulse">Arrived / Ready</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-organic-linen text-sand-900 border border-sand-200 font-bold">With Doctor</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sand-50 text-sand-400 border border-sand-150 line-through">Gone / Checked Out</span>;
      case 'no_show':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-100">No Show</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-500 border border-red-100">Cancelled</span>;
      default:
        return null;
    }
  };



  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      
      {/* ── Header ── */}
      <FeatureHeader title="Real-Time Queue Tracker">
        {schedules.length > 0 && (
          <div className="w-full md:w-64">
            <Label htmlFor="schedule-select" className="sr-only">Select Session</Label>
            <Select 
              id="schedule-select"
              value={selectedScheduleId}
              onChange={(e) => setSelectedScheduleId(e.target.value)}
            >
              {schedules.map((s) => {
                const sDate = new Date(s.scheduleDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <option key={s.id} value={s.id}>
                    {sDate} ({(s.clinicInfo as any)?.clinicName ?? 'Clinic Location'})
                  </option>
                );
              })}
            </Select>
          </div>
        )}
      </FeatureHeader>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && slots.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
        </div>
      ) : slots.length === 0 ? (
        <Card className="border-transparent">
          <CardContent className="p-16 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-sand-400 mb-4" />
            <h3 className="text-lg font-serif font-medium text-sand-900 mb-2">No Active Schedules</h3>
            <p className="text-sm text-sand-500 max-w-sm mx-auto mb-6">
              Create and publish a schedule to activate a live patient tracking session.
            </p>
            <Button variant="primary" className="h-12" onClick={() => navigate('/clinic-hours')}>
              Manage Session Hours
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Pane: Queue Timeline Slots ── */}
          <div className="lg:col-span-5 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold text-sand-500 uppercase tracking-widest">
                Appointments Sequence
              </span>
              <span className="text-xs font-semibold text-sand-900">
                {slots.filter(s => s.status === 'completed').length} / {slots.filter(s => s.status !== 'available').length} Completed
              </span>
            </div>

            {slots.map((slot) => {
              const startStr = new Date(slot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endStr = new Date(slot.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isSelected = selectedSlot?.slotIndex === slot.slotIndex;
              const hasBooking = slot.status !== 'available';

              return (
                <Card 
                  key={slot.slotIndex} 
                  interactive={hasBooking}
                  selected={isSelected}
                  className={isSelected ? "" : !hasBooking ? "opacity-65 bg-sand-50/40 border-transparent" : "border-transparent"}
                  onClick={() => hasBooking && setSelectedSlot(slot)}
                >
                  <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm font-semibold text-sand-500">Slot #{slot.slotIndex + 1}</span>
                        <span className="text-xs text-sand-400 font-medium">&bull; {startStr} - {endStr}</span>
                      </div>
                      
                      <h4 className="text-base font-semibold text-sand-900 mt-1">
                        {hasBooking ? slot.patientLabel : 'Vacant Slot'}
                      </h4>

                      {hasBooking && slot.reason && (
                        <p className="text-xs text-sand-500 line-clamp-1 italic">
                          "{slot.reason}"
                        </p>
                      )}

                      {slot.shareHealthData && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-sand-900 uppercase tracking-wider">
                          <LabIcon className="h-3 w-3 shrink-0" />
                          <span>Dossier Shared</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {getStatusBadge(slot.status)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Right Pane: Active Workspace ── */}
          <div className="lg:col-span-7">
            {selectedSlot ? (
              <div className="space-y-6">
                
                {/* Workspace Hub card */}
                <Card className="border-transparent">
                  <CardHeader className="pb-4">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sand-900 uppercase tracking-wider">Clinical Workspace</span>
                          <span className="text-xs text-sand-400 font-medium">| Slot #{selectedSlot.slotIndex + 1}</span>
                        </div>
                        <CardTitle className="mt-1">
                          {selectedSlot.patientLabel}
                        </CardTitle>
                        <p className="text-xs text-sand-500 mt-1 font-medium">
                          Session time: {new Date(selectedSlot.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSlot.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="shrink-0 pt-1">
                        {getStatusBadge(selectedSlot.status)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Progress Flow Description */}
                    <div>
                      <h4 className="text-xs font-bold text-sand-500 uppercase tracking-widest mb-1.5">Stated Consultation Reason</h4>
                      <p className="text-sm text-sand-700 italic bg-sand-50/50 p-3 rounded-lg border border-sand-200 leading-relaxed">
                        "{selectedSlot.reason ?? 'No detailed booking reason provided.'}"
                      </p>
                    </div>

                    {/* Operational Flow Buttons */}
                    <div className="border-t border-sand-150 pt-5 space-y-4">
                      <h4 className="text-xs font-bold text-sand-500 uppercase tracking-widest mb-3">Consultation Lifecycle Controls</h4>
                      
                      {selectedSlot.status === 'scheduled' && (
                        <div className="flex flex-col gap-3">
                          <p className="text-xs text-sand-500 leading-relaxed">
                            Mark the patient as arrived when they arrive in your waiting room.
                          </p>
                          <Button 
                            variant="primary" 
                            className="h-12 w-full font-bold shadow-sm"
                            disabled={updatingStatus}
                            onClick={() => handleUpdateStatus(selectedSlot.reservationId!, 'confirmed')}
                          >
                            {updatingStatus ? 'Updating...' : 'Mark Patient as Arrived'}
                          </Button>
                        </div>
                      )}

                      {selectedSlot.status === 'confirmed' && (
                        <div className="flex flex-col gap-3">
                          <p className="text-xs text-sand-500 leading-relaxed">
                            Start the active clinical session. This shifts state and registers the time block.
                          </p>
                          <Button 
                            variant="primary" 
                            className="h-12 w-full font-bold"
                            disabled={updatingStatus}
                            onClick={() => handleUpdateStatus(selectedSlot.reservationId!, 'in_progress')}
                          >
                            {updatingStatus ? 'Starting...' : 'Start Consultation Session'}
                          </Button>
                        </div>
                      )}

                      {selectedSlot.status === 'in_progress' && (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="clinical-notes" className="text-xs font-bold text-sand-500 uppercase tracking-widest">
                              Private Consultation Observations (Clinical Notes)
                            </Label>
                            <textarea
                              id="clinical-notes"
                              rows={4}
                              className="w-full rounded-lg border border-sand-200 bg-white p-3 text-sm text-sand-900 placeholder-sand-400 focus:border-nescafe focus:outline-none focus:ring-1 focus:ring-nescafe/50"
                              placeholder="Record physical findings, symptoms, diagnosis, and care plans here securely..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>

                          <div className="flex gap-4">
                            <Button 
                              variant="primary" 
                              className="h-12 flex-1 font-bold shadow-sm"
                              disabled={updatingStatus}
                              onClick={() => handleUpdateStatus(selectedSlot.reservationId!, 'completed')}
                            >
                              {updatingStatus ? 'Saving...' : 'End Session & Check Out'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {selectedSlot.status === 'completed' && (
                        <div className="p-4 rounded-lg bg-sand-50 border border-sand-200">
                          <p className="text-xs text-sand-600 font-semibold flex items-center gap-1.5">
                            <svg className="h-4 w-4 text-sand-900 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            This consultation session has closed.
                          </p>
                          <p className="text-xs text-sand-500 mt-1 leading-relaxed">
                            The patient has been checked out. A secure anonymized review link has been scheduled and will be sent automatically.
                          </p>
                        </div>
                      )}

                      {(selectedSlot.status === 'cancelled' || selectedSlot.status === 'no_show') && (
                        <div className="p-4 rounded-lg bg-red-50/50 border border-red-100 text-xs text-red-800">
                          This session has concluded with state: <strong>{selectedSlot.status}</strong>.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ── Decrypted Health Data (HIPAA ABAC) Panel ── */}
                <HealthDossierViewer
                  healthData={healthData}
                  loadingHealthData={loadingHealthData}
                  healthDataError={healthDataError}
                  healthFolderUnlocked={healthFolderUnlocked}
                  onAccessData={() => handleAccessHealthData(selectedSlot.reservationId!)}
                  sharedByPatient={selectedSlot.shareHealthData ?? false}
                />
              </div>
            ) : (
              <Card className="border-transparent">
                <CardContent className="p-16 text-center">
                  <DashboardIcon className="mx-auto h-12 w-12 text-sand-400 mb-4" />
                  <h3 className="text-lg font-serif font-medium text-sand-900 mb-1">Queue Workspace Hub</h3>
                  <p className="text-sm text-sand-500 max-w-sm mx-auto">
                    Select any patient from the sequence schedule to begin the digital workspace consultation.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
