import React, { useMemo, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@core/auth/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { CalendarIcon, LabIcon, ProfileIcon, DoctorIcon } from '../../components/Icons';
import { medicalApi } from '../../services/medicalApi';
import { FeatureHeader } from '../../components/FeatureHeader';
import { useDoctorSchedules } from '../../hooks/useDoctors';
import { useNotifications } from '../../hooks/useNotifications';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-sand-200/60 ${className}`} />;
}

function SkeletonKpiCard() {
  return (
    <Card className="border-transparent">
      <CardContent className="p-6 flex items-center gap-5">
        <SkeletonBlock className="h-12 w-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  };
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleNavigate = (path: string) => {
    startTransition(() => {
      navigate(path);
    });
  };

  const { data: profile } = useQuery({
    queryKey: ['doctorProfile'],
    queryFn: () => medicalApi.fetchMyDoctorProfile(),
    enabled: !!session,
  });

  const { schedules, loading: isSchedulesLoading } = useDoctorSchedules(profile?.id || '');
  
  const { data: reviews, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['doctorReviews'],
    queryFn: () => medicalApi.fetchDoctorReviews(),
    enabled: !!session,
  });

  const { data: sharedTotal, isLoading: isSharedLoading } = useQuery({
    queryKey: ['doctorSharedTotal'],
    queryFn: async () => {
      const res = await medicalApi.fetchDoctorSharedRecords(1, 1);
      return res.total;
    },
    enabled: !!session,
  });

  const { notifications, loading: isNotificationsLoading } = useNotifications();

  const todayStr = new Date().toISOString().split('T')[0];
  const weekRange = useMemo(() => getWeekRange(), []);

  const weeklyPatientCount = useMemo(() => {
    return schedules
      .filter(s => {
        const d = s.scheduleDate.split('T')[0];
        return d >= weekRange.start && d <= weekRange.end;
      })
      .reduce((sum, s) => sum + s.bookedCount, 0);
  }, [schedules, weekRange]);

  const upcomingSchedules = useMemo(() => {
    return schedules
      .filter(s => s.scheduleDate.split('T')[0] >= todayStr && s.isPublished)
      .sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate));
  }, [schedules, todayStr]);

  const futurePublishedCount = upcomingSchedules.length;
  const recentNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);

  const averageRating = reviews?.averageRating ?? 0;
  const totalReviews = reviews?.totalReviews ?? 0;
  const recentFeedbacks = reviews?.feedbacks?.slice(0, 4) || [];
  const sharedRecordsTotal = sharedTotal ?? 0;

  const isKpiLoading = isSchedulesLoading || isReviewsLoading || isSharedLoading;

  return (
    <div className={`max-w-5xl mx-auto p-10 space-y-12 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      
      <FeatureHeader
        title="Doctor Command Center"
        subtitle={
          profile
            ? `Welcome back, Dr. ${profile.firstName} ${profile.lastName}. Here is your high-level overview.`
            : 'Loading your workspace...'
        }
      >
        {profile?.verified && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sand-50 text-sand-900 border border-sand-200">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Verified {profile.specialty}
          </span>
        )}
      </FeatureHeader>

      {/* ── KPI Strip ── */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isKpiLoading ? (
          <>
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </>
        ) : (
          <>
            <Card className="cursor-pointer border-transparent hover:shadow-sm transition-shadow" onClick={() => handleNavigate('/clinic-hours')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-50 text-sand-900 shrink-0">
                  <DoctorIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sand-900 leading-none">{weeklyPatientCount}</p>
                  <p className="text-xs text-sand-500 font-medium mt-1">This Week's Patients</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-transparent hover:shadow-sm transition-shadow" onClick={() => handleNavigate('/clinic-hours')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-50 text-sand-900 shrink-0">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sand-900 leading-none">{futurePublishedCount}</p>
                  <p className="text-xs text-sand-500 font-medium mt-1">Upcoming Schedules</p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-transparent hover:shadow-sm transition-shadow" onClick={() => handleNavigate('/doctor/feedback')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-50 text-sand-900 shrink-0">
                  <ProfileIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sand-900 leading-none">
                    {totalReviews > 0 ? `${averageRating.toFixed(1)}★` : '—'}
                  </p>
                  <p className="text-xs text-sand-500 font-medium mt-1">
                    {totalReviews > 0 ? `${totalReviews} review${totalReviews !== 1 ? 's' : ''}` : 'No reviews yet'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer border-transparent hover:shadow-sm transition-shadow" onClick={() => handleNavigate('/doctor/shared-records')}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-50 text-sand-900 shrink-0">
                  <LabIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-sand-900 leading-none">{sharedRecordsTotal}</p>
                  <p className="text-xs text-sand-500 font-medium mt-1">Shared Health Folders</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ── Recent Reviews Feed ── */}
        <div className="lg:col-span-2">
          <Card className="border-transparent">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <CardTitle>Recent Patient Reviews</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isReviewsLoading ? (
                <div className="space-y-4">
                   <SkeletonBlock className="h-24 w-full" />
                   <SkeletonBlock className="h-24 w-full" />
                </div>
              ) : recentFeedbacks.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-sand-100 rounded-xl">
                  <p className="text-sm text-sand-500 font-medium mb-1">No reviews yet</p>
                  <p className="text-xs text-sand-400">When patients leave feedback, it will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recentFeedbacks.map((review) => (
                    <div key={review.id} className="bg-sand-50/50 border border-sand-100 p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-1 mb-2 text-olive-600">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-sand-300 fill-sand-200'}`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm text-sand-700 italic line-clamp-3">"{review.comments || 'No written comment'}"</p>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-sand-400 mt-3">
                        {new Date(review.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Recent Activity Feed ── */}
        <div className="space-y-5">
          {!isNotificationsLoading && recentNotifications.length > 0 && (
            <Card className="border-transparent">
              <CardHeader className="pb-0">
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="divide-y divide-sand-100">
                  {recentNotifications.map((notif) => (
                    <div key={notif.id} className="py-3 flex items-start gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-sand-300' : 'bg-olive-600'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-sand-900 leading-snug">{notif.title}</p>
                        <p className="text-xs text-sand-500 mt-0.5 line-clamp-1">{notif.body}</p>
                      </div>
                      <span className="text-[10px] text-sand-400 font-medium shrink-0 mt-0.5">
                        {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {profile && !profile.verified && (
            <Card className="border-olive-200 bg-olive-50/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-olive-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-sand-900">Profile not verified</p>
                    <p className="text-xs text-olive-700 mt-0.5">Submit your credentials for verification to appear in the patient marketplace.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
