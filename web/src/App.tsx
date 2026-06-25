/**
 * Aethea Medical Platform — Web App
 * Landing Page + Dashboard + Feature Routing
 * Optimized: Lazy loading, code splitting, WCAG 2.1 AA accessibility
 */

import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
import { AuthProvider } from './contexts/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { AiUploadProvider, useAiUpload } from './contexts/AiUploadContext';
import { ScanUploadProvider } from './contexts/ScanUploadContext';
import { useAuth } from '@core/auth/useAuth';
import type { AccountType } from '@core/auth/auth-types';
import { getPostLoginPath, resolveAccountStatus, resolveAccountType, resolveMustChangePassword } from './lib/authResolution';
import { PublicNavbar } from './components/PublicNavbar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';

import { UiNotificationsProvider, useUiNotifications } from './contexts/UiNotificationsProvider';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { UploadLabModal } from './pages/LabResults/UploadLabModal';
import PatientFeedbackPrompt from './components/PatientFeedbackPrompt';
import { Sidebar } from './components/Sidebar';
import { DynamicIsland } from './components/DynamicIsland';
import { AdminLayout as AdminLayoutUI } from './layouts/AdminLayout';
/* ── Lazy-loaded page components (code splitting for performance) ── */
const LabResultsPage = lazy(() => import('./pages/LabResults'));
const ScansPage = lazy(() => import('./pages/Scans'));
const MedicineGuidePage = lazy(() => import('./pages/MedicineGuide'));
const MedicineDetailsPage = lazy(() => import('./pages/MedicineDetails'));
const DoctorFinderPage = lazy(() => import('./pages/DoctorFinder'));
const ReservationsPage = lazy(() => import('./pages/Reservations'));
const BookDoctorPage = lazy(() => import('./pages/AppointmentsMarketplace'));

const NotificationsPage = lazy(() => import('./pages/Notifications'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirm'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfile'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsers'));
const AdminUserDetailsPage = lazy(() => import('./pages/AdminUserDetails'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard'));
const AdminAuditLogPage = lazy(() => import('./pages/AdminAuditLog'));
const StaffVerificationPage = lazy(() => import('./pages/StaffVerification'));
const ClinicHoursPage = lazy(() => import('./pages/DoctorReservations'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboard'));
const DoctorQueuePage = lazy(() => import('./pages/DoctorQueue'));
const DoctorSharedRecordsPage = lazy(() => import('./pages/DoctorSharedRecords'));
const DoctorFeedbackPage = lazy(() => import('./pages/DoctorFeedback'));
const ResearchPage = lazy(() => import('./pages/Research'));

const MaintenancePage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
    <div className="text-center space-y-4 max-w-md p-8 border border-sand-200 rounded-lg shadow-sm bg-surface-card">
      <h1 className="text-2xl font-bold text-sand-900">Service Temporarily Unavailable</h1>
      <p className="text-sand-600 leading-relaxed">
        The Aethea backend is currently undergoing maintenance or experiencing high load.
        Please try again in a few minutes.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="mt-6 px-4 py-2 bg-aethea-600 text-white rounded font-medium hover:bg-aethea-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-aethea-600"
      >
        Reload Application
      </button>
    </div>
  </div>
);

const RootRoute = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);
  const authFlowType = params.get('type') ?? hashParams.get('type');

  if (authFlowType === 'recovery') {
    return <Navigate to={`/reset-password${location.search}${location.hash}`} replace />;
  }

  const hasAuthCallback =
    params.has('code') ||
    params.has('error') ||
    params.has('error_description') ||
    params.has('type');

  if (hasAuthCallback) {
    return <Navigate to={`/auth/confirm${location.search}`} replace />;
  }

  // Removed auto-redirect so logged-in users can view the Landing Page

  return <LandingPage />;
};

// Global Maintenance Listener
const GlobalMaintenanceListener = () => {
  const [isMaintenance, setIsMaintenance] = useState(false);

  React.useEffect(() => {
    const handleMaintenance = () => setIsMaintenance(true);

    window.addEventListener('maintenance-mode', handleMaintenance);
    return () => window.removeEventListener('maintenance-mode', handleMaintenance);
  }, []);

  if (isMaintenance) {
    return <Navigate to="/maintenance" replace />;
  }

  return null;
};

// Global API Error Listener
const GlobalApiErrorListener = () => {
  const { notifyError } = useUiNotifications();

  React.useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string; details?: string; title?: string }>;
      const detail = customEvent.detail ?? {};
      
      // We explicitly DO NOT pass detail.details to the UI to avoid leaking technical stack traces or HTTP 500 endpoints.
      notifyError(
        detail.title ?? 'Server Error',
        detail.message ?? 'Something went wrong while calling the server.',
        { autoCloseMs: 6000 }
      );
    };

    window.addEventListener('aethea-api-error', handleApiError as EventListener);
    return () => window.removeEventListener('aethea-api-error', handleApiError as EventListener);
  }, [notifyError]);

  return null;
};

/* ── Protected Route — redirects to /login if not authenticated ── */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  const accountType = resolveAccountType(session, profile?.accountType);
  const accountStatus = resolveAccountStatus(session, profile?.accountStatus);
  const mustChangePassword = resolveMustChangePassword(session, profile?.mustChangePassword);

  if (!accountType) {
    return <PageLoader />;
  }

  // We enforce this for all users who bypassed standard registration (Google SSO, Invited Staff)
  // Test accounts can skip it.
  const isTestAccount = [
    '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7',
    'ae0b9899-7075-4b2d-bfaa-93e3aed947bc',
    'db2417ae-914d-468f-9db1-0503fb556b24',
    'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9',
  ].includes(user.id);

  const isProfileIncomplete =
    accountType === 'patient' &&
    !isTestAccount &&
    (!profile?.phone || !profile?.dateOfBirth || !profile?.gender);

  if (accountStatus === 'suspended' || accountStatus === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface">
        <div className="text-center space-y-4 max-w-md p-8 border border-sand-200 rounded-lg shadow-sm bg-surface-card">
          <h1 className="text-2xl font-bold text-aethea-900">Account {accountStatus === 'suspended' ? 'Suspended' : 'Rejected'}</h1>
          <p className="text-sand-600 leading-relaxed">
            Your account has been {accountStatus}. Please contact administration for more details.
          </p>
        </div>
      </div>
    );
  }

  if (isProfileIncomplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  const isPendingStaff =
    (accountType === 'doctor' || accountType === 'pharmacist') && accountStatus === 'pending';

  if (isPendingStaff && location.pathname !== '/staff-verification') {
    return <Navigate to="/staff-verification" replace />;
  }

  // Admin accounts with must_change_password=true are locked out of all routes
  // until they change their password on the Profile page.
  if (accountType === 'admin' && mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  // Bypass standard user dashboard for doctors
  if (accountType === 'doctor' && location.pathname === '/dashboard') {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  // Bypass standard user dashboard for admins
  if (accountType === 'admin' && location.pathname === '/dashboard') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (accountType === 'pharmacist' && location.pathname === '/dashboard') {
    return <Navigate to="/clinic-hours" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, profile, loading } = useAuth();

  // While AuthProvider is still initializing (loading=true), check storage
  // synchronously to decide whether to show a loader or the public page.
  // This prevents the login form from flashing during back/forward navigation
  // when a valid session exists but hasn't hydrated yet.
  if (loading) {
    const hasStoredSession = typeof window !== 'undefined' &&
      (window.localStorage.getItem('medical-platform-auth') != null ||
        window.sessionStorage.getItem('medical-platform-auth') != null);
    // Only block with loader if there's actually a token to hydrate;
    // otherwise fall through so first-time visitors see the form immediately.
    if (hasStoredSession) {
      return <PageLoader />;
    }
  }

  if (user && session) {
    const accountType = resolveAccountType(session, profile?.accountType);
    if (!accountType) return <PageLoader />;
    return <Navigate to={getPostLoginPath(accountType)} replace />;
  }

  return <>{children}</>;
};

const RoleRoute = ({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: AccountType[];
}) => {
  const { user, session, profile, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  const accountType = resolveAccountType(session, profile?.accountType);
  if (!accountType || !allowed.includes(accountType)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/* ── Loading Fallback ── */
const PageLoader = () => (
  <div className="flex w-full items-center justify-center py-12" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-sand-200 border-t-aethea-600" />
    <span className="sr-only">Loading...</span>
  </div>
);

const ImageWithFallback = ({
  src,
  alt,
  className,
  loading = 'lazy',
  fallback,
}: {
  src: string;
  alt: string;
  className: string;
  loading?: 'lazy' | 'eager';
  fallback: React.ReactNode;
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
    />
  );
};

/* ───────── Inline Illustration Components ───────── */

/* ───────── Landing Page ───────── */

const LANDING_ABOUT_IMAGE_SRC = '/AboutAethea.png';

const LandingPage = () => {
  const { user, session } = useAuth();
  const signupPath = user && session ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen overflow-x-hidden font-sans bg-organic-linen text-sand-900 selection:bg-aethea-100 selection:text-aethea-900">
      
      {/* ── Minimalist Navigation ── */}
      <PublicNavbar />

      <main id="landing-main" className="pt-20">
        
        {/* ── 1. Hero Section ("Clarity in Care") ── */}
        <section className="min-h-[calc(100vh-5rem)] pt-4 pb-16 px-6 md:px-12 flex items-center mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-8 items-center w-full">
            
            {/* Left Text */}
            <div className="max-w-xl lg:pl-8 mx-auto lg:mx-0 text-center lg:text-left z-10">
              <h1 className="font-serif text-6xl md:text-[85px] leading-[1.05] text-sand-900 mb-8 tracking-tight">
                Clarity in Care.
              </h1>
              <p className="text-[16px] md:text-[18px] text-sand-600 font-light leading-[1.8] mb-12 max-w-lg mx-auto lg:mx-0">
                A sanctuary for your medical history. Seamlessly connect your lab results, scans, and care team in one tranquil space.
              </p>
              <Link to={signupPath} className="inline-flex h-12 items-center justify-center bg-aethea-800 px-8 rounded-full text-[12px] font-bold tracking-[0.15em] uppercase text-white hover:bg-aethea-900 transition-colors shadow-sm">
                Enter Sanctuary
              </Link>
            </div>
            
            {/* Right Image Blob */}
            <div className="relative w-full aspect-square max-w-[800px] mx-auto flex items-center justify-center">
              {/* Inner Image Blob */}
              <div className="relative w-[90%] h-[90%] shape-blob-1 overflow-hidden shadow-sm z-10">
                <ImageWithFallback
                  src="/LandingPageFirstImage.webp"
                  alt="Medical professional holding a tablet"
                  className="w-full h-full object-cover object-center"
                  fallback={<div className="w-full h-full bg-organic-terracotta/30 flex items-center justify-center font-serif text-aethea-800">Visualizing Sanctuary</div>}
                />
              </div>
            </div>
            
          </div>
        </section>

        {/* ── 2. The Intelligent Archive ── */}
        <section id="sanctuary" className="py-32 px-6 md:px-12 mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            
            {/* Left Blob */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] shape-blob-3 overflow-hidden shadow-sm z-10 hover:scale-105 transition-transform duration-1000">
                <ImageWithFallback
                  src="/Archive.png"
                  alt="The Intelligent Archive"
                  className="w-full h-full object-cover object-center"
                  fallback={<div className="w-full h-full bg-organic-sandsoft flex items-center justify-center font-serif text-aethea-800">Archive</div>}
                />
              </div>
            </div>
            
            {/* Right Text */}
            <div className="max-w-lg text-center lg:text-left mx-auto lg:mx-0">
              <h2 className="font-serif text-4xl md:text-[42px] text-sand-900 mb-6 tracking-wide">The Intelligent Archive</h2>
              <p className="text-[16px] md:text-[18px] text-sand-600 font-light leading-[1.8]">
                Decipher your body. Upload complex lab reports and let our system translate them into clear, actionable insights without the clinical noise.
              </p>
            </div>
            
          </div>
        </section>

        {/* ── The Care Continuum / Deep Breath ── */}
        <section className="py-24 px-6 md:px-12 mx-auto max-w-[1400px] text-center relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-organic-terracotta/10 shape-blob-1 blur-3xl -z-10"></div>
          <div className="max-w-4xl mx-auto px-4">
            <h3 className="font-serif text-3xl md:text-5xl leading-[1.4] text-sand-800 font-light italic tracking-wide">
              "Healing shouldn't feel like a sterile waiting room.<br className="hidden md:block" /> It should feel like <span className="text-aethea-700 font-medium">a deep breath</span>."
            </h3>
          </div>
        </section>

        {/* ── 3. About Aethea ── */}
        <section id="about" className="py-32 px-6 md:px-12 mx-auto max-w-[1400px]">
          <div className="grid lg:grid-cols-[1fr_1.05fr] gap-16 lg:gap-24 items-center">
            <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0 lg:pl-8">
              <p className="text-[11px] font-medium tracking-[0.24em] uppercase text-aethea-700 mb-5">About Aethea</p>
              <h2 className="font-serif text-4xl md:text-[48px] leading-[1.15] text-sand-900 mb-7 tracking-wide">
                Human care, organized by intelligent records.
              </h2>
              <p className="text-[16px] md:text-[18px] text-sand-600 font-light leading-[1.8] mb-10">
                Aethea brings your medical history into one calm place, helping patients and care teams understand lab results, scans, appointments, and follow-up needs with less friction and more clarity.
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  ['Clear Records', 'Reports and scans arranged around your care journey.'],
                  ['AI Assistance', 'Complex results translated into calmer, readable context.'],
                  ['Human Continuity', 'Doctors, pharmacists, and patients working from the same story.'],
                ].map(([title, detail]) => (
                  <div key={title} className="border-t border-sand-200 pt-4">
                    <h3 className="text-[13px] font-bold text-sand-900 mb-2">{title}</h3>
                    <p className="text-[13px] leading-relaxed text-sand-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              {LANDING_ABOUT_IMAGE_SRC ? (
                <div className="relative w-[300px] h-[300px] md:w-[460px] md:h-[380px] shape-blob-1 overflow-hidden shadow-sm z-10">
                  <ImageWithFallback
                    src={LANDING_ABOUT_IMAGE_SRC}
                    alt="Aethea care team reviewing organized medical records"
                    className="w-full h-full object-cover object-center"
                    fallback={<div className="w-full h-full bg-organic-terracotta/20 flex items-center justify-center px-8 text-center font-serif text-aethea-800">Aethea care preview</div>}
                  />
                </div>
              ) : (
                <div className="relative w-[300px] h-[300px] md:w-[460px] md:h-[380px] shape-blob-1 bg-organic-terracotta/20 border border-sand-200/60 z-10 overflow-hidden" aria-label="Aethea story image placeholder">
                  <div className="absolute inset-[18%] shape-blob-3 bg-organic-sandsoft/70" aria-hidden="true"></div>
                  <div className="absolute inset-[34%] shape-blob-2 bg-aethea-100/40" aria-hidden="true"></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 4. Our Idols ── */}
        <section id="experts" className="py-32 px-6 md:px-12 mx-auto max-w-[1400px]">
          <div className="text-center mb-24">
            <p className="text-[11px] font-medium tracking-[0.24em] uppercase text-aethea-700 mb-5">People who we look up to</p>
            <h2 className="font-serif text-4xl md:text-[48px] leading-[1.15] text-sand-900 tracking-wide">
              Our Idols
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-16 justify-center max-w-5xl mx-auto">
            
            {/* Idol 1 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-64 h-64 md:w-80 md:h-80 mb-10 shape-blob-1 overflow-hidden shadow-[0_20px_50px_-12px_rgba(232,220,203,0.8)] hover:shadow-glow-gold relative group cursor-pointer transition-shadow duration-500">
                <img src="/Mostafa-A-El-Sayed.webp" className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" alt="Prof. Mostafa El-Sayed" loading="lazy" />
              </div>
              <h3 className="font-serif text-[28px] text-sand-900 mb-2">Prof. Mostafa El-Sayed</h3>
              <p className="text-[11px] font-medium tracking-[0.2em] text-sand-500 uppercase">Chemical Physicist</p>
            </div>

            {/* Idol 2 (Staggered layout) */}
            <div className="flex flex-col items-center text-center md:mt-16">
              <div className="w-64 h-64 md:w-80 md:h-80 mb-10 shape-blob-2 overflow-hidden shadow-[0_20px_50px_-12px_rgba(232,220,203,0.8)] hover:shadow-glow-gold relative group cursor-pointer transition-shadow duration-500">
                <img src="/magdy-yacoub.webp" className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" alt="Sir Magdy Yacoub" loading="lazy" />
              </div>
              <h3 className="font-serif text-[28px] text-sand-900 mb-2">Sir Magdy Yacoub</h3>
              <p className="text-[11px] font-medium tracking-[0.2em] text-sand-500 uppercase">Cardiothoracic Surgeon</p>
            </div>

            {/* Idol 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-64 h-64 md:w-80 md:h-80 mb-10 shape-blob-3 overflow-hidden shadow-[0_20px_50px_-12px_rgba(232,220,203,0.8)] hover:shadow-glow-gold relative group cursor-pointer transition-shadow duration-500">
                <img src="/sameera moussa.webp" className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" alt="Dr. Sameera Moussa" loading="lazy" />
              </div>
              <h3 className="font-serif text-[28px] text-sand-900 mb-2">Dr. Sameera Moussa</h3>
              <p className="text-[11px] font-medium tracking-[0.2em] text-sand-500 uppercase">Nuclear Physicist</p>
            </div>
            
          </div>
        </section>

        {/* ── 5. Contact ── */}
        <section id="contact" className="py-28 px-6 md:px-12 mx-auto max-w-[1400px]">
          <div className="max-w-5xl mx-auto border-y border-sand-200 py-16 md:py-20 text-center">
            <p className="text-[11px] font-medium tracking-[0.24em] uppercase text-aethea-700 mb-5">Contact Us</p>
            <h2 className="font-serif text-4xl md:text-[46px] leading-[1.2] text-sand-900 mb-6 tracking-wide">
              Stay close to calmer care.
            </h2>
            <p className="text-[16px] md:text-[18px] text-sand-600 font-light leading-[1.8] max-w-2xl mx-auto mb-10">
              Reach out for support, follow updates, or stay connected as Aethea continues shaping a softer way to manage medical records.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-10">
              {[
                ['Facebook', '#'],
                ['YouTube', '#'],
                ['TikTok', '#'],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="text-[13px] font-bold tracking-[0.18em] uppercase text-sand-500 transition-colors hover:text-aethea-800"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* ── Minimalist Footer ── */}
      <footer className="pb-12 text-center" role="contentinfo">
        <p className="text-xs text-sand-400 font-light tracking-widest uppercase">&copy; 2026 Aethea</p>
      </footer>
    </div>
  );
};
// CapsuleToggle was moved to Sidebar.tsx
// FloatingUploadBar was replaced by DynamicIsland

/* ───────── App Layout ───────── */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isDesktopCollapsed, setDesktopCollapsed] = useState(true);
  const { isModalOpen, setIsModalOpen } = useAiUpload();

  return (
    <div className="flex h-screen overflow-hidden bg-surface relative">
      <PatientFeedbackPrompt />
      
      <UploadLabModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <div className={`hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-in-out ${isDesktopCollapsed ? 'w-[112px]' : 'w-[292px]'}`} aria-hidden="true" />
      
      <Sidebar 
        isOpen={isMobileOpen} 
        onClose={() => setMobileOpen(false)}
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed(!isDesktopCollapsed)}
      />
      
      <main id="main-content" className="relative z-10 min-w-0 flex-1 overflow-y-auto custom-scrollbar" role="main" tabIndex={-1}>
        {/* Dynamic Island replacing Central Navbar */}
        <DynamicIsland 
          isMobileOpen={isMobileOpen} 
          onMobileToggle={() => setMobileOpen(!isMobileOpen)} 
        />

        <div className="w-full min-h-full px-4 sm:px-6 lg:px-8 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <AppLayout>
        <Suspense key={location.pathname} fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
};

const AdminLayout = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <RoleRoute allowed={['admin']}>
        <Suspense key={location.pathname} fallback={<PageLoader />}>
          <AdminLayoutUI />
        </Suspense>
      </RoleRoute>
    </ProtectedRoute>
  );
};

const StaffLayout = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <RoleRoute allowed={['doctor', 'pharmacist']}>
        <AppLayout>
          <Suspense key={location.pathname} fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </RoleRoute>
    </ProtectedRoute>
  );
};

const DoctorLayout = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <RoleRoute allowed={['doctor']}>
        <AppLayout>
          <Suspense key={location.pathname} fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </RoleRoute>
    </ProtectedRoute>
  );
};

/* ───────── Dashboard ───────── */

// Dashboard has been moved to src/pages/Dashboard/index.tsx

/* ───────── Routes ───────── */
function AppRoutes() {
  return (
    <>
      <GlobalMaintenanceListener />
      <GlobalApiErrorListener />
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterForm /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
        <Route path="/auth/confirm" element={<Suspense fallback={<PageLoader />}><AuthConfirmPage /></Suspense>} />
        
        {/* ── Private route (no layout) ── */}
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <CompleteProfilePage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* ── Dashboard Layout Routes (Persistent Sidebar) ── */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lab-results" element={<LabResultsPage />} />
          <Route path="/scans" element={<ScansPage />} />
          <Route path="/medicines" element={<MedicineGuidePage />} />
          <Route path="/medicines/:id" element={<MedicineDetailsPage />} />
          <Route path="/care-locator" element={<DoctorFinderPage />} />
          <Route path="/book-doctor" element={<BookDoctorPage />} />
          <Route path="/my-appointments" element={<ReservationsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* ── Admin Routes ── */}
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailsPage />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLogPage />} />
        </Route>

        {/* ── Staff Routes ── */}
        <Route element={<StaffLayout />}>
          <Route path="/staff-verification" element={<StaffVerificationPage />} />
          <Route path="/clinic-hours" element={<ClinicHoursPage />} />
        </Route>

        {/* ── Doctor Routes ── */}
        <Route element={<DoctorLayout />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
          <Route path="/doctor/queue" element={<DoctorQueuePage />} />
          <Route path="/doctor/shared-records" element={<DoctorSharedRecordsPage />} />
          <Route path="/doctor/feedback" element={<DoctorFeedbackPage />} />
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AiUploadProvider>
            <ScanUploadProvider>
              <UiNotificationsProvider>
                <Toaster position="top-right" />
                <NotificationsProvider>
                  <AppRoutes />
                </NotificationsProvider>
              </UiNotificationsProvider>
            </ScanUploadProvider>
          </AiUploadProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

