/**
 * Aethea Medical Platform — Web App
 * Landing Page + Dashboard + Feature Routing
 * Optimized: Lazy loading, code splitting, WCAG 2.1 AA accessibility
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from '@core/auth/useAuth';
import { decodeJWT } from '@core/auth/token-manager';
import type { AccountType, AccountStatus } from '@core/auth/auth-types';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { imageAssets } from './constants/imageAssets';
import { UiNotificationsProvider, useUiNotifications } from './contexts/UiNotificationsProvider';
import { NotificationCenter } from './components/NotificationCenter';
import { useNotifications } from './hooks/useNotifications';

import {
  DashboardIcon, LabIcon, ScanIcon, MedicineIcon, DoctorIcon,
  NutritionIcon, RecoveryIcon, ProfileIcon, MenuIcon, CalendarIcon, ChatIcon
} from './components/Icons';

/* ── Lazy-loaded page components (code splitting for performance) ── */
const LabResultsPage = lazy(() => import('./pages/LabResults'));
const ScansPage = lazy(() => import('./pages/Scans'));
const MedicineGuidePage = lazy(() => import('./pages/MedicineGuide'));
const DoctorFinderPage = lazy(() => import('./pages/DoctorFinder'));
const ReservationsPage = lazy(() => import('./pages/Reservations'));
const AppointmentsMarketplacePage = lazy(() => import('./pages/AppointmentsMarketplace'));
const NutritionPlannerPage = lazy(() => import('./pages/NutritionPlanner'));
const RecoveryAssistantPage = lazy(() => import('./pages/RecoveryAssistant'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AuthConfirmPage = lazy(() => import('./pages/AuthConfirm'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfile'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsers'));
const AdminUserDetailsPage = lazy(() => import('./pages/AdminUserDetails'));
const StaffVerificationPage = lazy(() => import('./pages/StaffVerification'));
const DoctorReservationsPage = lazy(() => import('./pages/DoctorReservations'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));

const MaintenancePage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white">
    <div className="text-center space-y-4 max-w-md p-8 border border-gray-100 rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold text-gray-900">Service Temporarily Unavailable</h1>
      <p className="text-gray-600 leading-relaxed">
        The Aethea backend is currently undergoing maintenance or experiencing high load.
        Please try again in a few minutes.
      </p>
      <button
        onClick={() => window.location.href = '/'}
        className="mt-6 px-4 py-2 bg-[#0D9488] text-white rounded font-medium focus:ring-2 focus:ring-offset-2 focus:ring-[#0D9488]"
      >
        Reload Application
      </button>
    </div>
  </div>
);

const parseAccountType = (value: unknown): AccountType | null => {
  return value === 'patient' || value === 'doctor' || value === 'pharmacist' || value === 'admin'
    ? value
    : null;
};

const parseAccountStatus = (value: unknown): AccountStatus | null => {
  return value === 'pending' || value === 'active' || value === 'suspended' || value === 'rejected'
    ? value
    : null;
};

const getAccountTypeFromSession = (accessToken?: string): AccountType | null => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  return parseAccountType((decoded as { account_type?: unknown }).account_type);
};

const getAccountStatusFromSession = (accessToken?: string): AccountStatus | null => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  return parseAccountStatus((decoded as { account_status?: unknown }).account_status);
};

const getMustChangePasswordFromSession = (accessToken?: string): boolean => {
  if (!accessToken) return false;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return false;
  return (decoded as { must_change_password?: unknown }).must_change_password === true;
};

const getAccountTypeFromMetadata = (session: { user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined): AccountType | null => {
  const appType = parseAccountType(session?.user?.app_metadata?.account_type);
  if (appType) return appType;
  const userTypeSnake = parseAccountType(session?.user?.user_metadata?.account_type);
  if (userTypeSnake) return userTypeSnake;
  return parseAccountType(session?.user?.user_metadata?.accountType);
};

const getAccountStatusFromMetadata = (session: { user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined): AccountStatus | null => {
  const appStatus = parseAccountStatus(session?.user?.app_metadata?.account_status);
  if (appStatus) return appStatus;
  const userStatusSnake = parseAccountStatus(session?.user?.user_metadata?.account_status);
  if (userStatusSnake) return userStatusSnake;
  return parseAccountStatus(session?.user?.user_metadata?.accountStatus);
};

const getMustChangePasswordFromMetadata = (session: { user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined): boolean => {
  return session?.user?.app_metadata?.must_change_password === true ||
    session?.user?.user_metadata?.must_change_password === true ||
    session?.user?.user_metadata?.mustChangePassword === true;
};

const resolveAccountType = (
  session: { access_token?: string; user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined,
  profileAccountType: AccountType | null | undefined,
): AccountType | null => {
  return getAccountTypeFromSession(session?.access_token) ?? getAccountTypeFromMetadata(session) ?? profileAccountType ?? null;
};

const resolveAccountStatus = (
  session: { access_token?: string; user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined,
  profileAccountStatus: AccountStatus | null | undefined,
): AccountStatus | null => {
  return getAccountStatusFromSession(session?.access_token) ?? getAccountStatusFromMetadata(session) ?? profileAccountStatus ?? null;
};

const resolveMustChangePassword = (
  session: { access_token?: string; user?: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } } | null | undefined,
  profileMustChangePassword: boolean | undefined,
): boolean => {
  return getMustChangePasswordFromSession(session?.access_token) || getMustChangePasswordFromMetadata(session) || profileMustChangePassword === true;
};

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

  const isPendingStaff =
    (accountType === 'doctor' || accountType === 'pharmacist') && accountStatus === 'pending';

  if (isPendingStaff && location.pathname !== '/staff-verification') {
    return <Navigate to="/staff-verification" replace />;
  }

  // Force users to complete profile details first if missing crucial fields
  // We only enforce this for Google sign-in users so test accounts and standard users can skip it
  const isGoogleSignIn = user.app_metadata?.provider === 'google';

  const isTestAccount = [
    '1c8e4f56-8af4-452a-ae6f-7b20a6d3d9b7',
    'ae0b9899-7075-4b2d-bfaa-93e3aed947bc',
    'db2417ae-914d-468f-9db1-0503fb556b24',
    'c58b6c74-f6d3-4fe8-90fd-ed1ad15840c9',
  ].includes(user.id);

  const isProfileIncomplete =
    isGoogleSignIn &&
    !isTestAccount &&
    (!profile?.phone || !profile?.dateOfBirth || !profile?.gender);

  if (isProfileIncomplete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  // Admin accounts with must_change_password=true are locked out of all routes
  // until they change their password on the Profile page.
  if (accountType === 'admin' && mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading } = useAuth();

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
    return <Navigate to="/dashboard" replace />;
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
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
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

const HeroIllustration = () => (
  <svg viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full max-w-2xl">
    {/* Soft ambient blobs */}
    <ellipse cx="260" cy="220" rx="220" ry="190" fill="url(#heroGrad)" opacity="0.10" />
    <ellipse cx="400" cy="130" rx="90" ry="90" fill="#2DD4BF" opacity="0.06" />
    <ellipse cx="120" cy="340" rx="70" ry="70" fill="#7C3AED" opacity="0.05" />

    {/* Main clipboard / medical record */}
    <rect x="160" y="60" width="200" height="280" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="2" />
    <rect x="210" y="45" width="100" height="30" rx="15" fill="#0D9488" />
    <circle cx="260" cy="60" r="6" fill="white" />
    {/* Lines on clipboard */}
    <rect x="190" y="110" width="140" height="8" rx="4" fill="#F1F5F9" />
    <rect x="190" y="130" width="100" height="8" rx="4" fill="#F1F5F9" />
    <rect x="190" y="160" width="140" height="8" rx="4" fill="#E0F2FE" />
    <rect x="190" y="180" width="120" height="8" rx="4" fill="#E0F2FE" />
    {/* Status indicators */}
    <circle cx="200" cy="220" r="6" fill="#10B981" />
    <rect x="215" y="216" width="80" height="8" rx="4" fill="#D1FAE5" />
    <circle cx="200" cy="245" r="6" fill="#F59E0B" />
    <rect x="215" y="241" width="60" height="8" rx="4" fill="#FEF3C7" />
    <circle cx="200" cy="270" r="6" fill="#10B981" />
    <rect x="215" y="266" width="90" height="8" rx="4" fill="#D1FAE5" />
    {/* Check mark on clipboard */}
    <circle cx="330" cy="290" r="18" fill="#10B981" opacity="0.15" />
    <path d="M322 290 L328 296 L340 284" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

    {/* Floating card — Scan */}
    <g filter="url(#shadow1)">
      <rect x="370" y="160" width="130" height="90" rx="16" fill="white" />
      <rect x="385" y="175" width="40" height="40" rx="10" fill="#CCFBF1" />
      <rect x="385" y="225" width="80" height="6" rx="3" fill="#F1F5F9" />
      <rect x="385" y="235" width="50" height="6" rx="3" fill="#F1F5F9" />
      <circle cx="405" cy="195" r="10" fill="#0D9488" opacity="0.3" />
    </g>

    {/* Floating card — Heart / Appointment */}
    <g filter="url(#shadow1)">
      <rect x="20" y="150" width="130" height="80" rx="16" fill="white" />
      <circle cx="55" cy="180" r="16" fill="#FEE2E2" />
      <path d="M49 178 C49 175 52 172 55 176 C58 172 61 175 61 178 C61 182 55 186 55 186 C55 186 49 182 49 178Z" fill="#EF4444" />
      <rect x="80" y="172" width="55" height="6" rx="3" fill="#F1F5F9" />
      <rect x="80" y="184" width="40" height="6" rx="3" fill="#F1F5F9" />
      <rect x="35" y="210" width="90" height="6" rx="3" fill="#DBEAFE" />
    </g>

    {/* Heartbeat line */}
    <path d="M60 360 L140 360 L160 340 L175 380 L190 345 L205 365 L220 355 L460 355" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />

    {/* Floating crosses */}
    <g opacity="0.15">
      <rect x="90" y="90" width="3" height="16" rx="1.5" fill="#0D9488" />
      <rect x="83.5" y="96.5" width="16" height="3" rx="1.5" fill="#0D9488" />
    </g>
    <g opacity="0.1">
      <rect x="430" y="80" width="3" height="16" rx="1.5" fill="#7C3AED" />
      <rect x="423.5" y="86.5" width="16" height="3" rx="1.5" fill="#7C3AED" />
    </g>
    <g opacity="0.12">
      <rect x="450" y="310" width="3" height="14" rx="1.5" fill="#0D9488" />
      <rect x="443.5" y="315.5" width="16" height="3" rx="1.5" fill="#0D9488" />
    </g>

    {/* Defs */}
    <defs>
      <radialGradient id="heroGrad" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#14B8A6" />
        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
      </radialGradient>
      <filter id="shadow1" x="-10" y="-10" width="200" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.08" />
      </filter>
    </defs>
  </svg>
);

/* ───────── Landing Page ───────── */

const LandingPage = () => {
  const { user, session } = useAuth();
  const signupPath = user && session ? '/dashboard' : '/register';

  const trustIndicators = [
    { label: 'HIPAA Compliant', detail: 'Security standard' },
    { label: 'End-to-End Encrypted', detail: 'Private by design' },
    { label: '24/7 Access', detail: 'Anytime, anywhere' },
  ] as const;

  const featureCards = [
    {
      icon: <LabIcon />,
      title: 'Lab Results',
      desc: 'View blood work, biomarkers, and historical trends with smart status indicators.',
      type: 'lab',
      path: '/lab-results',
      imageSrc: imageAssets.features.lab,
      imageAlt: 'Preview of lab results dashboard',
    },
    {
      icon: <ScanIcon />,
      title: 'Medical Scans',
      desc: 'Browse X-rays, MRIs, and CT scans with zoom and comparison tools.',
      type: 'scan',
      path: '/scans',
      imageSrc: imageAssets.features.scan,
      imageAlt: 'Preview of medical scans viewer',
    },
    {
      icon: <MedicineIcon />,
      title: 'Medicine Guide',
      desc: 'Check drug safety, interactions, and get personalized warnings.',
      type: 'medicine',
      path: '/medicines',
      imageSrc: imageAssets.features.medicine,
      imageAlt: 'Preview of medicine safety checker',
    },
    {
      icon: <DoctorIcon />,
      title: 'Care Locator',
      desc: 'Find providers and care locations near you with map-assisted discovery.',
      type: 'doctor',
      path: '/care-locator',
      imageSrc: imageAssets.features.doctor,
      imageAlt: 'Preview of doctor search and booking',
    },
    {
      icon: <NutritionIcon />,
      title: 'Nutrition Planner',
      desc: 'AI-powered meal plans tailored to your health profile.',
      type: 'nutrition',
      path: '/nutrition',
      imageSrc: imageAssets.features.nutrition,
      imageAlt: 'Preview of personalized meal planning view',
    },
    {
      icon: <RecoveryIcon />,
      title: 'Recovery Assistant',
      desc: 'Post-surgery exercise programs with guided instructions.',
      type: 'recovery',
      path: '/recovery',
      imageSrc: imageAssets.features.recovery,
      imageAlt: 'Preview of recovery progress and exercise plan',
    },
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-slate-50/85 backdrop-blur print:hidden" role="banner">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 text-teal-800 no-underline" aria-label="Aethea - Home">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-700 text-sm font-semibold text-white" aria-hidden="true">A</div>
            <span className="font-['Fraunces'] text-xl font-bold tracking-tight">Aethea</span>
          </Link>
          <nav className="hidden gap-10 lg:flex" aria-label="Landing page navigation">
            <a className="text-base font-medium text-slate-600 transition-colors hover:text-teal-700" href="#features">Features</a>
            <a className="text-base font-medium text-slate-600 transition-colors hover:text-teal-700" href="#about">About</a>
          </nav>
          <div className="flex items-center gap-3">
            {user && session ? (
              <>
                <Link to="/dashboard" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                  Go to Dashboard
                </Link>
                <Link to="/profile" className="group inline-flex items-center" aria-label="Your profile">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white transition-shadow group-hover:ring-2 group-hover:ring-teal-200">
                    {user.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-700 transition hover:border-teal-500 hover:bg-teal-50">
                  Sign In
                </Link>
                <Link to="/register" className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="landing-main">
        <section className="mx-auto grid min-h-[90vh] max-w-6xl items-center gap-12 px-6 pt-32 pb-16 text-center lg:grid-cols-2 lg:text-left" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-xl lg:mx-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-teal-500"></span>
              Your Health, Reimagined
            </div>
            <h1 id="hero-heading" className="font-['Fraunces'] text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Your Complete<br /><span className="text-teal-700">Medical Companion</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Aethea brings all your health records, lab results, medical scans,
              and smart care support into one beautiful, secure platform.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link to={signupPath} className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 sm:text-base">
                Create Account
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </Link>
              <a href="#features" className="inline-flex items-center rounded-2xl border-2 border-slate-200 px-8 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 sm:text-base">
                Explore Features
              </a>
            </div>
            <div className="mt-10 flex w-full flex-wrap justify-center gap-6 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-left backdrop-blur lg:w-fit lg:justify-start" role="list" aria-label="Trust indicators">
              {trustIndicators.map(t => (
                <div key={t.label} className="flex items-start gap-2 text-xs font-semibold text-slate-600" role="listitem">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <div className="flex flex-col leading-tight">
                    <span>{t.label}</span>
                    <small className="text-[0.7rem] font-medium text-slate-500">{t.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-first flex items-center justify-center lg:order-last">
            <ImageWithFallback
              src={imageAssets.landingHero}
              alt="Doctor reviewing patient medical records on a digital tablet"
              className="aspect-[4/3] w-full max-w-xl rounded-3xl object-cover shadow-2xl"
              loading="eager"
              fallback={<HeroIllustration />}
            />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="features-heading">
          <div className="mb-14 text-center">
            <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-teal-800">Platform Features</span>
            <h2 id="features-heading" className="mt-4 font-['Fraunces'] text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need<br />In One Place
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">From lab results to appointments — your entire health journey, organized.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
            {featureCards.map((f) => (
              <Link
                to={f.path}
                key={f.type}
                className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50" aria-hidden="true">
                  <ImageWithFallback
                    src={f.imageSrc}
                    alt={f.imageAlt}
                    className="h-full w-full object-cover"
                    fallback={<div className="h-full w-full bg-slate-100"></div>}
                  />
                </div>
                <div className="-mt-8 ml-2 flex h-12 w-12 items-center justify-center rounded-xl border border-white/70 bg-teal-50 text-teal-700 shadow-lg">
                  {f.icon}
                </div>
                <h3 className="px-2 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="px-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                <span className="mt-auto px-2 text-xl opacity-0 -translate-x-2 transition group-hover:translate-x-0 group-hover:opacity-50">→</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="about" className="bg-white px-6 py-24" aria-labelledby="about-heading">
          <div className="mx-auto grid max-w-6xl items-center gap-16 text-center lg:grid-cols-2 lg:text-left">
            <div className="space-y-4">
              <span className="inline-block rounded-full border border-teal-200 bg-teal-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-teal-800">About Aethea</span>
              <h2 id="about-heading" className="font-['Fraunces'] text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Built for Patients,<br />Designed by Experts
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                Aethea is a graduation project showing how modern technology can transform
                the patient healthcare experience. We believe everyone deserves clear,
                instant access to their medical information.
              </p>
              <p className="text-base leading-relaxed text-slate-600">
                Our platform combines clean design with practical medical tools — from viewing
                lab results and scans to checking medicine safety and booking appointments.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-10 lg:justify-start">
                {[
                  { n: '7', l: 'Core Features' },
                  { n: '3', l: 'Platforms' },
                  { n: '100%', l: 'Open Source' },
                ].map(s => (
                  <div key={s.l} className="text-center lg:text-left">
                    <div className="font-['Fraunces'] text-2xl font-extrabold text-teal-700">{s.n}</div>
                    <div className="text-xs font-medium text-slate-600">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <ImageWithFallback
                src={imageAssets.aboutSection}
                alt="Healthcare professionals collaborating with a patient"
                className="w-full max-w-xl rounded-2xl border border-slate-200 object-cover shadow-xl"
                fallback={
                  <div className="relative h-[260px] w-[340px]">
                    <div className="absolute left-0 right-0 top-0 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-900 shadow-lg -rotate-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span>Lab Results — All Normal</span>
                    </div>
                    <div className="absolute left-0 right-0 top-[75px] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-900 shadow-lg rotate-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>MRI scan uploaded successfully</span>
                    </div>
                    <div className="absolute left-0 right-0 top-[150px] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-900 shadow-lg -rotate-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>Appointment with Dr. Chen — Tomorrow</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center print:hidden" aria-labelledby="cta-heading">
        <h2 id="cta-heading" className="font-['Fraunces'] text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">Ready to Take Control<br />of Your Health?</h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">Create your free account to access all features and start managing your health today.</p>
        <Link to={signupPath} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 sm:text-base">
          Create Free Account
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </Link>
      </section>

      <footer className="border-t border-slate-200 bg-white" role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">A</div>
            <span className="text-lg font-semibold text-slate-900">Aethea</span>
          </div>
          <p className="text-sm text-slate-600">&copy; 2026 Aethea — Graduation Project. Built with care for better healthcare.</p>
        </div>
      </footer>
    </div>
  );
};

/* ───────── Sidebar ───────── */

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${isActive
        ? 'bg-teal-600 text-white shadow-xl shadow-teal-600/30 shadow-b-lg -translate-y-0.5 mx-0'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 mx-1'}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={`transition-transform duration-300 ${isActive ? 'w-5 h-5 scale-110 drop-shadow-md text-white' : 'w-5 h-5 opacity-70 group-hover:opacity-100'}`} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
};

const CapsuleToggle = ({ isCollapsed, onClick }: { isCollapsed: boolean; onClick: () => void }) => {
  const [particles, setParticles] = useState<{ id: number; color: string; tx: number; ty: number }[]>([]);

  useEffect(() => {
    if (!isCollapsed) {
      const newParticles = Array.from({ length: 9 }).map((_, i) => {
        const angle = (140 + Math.random() * 80) * (Math.PI / 180);
        const mag = 40 + Math.random() * 60;
        return {
          id: Date.now() + i,
          color: i % 2 === 0 ? 'bg-teal-400' : 'bg-rose-500',
          tx: Math.cos(angle) * mag,
          ty: Math.sin(angle) * mag
        };
      });
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 700);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-1/2 -translate-y-1/2 transition-all duration-500 ease-bounce hover:scale-105 group focus:outline-none flex items-center justify-center drop-shadow-xl hidden lg:flex cursor-pointer"
      style={{ zIndex: 9999, left: isCollapsed ? '-20px' : '268px', width: '40px', height: '80px', opacity: isCollapsed ? 0.9 : 1 }}
      aria-label={isCollapsed ? "Expand menu" : "Collapse menu"}
    >
      {/* SVG Canvas for Guaranteed Sizing */}
      <svg width="40" height="80" viewBox="0 0 40 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 overflow-visible">
        {/* Top Half Teal */}
        <g style={{ transformOrigin: '20px 40px', transform: !isCollapsed ? 'rotate(-60deg)' : 'rotate(0deg)', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <path d="M0 40V20C0 8.954 8.954 0 20 0C31.046 0 40 8.954 40 20V40H0Z" fill="#0f766e" />
        </g>

        {/* Bottom Half Rose */}
        <g style={{ transformOrigin: '20px 40px', transform: !isCollapsed ? 'rotate(60deg)' : 'rotate(0deg)', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <path d="M0 40H40V60C40 71.046 31.046 80 20 80C8.954 80 0 71.046 0 60V40Z" fill="#e11d48" />
        </g>

        {/* Center Node / Hinge */}
        <circle cx="20" cy="40" r="14" fill="#0f172a" stroke="white" strokeWidth="2.5" />
        <g style={{ transformOrigin: '20px 40px', transform: !isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
          <path d="M15 36L21 40L15 44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {/* Particle Overlay */}
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute top-1/2 left-0 w-2.5 h-2.5 rounded-full ${p.color} pointer-events-none animate-particle-blast shadow-sm z-0`}
          style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px` } as React.CSSProperties}
        />
      ))}
    </button>
  );
};

const Sidebar = ({ isOpen, onClose, isCollapsed }: { isOpen: boolean; onClose: () => void; isCollapsed: boolean }) => {
  const { signOut, session, profile } = useAuth();
  const { notifyInfo, notifyError } = useUiNotifications();
  const accountType = resolveAccountType(session, profile?.accountType);
  const isAdmin = accountType === 'admin';

  const handleSignOut = async () => {
    try {
      notifyInfo('Signed out', 'You have been signed out successfully.', undefined, {
        persist: false,
        toast: true,
        autoCloseMs: 2500,
      });
      await signOut();
    } catch (error) {
      notifyError(
        'Sign out failed',
        'Unable to sign out right now.',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-100 bg-white shadow-xl transition-transform duration-500 ease-bounce lg:shadow-sm ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Inner rigid container */}
        <div className="flex flex-col h-full w-full px-5 py-6 bg-white overflow-y-auto no-scrollbar">

          <Link to="/" className="mb-6 flex items-center gap-3 pl-1 no-underline">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white" aria-hidden="true">A</div>
            <span className="text-lg font-semibold text-slate-900">Aethea</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-4 overflow-y-auto" aria-label="Dashboard navigation">
            <div className="flex flex-col gap-1" role="group" aria-labelledby="nav-overview">
              <span className="text-xs font-semibold text-slate-500" id="nav-overview">Overview</span>
              <SidebarItem to="/dashboard" icon={DashboardIcon} label="Dashboard" />
            </div>
            <div className="flex flex-col gap-1" role="group" aria-labelledby="nav-records">
              <span className="text-xs font-semibold text-slate-500" id="nav-records">Health Records</span>
              <SidebarItem to="/lab-results" icon={LabIcon} label="Lab Results" />
              <SidebarItem to="/scans" icon={ScanIcon} label="Medical Scans" />
            </div>
            <div className="flex flex-col gap-1" role="group" aria-labelledby="nav-care">
              <span className="text-xs font-semibold text-slate-500" id="nav-care">Care &amp; Wellness</span>
              <SidebarItem to="/medicines" icon={MedicineIcon} label="Medicines" />
              <SidebarItem to="/care-locator" icon={DoctorIcon} label="Care Locator" />
              <SidebarItem to="/appointments-marketplace" icon={CalendarIcon} label="Appointments Marketplace" />
              <SidebarItem to="/my-appointments" icon={CalendarIcon} label="My Appointments" />
              <SidebarItem to="/nutrition" icon={NutritionIcon} label="Nutrition" />
              <SidebarItem to="/recovery" icon={RecoveryIcon} label="Recovery" />
            </div>
            {(accountType === 'doctor' || accountType === 'pharmacist') && (
              <div className="flex flex-col gap-1" role="group" aria-labelledby="nav-staff">
                <span className="text-xs font-semibold text-slate-500" id="nav-staff">Staff</span>
                <SidebarItem to="/staff-verification" icon={ProfileIcon} label="Verification" />
                {accountType === 'doctor' && (
                  <SidebarItem to="/availability-manager" icon={CalendarIcon} label="Availability Manager" />
                )}
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-col gap-1" role="group" aria-labelledby="nav-admin">
                <span className="text-xs font-semibold text-slate-500" id="nav-admin">Administration</span>
                <SidebarItem to="/admin/users" icon={DoctorIcon} label="User Management" />
              </div>
            )}
          </nav>
          <div className="mt-auto border-t border-slate-200 pt-4">
            <SidebarItem to="/profile" icon={ProfileIcon} label="My Profile" />
            <SidebarItem to="/notifications" icon={ChatIcon} label="Notifications" />
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
            <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" aria-label="Back to home page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6m-6 0h6" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div> {/* End of inner width container */}
      </aside>
    </>
  );
};

/* ───────── App Layout ───────── */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isDesktopCollapsed, setDesktopCollapsed] = useState(true); // Default to closed for max dashboard space!

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 relative">
      {/* Invisible Document Flow Spacer (Pushes Main UI organically) */}
      <div className={`hidden lg:block transition-all duration-500 ease-bounce flex-shrink-0 ${isDesktopCollapsed ? 'w-0' : 'w-72'}`} aria-hidden="true" />
      
      {/* The Toggle Lever - Safely mounted in the Layout root! */}
      <CapsuleToggle isCollapsed={isDesktopCollapsed} onClick={() => setDesktopCollapsed(!isDesktopCollapsed)} />

      <Sidebar 
        isOpen={isMobileOpen} onClose={() => setMobileOpen(false)}
        isCollapsed={isDesktopCollapsed}
      />
      <main id="main-content" className="relative z-10 min-w-0 flex-1 overflow-y-auto" role="main" tabIndex={-1}>
        {/* Vibrant Decorator Wash Background underneath Content */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-teal-500/15 to-slate-50/0 pointer-events-none -z-10" aria-hidden="true" />

        <div className="px-6 py-7 lg:px-10 relative z-10 w-full min-h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Menu toggle for mobile only */}
              <button
                className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(!isMobileOpen)}
                aria-label={isMobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileOpen}
              >
                <MenuIcon aria-hidden="true" />
              </button>

              {isMobileOpen && (
                <span className="ml-[3.5rem] lg:hidden text-[0.95rem] font-bold tracking-tight text-slate-900">
                  Aethea
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm lg:flex">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-xs font-medium text-slate-700 tracking-wide uppercase">Connected</span>
              </div>
              <div className="h-4 w-[1px] bg-slate-200" aria-hidden="true" />
              {/* Notification Center accurately stationed in Right Nav */}
              <div className="relative">
                <NotificationCenter />
              </div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

const PageLayout = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

/* ───────── Dashboard ───────── */

// Dashboard has been moved to src/pages/Dashboard/index.tsx

/* ───────── Routes ───────── */

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <GlobalMaintenanceListener />
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterForm /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/confirm" element={<AuthConfirmPage />} />
        <Route
          path="/complete-profile"
          element={
            <ProtectedRoute>
              <CompleteProfilePage />
            </ProtectedRoute>
          }
        />
        {/* ── Protected routes ── */}
        <Route path="/dashboard" element={<ProtectedRoute><PageLayout><DashboardPage /></PageLayout></ProtectedRoute>} />
        <Route path="/lab-results" element={<ProtectedRoute><PageLayout><LabResultsPage /></PageLayout></ProtectedRoute>} />
        <Route path="/scans" element={<ProtectedRoute><PageLayout><ScansPage /></PageLayout></ProtectedRoute>} />
        <Route path="/medicines" element={<ProtectedRoute><PageLayout><MedicineGuidePage /></PageLayout></ProtectedRoute>} />
        <Route path="/care-locator" element={<ProtectedRoute><PageLayout><DoctorFinderPage /></PageLayout></ProtectedRoute>} />
        <Route path="/appointments-marketplace" element={<ProtectedRoute><PageLayout><AppointmentsMarketplacePage /></PageLayout></ProtectedRoute>} />
        <Route path="/my-appointments" element={<ProtectedRoute><PageLayout><ReservationsPage /></PageLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><PageLayout><NotificationsPage /></PageLayout></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><PageLayout><NutritionPlannerPage /></PageLayout></ProtectedRoute>} />
        <Route path="/recovery" element={<ProtectedRoute><PageLayout><RecoveryAssistantPage /></PageLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageLayout><ProfilePage /></PageLayout></ProtectedRoute>} />
        <Route
          path="/admin/users"
          element={<RoleRoute allowed={['admin']}><PageLayout><AdminUsersPage /></PageLayout></RoleRoute>}
        />
        <Route
          path="/admin/users/:id"
          element={<RoleRoute allowed={['admin']}><PageLayout><AdminUserDetailsPage /></PageLayout></RoleRoute>}
        />
        <Route
          path="/staff-verification"
          element={<RoleRoute allowed={['doctor', 'pharmacist']}><PageLayout><StaffVerificationPage /></PageLayout></RoleRoute>}
        />
        <Route
          path="/availability-manager"
          element={<RoleRoute allowed={['doctor', 'admin']}><PageLayout><DoctorReservationsPage /></PageLayout></RoleRoute>}
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <UiNotificationsProvider>
          <AppRoutes />
        </UiNotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

