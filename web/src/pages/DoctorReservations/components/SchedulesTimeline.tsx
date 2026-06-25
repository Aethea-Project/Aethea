import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import type { DoctorSchedule, DoctorProfile } from '../../../services/medicalApi';

interface SchedulesTimelineProps {
  schedulesError: string | null;
  schedulesLoading: boolean;
  schedules: DoctorSchedule[] | undefined;
  handleOpenWizard: () => void;
  handlePublishIndividual: (scheduleId: string) => Promise<void>;
  setDeletingId: (id: string | null) => void;
  myProfile: DoctorProfile | null;
}

function getTimeUntil(dateStr: string): string | null {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return null; // only show countdown within 24h
  if (hours > 0) return `Starts in ${hours}h ${mins}m`;
  return `Starts in ${mins}m`;
}

export const SchedulesTimeline = React.memo(function SchedulesTimeline({
  schedulesError,
  schedulesLoading,
  schedules,
  handleOpenWizard,
  handlePublishIndividual,
  setDeletingId,
  myProfile,
}: SchedulesTimelineProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="space-y-4">
      {schedulesError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{schedulesError}</p>}
      
      {schedulesLoading && (!schedules || schedules.length === 0) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-sand-100/60 h-28" />
          ))}
        </div>
      ) : schedules?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-sand-300 p-12 text-center bg-surface-card">
          <svg className="mx-auto h-10 w-10 text-sand-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sand-600 text-sm font-medium">No published schedules found.</p>
          <p className="text-xs text-sand-400 mt-1 max-w-sm mx-auto">
            Use the "Publish Live Days" wizard or save a weekly pattern to generate dates.
          </p>
          <Button variant="primary" onClick={handleOpenWizard} className="h-12 mt-5">
            Publish First Schedule
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {schedules?.map((schedule) => {
            const isDraft = !schedule.isPublished;
            const formattedDate = new Date(schedule.scheduleDate).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
            
            const clinicSnapshot = schedule.clinicInfo as { clinicName?: string, city?: string, address?: string } | undefined;
            const bookedCount = schedule.bookedCount || 0;
            const maxSlots = schedule.maxPatients;
            const fillPct = maxSlots > 0 ? (bookedCount / maxSlots) * 100 : 0;
            const scheduleDate = schedule.scheduleDate.split('T')[0];
            const isToday = scheduleDate === todayStr;
            const countdown = isToday ? getTimeUntil(schedule.startAt) : null;

            return (
              <div
                key={schedule.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl transition-all ${
                  isDraft
                    ? 'border-2 border-dashed border-sand-300 bg-sand-50/50'
                    : 'border border-transparent bg-surface-card hover:shadow-sm'
                }`}
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif font-medium text-sand-900 text-[1.1rem]">{formattedDate}</span>
                    
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      isDraft
                        ? 'bg-olive-50 text-olive-800 ring-olive-600/20'
                        : 'bg-sand-50 text-sand-900 ring-olive-600/20'
                    }`}>
                      {isDraft && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V5a2 2 0 00-2-2H8a2 2 0 00-2 2v6" />
                        </svg>
                      )}
                      {isDraft ? 'Draft' : 'Live'}
                    </span>

                    {isToday && (
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-bold bg-olive-600 text-white ring-1 ring-inset ring-olive-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Today
                      </span>
                    )}

                    {countdown && (
                      <span className="text-xs font-semibold text-sand-900 bg-sand-50 px-2 py-0.5 rounded-lg">
                        ⏱ {countdown}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-sand-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {schedule.bookingMode === 'token' ? 'Walk-in Queue' : 'Appointments'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {schedule.bookingMode === 'token' 
                        ? `Starts at ${new Date(schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                        : `${new Date(schedule.startAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} – ${new Date(schedule.endAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                      }
                    </span>
                  </div>

                  {/* Booked count with progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[200px]">
                      <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            fillPct >= 90 ? 'bg-red-400' : fillPct >= 60 ? 'bg-amber-400' : 'bg-sand-500'
                          }`}
                          style={{ width: `${Math.min(fillPct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-sand-700 whitespace-nowrap">
                      {bookedCount}/{maxSlots} {schedule.bookingMode === 'token' ? 'patients' : 'slots'}
                    </span>
                  </div>

                  {/* Clinic info */}
                  <div className="flex items-start gap-1.5 text-xs text-sand-600 font-medium">
                    <span className="mt-0.5">📍</span>
                    <div className="truncate">
                      {clinicSnapshot ? (
                        <>
                          <span className="text-sand-900 font-semibold">{clinicSnapshot.clinicName}</span> · {clinicSnapshot.city} · <span className="text-sand-500 font-normal">{clinicSnapshot.address}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sand-700 font-semibold">{myProfile?.clinicName || 'Primary Clinic'}</span> · {myProfile?.city} · <span className="text-sand-500 font-normal">{myProfile?.address}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isDraft && (
                    <Button
                      variant="primary"
                      onClick={() => void handlePublishIndividual(schedule.id)}
                      className="h-10"
                    >
                      Publish Live
                    </Button>
                  )}
                  {isDraft ? (
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-10"
                      onClick={() => setDeletingId(schedule.id)}
                    >
                      Delete
                    </Button>
                  ) : (
                    <span 
                      className="text-xs text-sand-500 bg-sand-50/80 border border-sand-200/60 rounded-lg px-3 py-2 font-medium leading-tight max-w-[200px]"
                      title="Published live schedules cannot be deleted. Please contact support."
                    >
                      Live schedules are locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
