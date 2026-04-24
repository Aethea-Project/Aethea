import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { MedicineIcon, LabIcon, DoctorIcon, NutritionIcon } from '../../components/Icons';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { notifications } = useNotifications();

  // Resolution for User Name
  const profileDerivedName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const metadataFullName = typeof user?.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : undefined;

  const metadataName = typeof user?.user_metadata?.name === 'string'
    ? user.user_metadata.name
    : undefined;

  const emailFallbackName = user?.email?.split('@')[0];

  const userName =
    profile?.fullName ??
    (profileDerivedName || undefined) ??
    metadataFullName ??
    metadataName ??
    emailFallbackName ??
    'Patient';

  // Format the date using English standard format
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const recentNotifications = notifications.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Storytelling Hero Image Placeholder ── */}
      <div className="mb-12 relative w-full h-[380px] overflow-hidden rounded-[2.5rem] bg-slate-800 shadow-2xl flex items-center justify-center p-8 text-center group">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/10 z-10" />
        
        {/* Image upload intention instruction */}
        <div className="absolute inset-0 z-0 flex items-center justify-center text-slate-700/50">
          <svg className="w-48 h-48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>

        {/* Placeholder Content overlay */}
        <div className="relative z-20 flex flex-col items-center max-w-2xl text-white mt-12">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-3">
            Welcome back, {userName}
          </h1>
          <p className="text-lg font-medium text-slate-300 mb-6 drop-shadow-sm">
            {todayLabel}
          </p>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-sm leading-relaxed max-w-lg mb-6">
            <strong className="text-teal-400">🖼️ Image Placeholder Note:</strong><br/>
            I redesigned your landing page dashboard to use <strong>Scroll Storytelling!</strong><br/>
            You need to insert a beautiful, high-quality photograph here.<br/>
            <span className="opacity-75">(Recommended size: 1200 x 400 pixels)</span>
          </div>
        </div>
      </div>

      {/* ── Main Features Grid ── */}
      <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2" role="list" aria-label="Dashboard features">
        <Link
          to="/medicines"
          className="group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          role="listitem"
        >
          <div className="flex w-full flex-col p-6 sm:pl-8">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100/50 text-teal-600 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700" aria-hidden="true">
              <MedicineIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">Medicine Guide</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Check safety, side effects, and drug interactions.</p>
          </div>
          <div className="absolute right-6 top-6 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-teal-500" aria-hidden="true">
            &rarr;
          </div>
        </Link>

        <Link
          to="/lab-results"
          className="group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
          role="listitem"
        >
          <div className="flex w-full flex-col p-6 sm:pl-8">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100/50 text-violet-600 transition-colors group-hover:bg-violet-100 group-hover:text-violet-700" aria-hidden="true">
              <LabIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-violet-700 transition-colors">Lab Results</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">View recent test results and track health trends.</p>
          </div>
          <div className="absolute right-6 top-6 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-violet-500" aria-hidden="true">
            &rarr;
          </div>
        </Link>

        <Link
          to="/care-locator"
          className="group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          role="listitem"
        >
          <div className="flex w-full flex-col p-6 sm:pl-8">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100/50 text-blue-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700" aria-hidden="true">
              <DoctorIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Care Locator</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Find doctors, clinics, and book your appointments.</p>
          </div>
          <div className="absolute right-6 top-6 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-500" aria-hidden="true">
            &rarr;
          </div>
        </Link>

        <Link
          to="/nutrition"
          className="group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          role="listitem"
        >
          <div className="flex w-full flex-col p-6 sm:pl-8">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100/50 text-amber-600 transition-colors group-hover:bg-amber-100 group-hover:text-amber-700" aria-hidden="true">
              <NutritionIcon className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors">Nutrition</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Discover diet plans and actionable daily tips.</p>
          </div>
          <div className="absolute right-6 top-6 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-amber-500" aria-hidden="true">
            &rarr;
          </div>
        </Link>
      </div>

      {/* ── Recent Activity Feed ── */}
      {recentNotifications.length > 0 && (
        <section aria-label="Recent activity">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {recentNotifications.map((item) => (
                <li key={item.id} className="relative flex items-start gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-teal-500 ring-4 ring-teal-50" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <time className="shrink-0 text-xs text-slate-400" dateTime={new Date(item.createdAt).toISOString()}>
                        {new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
