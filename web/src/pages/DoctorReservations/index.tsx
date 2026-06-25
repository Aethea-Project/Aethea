import { useState, useEffect, useMemo } from 'react';
import type { DoctorProfile, WeeklyTemplateInput, UpsertProfilePayload } from '../../services/medicalApi';
import { useWeeklyTemplate, useScheduleExceptions, useDoctorSchedules } from '../../hooks/useDoctors';
import { medicalApi } from '../../services/medicalApi';
import { useAuth } from '@core/auth/useAuth';
import { useUiNotifications } from '../../contexts/UiNotificationsProvider';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CancelModal } from './components/CancelModal';
import { PublishWizard } from './components/PublishWizard';
import { SchedulesTimeline } from './components/SchedulesTimeline';
import { ExceptionsPane } from './components/ExceptionsPane';
import { ClinicSettingsDrawer, type SavedClinic } from './components/ClinicSettingsDrawer';
import { FeatureHeader } from '../../components/FeatureHeader';
import { SendIcon } from '../../components/Icons';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function DoctorReservationsPage() {
  const { session, user, profile } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useUiNotifications();
  
  const tokenType = session?.user?.app_metadata?.account_type 
                 || session?.user?.user_metadata?.account_type 
                 || undefined;
  const accountType = profile?.accountType || tokenType;
  const isAdminReadonly = accountType === 'admin';

  const [profileId, setProfileId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<DoctorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [publishingMultiple, setPublishingMultiple] = useState(false);

  // Active operations tab in the left operational center
  const [activeOpTab, setActiveOpTab] = useState<'schedules' | 'exceptions'>('schedules');

  // Hub Drawer State (saved clinics & weekly template configuration drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'clinics' | 'template'>('clinics');

  // Publish Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Deletion Modal State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('Schedule Correction');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Hooks for schedule timeline, template, and exceptions
  const { schedules, loading: schedulesLoading, error: schedulesError, refresh: refreshSchedules } = useDoctorSchedules(profileId || '');
  const { templates, save: saveTemplates, generate: generateSchedules, loading: templatesLoading, refresh: refreshTemplates } = useWeeklyTemplate();
  const { exceptions, create: createException, remove: removeException, loading: exceptionsLoading, error: exceptionsError } = useScheduleExceptions();

  const draftSchedules = useMemo(() => schedules?.filter((s) => !s.isPublished) || [], [schedules]);

  const handlePublishIndividual = async (scheduleId: string) => {
    try {
      await medicalApi.publishDoctorSchedules([scheduleId]);
      notifySuccess('Schedule Published', 'The schedule is now live in the marketplace.');
      refreshSchedules();
    } catch (err) {
      notifyError('Publish Failed', err instanceof Error ? err.message : 'Failed to publish schedule');
    }
  };

  const handlePublishAllDrafts = async () => {
    if (draftSchedules.length === 0) return;
    setPublishingMultiple(true);
    try {
      await medicalApi.publishDoctorSchedules(draftSchedules.map((d) => d.id));
      notifySuccess('All Drafts Published', `${draftSchedules.length} schedule(s) are now live.`);
      refreshSchedules();
    } catch (err) {
      notifyError('Publish Failed', err instanceof Error ? err.message : 'Failed to publish all drafts');
    } finally {
      setPublishingMultiple(false);
    }
  };

  // Local state for template checklist inside the drawer
  const [templateFormState, setTemplateFormState] = useState<WeeklyTemplateInput[]>([]);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<string | null>(null);
  const [templateSaveError, setTemplateSaveError] = useState<string | null>(null);

  // Exception form state
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionSaving, setExceptionSaving] = useState(false);
  const [exceptionSaveError, setExceptionSaveError] = useState<string | null>(null);

  // Fetch own doctor profile on mount
  useEffect(() => {
    if (isAdminReadonly) {
      setProfileLoading(false);
      return;
    }
    medicalApi.fetchMyDoctorProfile()
      .then((p) => {
        setProfileId(p.id);
        setMyProfile(p);
      })
      .catch((err) => {
        setProfileError(err instanceof Error ? err.message : 'Could not load your doctor profile.');
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, [isAdminReadonly]);

  // Sync templates hook into local templateFormState inside the drawer
  useEffect(() => {
    if (!templatesLoading && templates) {
      const initial: WeeklyTemplateInput[] = DAYS_OF_WEEK.map((day) => {
        const existing = templates.find((t) => t.dayOfWeek === day.value);
        if (existing) {
          return {
            dayOfWeek: day.value,
            startTime: existing.startTime,
            endTime: existing.endTime,
            slotDurationMins: existing.slotDurationMins,
            maxCases: existing.maxCases ?? 30,
            bookingMode: existing.bookingMode ?? 'slot',
            isActive: existing.isActive,
            clinicInfo: existing.clinicInfo ?? undefined,
          };
        }
        return {
          dayOfWeek: day.value,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMins: 30,
          maxCases: 30,
          bookingMode: 'slot',
          isActive: false,
          clinicInfo: undefined,
        };
      });
      setTemplateFormState(initial);
    }
  }, [templates, templatesLoading]);

  // Initialise clinics array or read from doctorProfile
  const getClinicsList = (prof: DoctorProfile | null): SavedClinic[] => {
    if (!prof) return [];
    if (Array.isArray(prof.savedClinics) && prof.savedClinics.length > 0) {
      return prof.savedClinics as SavedClinic[];
    }
    // Backward compatibility: If no clinics list exists but profile has details, populate initial clinic
    const hasDetails = prof.clinicName || prof.address || prof.city || prof.consultFee;
    if (hasDetails) {
      return [{
        id: 'primary-clinic',
        clinicName: prof.clinicName || 'My Primary Clinic',
        city: prof.city || '',
        consultFee: prof.consultFee || 0,
        address: prof.address || '',
        locationUrl: prof.locationUrl || '',
      }];
    }
    return [];
  };

  const clinicsList = getClinicsList(myProfile);

  // Sync savedClinics array to database and update profile details
  const saveClinicsList = async (updatedList: SavedClinic[]) => {
    if (!myProfile) return;
    const primaryClinic = updatedList[0];
    const payload: UpsertProfilePayload = {
      firstName: myProfile.firstName,
      lastName: myProfile.lastName,
      specialty: myProfile.specialty,
      bio: myProfile.bio ?? undefined,
      languages: myProfile.languages,
      savedClinics: updatedList,
    };
    
    // Auto-synchronise the first clinic in the list with the main profile details to maintain legacy compatibility
    if (primaryClinic) {
      payload.clinicName = primaryClinic.clinicName;
      payload.city = primaryClinic.city;
      payload.consultFee = primaryClinic.consultFee;
      payload.address = primaryClinic.address;
      payload.locationUrl = primaryClinic.locationUrl;
    } else {
      payload.clinicName = '';
      payload.city = '';
      payload.consultFee = 0;
      payload.address = '';
      payload.locationUrl = '';
    }

    const updated = await medicalApi.upsertMyDoctorProfile(payload);
    setMyProfile(updated);
  };

  // Weekly templates checklist inside the drawer
  const handleToggleDay = (dayValue: number) => {
    setTemplateFormState((prev) =>
      prev.map((t) => (t.dayOfWeek === dayValue ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleTemplateFieldChange = (dayValue: number, field: keyof WeeklyTemplateInput, value: any) => {
    setTemplateFormState((prev) =>
      prev.map((t) => (t.dayOfWeek === dayValue ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTemplatesOnly = async () => {
    setTemplateSaving(true);
    setTemplateSaveSuccess(null);
    setTemplateSaveError(null);
    try {
      await saveTemplates(templateFormState);
      setTemplateSaveSuccess('Weekly template pattern saved successfully.');
      notifySuccess('Template Saved', 'Your weekly template has been updated.');
      refreshTemplates();
    } catch (err) {
      setTemplateSaveError(err instanceof Error ? err.message : 'Failed to save templates.');
      notifyError('Save Failed', err instanceof Error ? err.message : 'Failed to save templates.');
    } finally {
      setTemplateSaving(false);
    }
  };

  // Exception scheduling logic
  const handleAddException = async () => {
    if (!exceptionDate) return;
    setExceptionSaving(true);
    setExceptionSaveError(null);
    try {
      await createException({
        exceptionDate,
        type: 'unavailable',
        reason: exceptionReason.trim() || undefined,
      });
      setExceptionDate('');
      setExceptionReason('');
      notifySuccess('Time Off Added', `${new Date(exceptionDate).toLocaleDateString()} has been blocked.`);
      refreshSchedules(); // refresh timeline as exceptions automatically clear dates
    } catch (err) {
      setExceptionSaveError(err instanceof Error ? err.message : 'Failed to add exception');
      notifyError('Exception Failed', err instanceof Error ? err.message : 'Failed to add exception');
    } finally {
      setExceptionSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deletingId) return;
    const scheduleToDelete = schedules?.find((s) => s.id === deletingId);
    if (scheduleToDelete && scheduleToDelete.isPublished) {
      setDeleteError('Published live schedules cannot be cancelled via the app. Please contact support.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await medicalApi.deleteMySchedule(deletingId, deleteReason);
      setDeletingId(null);
      setDeleteReason('Schedule Correction');
      notifySuccess('Schedule Deleted', 'The draft schedule has been removed.');
      refreshSchedules();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to cancel schedule');
    } finally {
      setDeleting(false);
    }
  };

  const selectedScheduleForDelete = schedules?.find((s) => s.id === deletingId);
  const activeReservationsCount = (selectedScheduleForDelete as any)?.bookedCount ?? 0;

  // Publish schedules step-by-step wizard trigger
  const handleOpenWizard = () => {
    if (clinicsList.length === 0) {
      notifyWarning('No Clinics Configured', 'Please add a saved clinic first in your settings.');
      setIsDrawerOpen(true);
      setDrawerActiveTab('clinics');
      return;
    }
    setIsWizardOpen(true);
  };

  const handleCreateProfile = async () => {
    const emailPrefix = user?.email?.split('@')[0] ?? 'doctor';
    const safeName = emailPrefix.replace(/[^a-zA-Z]/g, ' ').trim() || 'Doctor';
    const [first = 'Doctor', ...rest] = safeName.split(/\s+/);
    const last = rest.length > 0 ? rest.join(' ') : 'Account';

    setCreatingProfile(true);
    setProfileError(null);
    try {
      const p = await medicalApi.upsertMyDoctorProfile({
        firstName: first.slice(0, 50),
        lastName: last.slice(0, 50),
        specialty: 'General Practice',
        bio: 'Doctor profile for schedule posting.',
        clinicName: 'Aethea Clinic',
        city: 'Cairo',
        consultFee: 300,
        languages: ['Arabic', 'English'],
      });
      setProfileId(p.id);
      setMyProfile(p);
      notifySuccess('Profile Created', 'Your doctor profile is ready. Start by adding a clinic.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not create your doctor profile.');
    } finally {
      setCreatingProfile(false);
    }
  };

  if (isAdminReadonly) {
    return (
      <div className="max-w-5xl mx-auto p-10 space-y-12">
        <FeatureHeader title="Clinic Hours" />
        <div className="rounded-lg border border-transparent p-6 bg-surface-card">
          <p className="text-sand-600">Administrators cannot set clinic hours.</p>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="max-w-5xl mx-auto p-10 space-y-12">
        <p className="text-sand-500">Loading your profile...</p>
      </div>
    );
  }

  if (profileError || !myProfile) {
    return (
      <div className="max-w-5xl mx-auto p-10 space-y-12">
        <FeatureHeader title="Clinic Hours" />
        <div className="rounded-lg border border-transparent p-6 bg-surface-card">
          {profileError && <p className="text-red-600 mb-4">{profileError}</p>}
          <p className="text-sand-600 mb-6">Create a doctor profile to activate clinic hours and scheduling.</p>
          <Button variant="primary" onClick={() => void handleCreateProfile()} disabled={creatingProfile} className="h-12">
            {creatingProfile ? 'Creating...' : 'Create Doctor Profile'}
          </Button>
        </div>
      </div>
    );
  }

  // Booked count accumulator for live timeline
  const bookingsCount = schedules?.reduce((sum, s) => sum + (s as any).bookedCount, 0) || 0;

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12 font-sans">
      
      {/* ─── Page Header ─── */}
      <FeatureHeader title="Clinic & Schedule Hub">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => { setIsDrawerOpen(true); setDrawerActiveTab('clinics'); }} 
            className="h-12"
          >
            <svg className="w-5 h-5 text-sand-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Hub Settings
          </Button>
          {draftSchedules.length > 0 && (
            <Button
              variant="outline"
              onClick={() => void handlePublishAllDrafts()}
              disabled={publishingMultiple}
              className="h-12 border-sand-400 text-sand-800 hover:bg-sand-100"
            >
              {publishingMultiple ? 'Publishing...' : `Publish ${draftSchedules.length} Drafts`}
            </Button>
          )}
          <Button variant="primary" onClick={handleOpenWizard} className="h-12 shadow-sm">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Schedule
          </Button>
        </div>
      </FeatureHeader>

      {/* ─── Operational Counters Bar ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="border-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sand-500 uppercase tracking-wider">Active Published Days</p>
              <h3 className="font-serif text-3xl font-medium text-sand-900 mt-1">{schedules?.length || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-sand-50 flex items-center justify-center text-olive-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card className="border-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sand-500 uppercase tracking-wider">Total Booked Cases</p>
              <h3 className="font-serif text-3xl font-medium text-sand-900 mt-1">{bookingsCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-sand-50 flex items-center justify-center text-olive-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </Card>
        <Card className="border-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sand-500 uppercase tracking-wider">Scheduled Time Off</p>
              <h3 className="font-serif text-3xl font-medium text-sand-900 mt-1">{exceptions?.length || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-lg bg-sand-100 flex items-center justify-center text-sand-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Main Dual-Pane Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
        
        {/* LEFT operational center (70%) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Custom Tabs */}
          <div className="flex">
            <button
              onClick={() => setActiveOpTab('schedules')}
              className={`px-6 py-3 font-serif font-medium text-lg border-b-2 transition-all duration-150 -mb-[2px] ${
                activeOpTab === 'schedules'
                  ? 'border-olive-600 text-sand-900 font-semibold'
                  : 'border-transparent text-sand-500 hover:text-sand-700'
              }`}
            >
              Published Live Calendar
            </button>
            <button
              onClick={() => setActiveOpTab('exceptions')}
              className={`px-6 py-3 font-serif font-medium text-lg border-b-2 transition-all duration-150 -mb-[2px] ${
                activeOpTab === 'exceptions'
                  ? 'border-olive-600 text-sand-900 font-semibold'
                  : 'border-transparent text-sand-500 hover:text-sand-700'
              }`}
            >
              Exceptions & Blocked Days
            </button>
          </div>

          {/* Published Schedules Sub-pane */}
          {activeOpTab === 'schedules' && (
            <SchedulesTimeline
              schedulesError={schedulesError}
              schedulesLoading={schedulesLoading}
              schedules={schedules}
              handleOpenWizard={handleOpenWizard}
              handlePublishIndividual={handlePublishIndividual}
              setDeletingId={setDeletingId}
              myProfile={myProfile}
            />
          )}

          {/* Exceptions Sub-pane */}
          {activeOpTab === 'exceptions' && (
            <ExceptionsPane
              exceptionsError={exceptionsError}
              exceptionSaveError={exceptionSaveError}
              exceptionDate={exceptionDate}
              setExceptionDate={setExceptionDate}
              exceptionReason={exceptionReason}
              setExceptionReason={setExceptionReason}
              exceptionSaving={exceptionSaving}
              onAddException={() => void handleAddException()}
              exceptionsLoading={exceptionsLoading}
              exceptions={exceptions}
              onRemoveException={(id) => removeException(id).then(() => refreshSchedules())}
            />
          )}
        </div>

        {/* RIGHT contextual actions panel (30%) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Contextual Next Action */}
          <Card className="border-sand-200 bg-gradient-to-b from-sand-50/40 to-transparent p-6">
            <h3 className="font-serif text-base font-semibold text-sand-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Next Action
            </h3>
            {clinicsList.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-sand-600">Add a clinic location first to start publishing schedules.</p>
                <Button variant="primary" className="w-full" onClick={() => { setIsDrawerOpen(true); setDrawerActiveTab('clinics'); }}>
                  + Add Your First Clinic
                </Button>
              </div>
            ) : !templateFormState.some(t => t.isActive) ? (
              <div className="space-y-3">
                <p className="text-xs text-sand-600">Set up your weekly template to define which days you work.</p>
                <Button variant="primary" className="w-full" onClick={() => { setIsDrawerOpen(true); setDrawerActiveTab('template'); }}>
                  Configure Weekly Template
                </Button>
              </div>
            ) : draftSchedules.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-sand-600">
                  You have <span className="font-bold text-sand-900">{draftSchedules.length} draft schedule{draftSchedules.length !== 1 ? 's' : ''}</span> ready to publish.
                </p>
                <Button variant="primary" className="w-full" onClick={() => void handlePublishAllDrafts()}>
                  <SendIcon className="w-4 h-4 mr-2 inline-block" /> Publish All Drafts
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-sand-600">Publish a block of upcoming dates based on your templates.</p>
                <Button variant="primary" className="w-full" onClick={handleOpenWizard}>
                  Publish New Schedules
                </Button>
              </div>
            )}
          </Card>

          {/* Saved Clinics Preview */}
          <Card className="border border-sand-200 bg-sand-50/50 p-6">
            <h3 className="font-serif text-lg font-semibold text-sand-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Saved Clinics
            </h3>
            
            {clinicsList.length === 0 ? (
              <p className="text-xs text-sand-500 italic mb-4">No saved clinics configured.</p>
            ) : (
              <div className="space-y-3 mb-4 max-h-[220px] overflow-y-auto pr-1">
                {clinicsList.map((c, i) => (
                  <div key={c.id} className="p-3 bg-surface rounded border border-sand-200 text-xs">
                    <div className="font-bold text-sand-900 flex justify-between gap-2">
                      <span className="truncate">{c.clinicName}</span>
                      {i === 0 && <span className="bg-sand-50 text-sand-900 text-[10px] px-1.5 py-0.5 rounded-lg shrink-0">Primary</span>}
                    </div>
                    <div className="text-sand-500 mt-0.5">{c.city} · {c.consultFee} EGP</div>
                    <div className="text-sand-400 mt-0.5 truncate">{c.address}</div>
                  </div>
                ))}
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => { setIsDrawerOpen(true); setDrawerActiveTab('clinics'); }}
            >
              Configure Saved Clinics
            </Button>
          </Card>

          {/* Weekly Templates Preview */}
          <Card className="border-transparent bg-organic-linen p-6">
            <h3 className="font-serif text-lg font-semibold text-sand-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Weekly Template
            </h3>

            <div className="flex gap-2 justify-between mb-4">
              {DAYS_OF_WEEK.map((day) => {
                const isDayActive = templateFormState.find((t) => t.dayOfWeek === day.value)?.isActive;
                return (
                  <div
                    key={day.value}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                      isDayActive
                        ? 'bg-olive-600 text-white shadow-sm'
                        : 'bg-sand-200 text-sand-500'
                    }`}
                    title={`${day.label}: ${isDayActive ? 'Active' : 'Inactive'}`}
                  >
                    {day.label[0]}
                  </div>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => { setIsDrawerOpen(true); setDrawerActiveTab('template'); }}
            >
              Edit Weekly Template
            </Button>
          </Card>
        </div>
      </div>

      <ClinicSettingsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={drawerActiveTab}
        setActiveTab={setDrawerActiveTab}
        clinicsList={clinicsList}
        onSaveClinicsList={saveClinicsList}
        templateFormState={templateFormState}
        onToggleDay={handleToggleDay}
        onTemplateFieldChange={handleTemplateFieldChange}
        templateSaving={templateSaving}
        templateSaveSuccess={templateSaveSuccess}
        templateSaveError={templateSaveError}
        onSaveTemplates={() => void handleSaveTemplatesOnly()}
        DAYS_OF_WEEK={DAYS_OF_WEEK}
      />

      {/* ─── Publish Schedules Wizard Modal ─── */}
      <PublishWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        clinicsList={clinicsList}
        templateFormState={templateFormState}
        DAYS_OF_WEEK={DAYS_OF_WEEK}
        saveTemplates={saveTemplates}
        generateSchedules={generateSchedules}
        onSuccess={() => {
          refreshTemplates();
          refreshSchedules();
        }}
      />

      <CancelModal
        deletingId={deletingId}
        selectedScheduleForDelete={selectedScheduleForDelete}
        activeReservationsCount={activeReservationsCount}
        deleteReason={deleteReason}
        setDeleteReason={setDeleteReason}
        deleteError={deleteError}
        deleting={deleting}
        onClose={() => { setDeletingId(null); setDeleteReason('Schedule Correction'); setDeleteError(null); }}
        onConfirm={() => void handleDeleteSchedule()}
      />
    </div>
  );
}