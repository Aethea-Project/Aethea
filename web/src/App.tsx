/**
 * Aethea Medical Platform — Web App
 * Landing Page + Dashboard + Feature Routing
 * Optimized: Lazy loading, code splitting, WCAG 2.1 AA accessibility
 */

import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from '@core/auth/useAuth';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { imageAssets } from './constants/imageAssets';
import './App.css';

import {
  DashboardIcon, LabIcon, ScanIcon, MedicineIcon, DoctorIcon,
  NutritionIcon, RecoveryIcon, ChatIcon, ProfileIcon, MenuIcon, CalendarIcon
} from './components/Icons';

/* ── Lazy-loaded page components (code splitting for performance) ── */
const LabResultsPage = lazy(() => import('./pages/LabResults'));
const ScansPage = lazy(() => import('./pages/Scans'));
const MedicineGuidePage = lazy(() => import('./pages/MedicineGuide'));
const DoctorFinderPage = lazy(() => import('./pages/DoctorFinder'));
const ReservationsPage = lazy(() => import('./pages/Reservations'));
const NutritionPlannerPage = lazy(() => import('./pages/NutritionPlanner'));
const RecoveryAssistantPage = lazy(() => import('./pages/RecoveryAssistant'));
const DoctorChatPage = lazy(() => import('./pages/DoctorChat'));
const ProfilePage = lazy(() => import('./pages/Profile'));

/* ── Protected Route — redirects to /login if not authenticated ── */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/* ── Loading Fallback ── */
const PageLoader = () => (
  <div className="page-loader" role="status" aria-label="Loading page">
    <div className="page-loader-spinner" />
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
  <svg viewBox="0 0 520 440" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-illustration">
    {/* Soft ambient blobs */}
    <ellipse cx="260" cy="220" rx="220" ry="190" fill="url(#heroGrad)" opacity="0.10"/>
    <ellipse cx="400" cy="130" rx="90" ry="90" fill="#2DD4BF" opacity="0.06"/>
    <ellipse cx="120" cy="340" rx="70" ry="70" fill="#7C3AED" opacity="0.05"/>

    {/* Main clipboard / medical record */}
    <rect x="160" y="60" width="200" height="280" rx="20" fill="white" stroke="#E2E8F0" strokeWidth="2"/>
    <rect x="210" y="45" width="100" height="30" rx="15" fill="#0D9488"/>
    <circle cx="260" cy="60" r="6" fill="white"/>
    {/* Lines on clipboard */}
    <rect x="190" y="110" width="140" height="8" rx="4" fill="#F1F5F9"/>
    <rect x="190" y="130" width="100" height="8" rx="4" fill="#F1F5F9"/>
    <rect x="190" y="160" width="140" height="8" rx="4" fill="#E0F2FE"/>
    <rect x="190" y="180" width="120" height="8" rx="4" fill="#E0F2FE"/>
    {/* Status indicators */}
    <circle cx="200" cy="220" r="6" fill="#10B981"/>
    <rect x="215" y="216" width="80" height="8" rx="4" fill="#D1FAE5"/>
    <circle cx="200" cy="245" r="6" fill="#F59E0B"/>
    <rect x="215" y="241" width="60" height="8" rx="4" fill="#FEF3C7"/>
    <circle cx="200" cy="270" r="6" fill="#10B981"/>
    <rect x="215" y="266" width="90" height="8" rx="4" fill="#D1FAE5"/>
    {/* Check mark on clipboard */}
    <circle cx="330" cy="290" r="18" fill="#10B981" opacity="0.15"/>
    <path d="M322 290 L328 296 L340 284" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>

    {/* Floating card — Scan */}
    <g filter="url(#shadow1)">
      <rect x="370" y="160" width="130" height="90" rx="16" fill="white"/>
      <rect x="385" y="175" width="40" height="40" rx="10" fill="#CCFBF1"/>
      <rect x="385" y="225" width="80" height="6" rx="3" fill="#F1F5F9"/>
      <rect x="385" y="235" width="50" height="6" rx="3" fill="#F1F5F9"/>
      <circle cx="405" cy="195" r="10" fill="#0D9488" opacity="0.3"/>
    </g>

    {/* Floating card — Heart / Appointment */}
    <g filter="url(#shadow1)">
      <rect x="20" y="150" width="130" height="80" rx="16" fill="white"/>
      <circle cx="55" cy="180" r="16" fill="#FEE2E2"/>
      <path d="M49 178 C49 175 52 172 55 176 C58 172 61 175 61 178 C61 182 55 186 55 186 C55 186 49 182 49 178Z" fill="#EF4444"/>
      <rect x="80" y="172" width="55" height="6" rx="3" fill="#F1F5F9"/>
      <rect x="80" y="184" width="40" height="6" rx="3" fill="#F1F5F9"/>
      <rect x="35" y="210" width="90" height="6" rx="3" fill="#DBEAFE"/>
    </g>

    {/* Heartbeat line */}
    <path d="M60 360 L140 360 L160 340 L175 380 L190 345 L205 365 L220 355 L460 355" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3"/>

    {/* Floating crosses */}
    <g opacity="0.15">
      <rect x="90" y="90" width="3" height="16" rx="1.5" fill="#0D9488"/>
      <rect x="83.5" y="96.5" width="16" height="3" rx="1.5" fill="#0D9488"/>
    </g>
    <g opacity="0.1">
      <rect x="430" y="80" width="3" height="16" rx="1.5" fill="#7C3AED"/>
      <rect x="423.5" y="86.5" width="16" height="3" rx="1.5" fill="#7C3AED"/>
    </g>
    <g opacity="0.12">
      <rect x="450" y="310" width="3" height="14" rx="1.5" fill="#0D9488"/>
      <rect x="443.5" y="315.5" width="16" height="3" rx="1.5" fill="#0D9488"/>
    </g>

    {/* Defs */}
    <defs>
      <radialGradient id="heroGrad" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#14B8A6"/>
        <stop offset="100%" stopColor="#14B8A6" stopOpacity="0"/>
      </radialGradient>
      <filter id="shadow1" x="-10" y="-10" width="200" height="150" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="4" stdDeviation="12" floodOpacity="0.08"/>
      </filter>
    </defs>
  </svg>
);

/* ───────── Landing Page ───────── */

const LandingPage = () => {
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
      title: 'Doctor Finder',
      desc: 'Search specialists, read reviews, and book appointments instantly.',
      type: 'doctor',
      path: '/doctors',
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
    {
      icon: <ChatIcon />,
      title: 'Doctor Chat',
      desc: 'Secure real-time messaging and video consultations.',
      type: 'chat',
      path: '/chat',
      imageSrc: imageAssets.features.chat,
      imageAlt: 'Preview of secure doctor chat interface',
    },
  ] as const;

  return (
    <div className="landing">
      {/* Skip to content for keyboard users */}
      <a href="#landing-main" className="skip-to-content">Skip to main content</a>

      {/* Top Nav */}
      <header className="landing-nav" role="banner">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="Aethea - Home">
            <div className="landing-brand-icon" aria-hidden="true">A</div>
            <span>Aethea</span>
          </Link>
          <nav className="landing-links" aria-label="Landing page navigation">
            <a href="#features">Features</a>
            <a href="#about">About</a>
          </nav>
          <div className="landing-nav-auth">
            <Link to="/login" className="landing-cta-btn-outline">Sign In</Link>
            <Link to="/register" className="landing-cta-btn">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-heading">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="badge-dot"></span>
            Your Health, Reimagined
          </div>
          <h1 id="hero-heading">Your Complete<br/><span className="text-gradient">Medical Companion</span></h1>
          <p>
            Aethea brings all your health records, lab results, medical scans,
            and doctor consultations into one beautiful, secure platform.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="btn-primary-lg">
              Create Account
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </Link>
            <a href="#features" className="btn-outline-lg">Explore Features</a>
          </div>
          <div className="landing-hero-trust" role="list" aria-label="Trust indicators">
            {trustIndicators.map(t => (
              <div key={t.label} className="trust-item" role="listitem">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                <div className="trust-copy">
                  <span>{t.label}</span>
                  <small>{t.detail}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="landing-hero-visual">
          <ImageWithFallback
            src={imageAssets.landingHero}
            alt="Doctor reviewing patient medical records on a digital tablet"
            className="landing-photo"
            loading="eager"
            fallback={<HeroIllustration />}
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-features" aria-labelledby="features-heading">
        <div className="landing-section-header">
          <span className="section-badge">Platform Features</span>
          <h2 id="features-heading">Everything You Need<br/>In One Place</h2>
          <p>From lab results to doctor consultations — your entire health journey, organized.</p>
        </div>
        <div className="features-grid">
          {featureCards.map((f) => (
            <Link to={f.path} key={f.type} className={`feature-showcase-card fsc-${f.type}`}>
              <div className="fsc-media" aria-hidden="true">
                <ImageWithFallback
                  src={f.imageSrc}
                  alt={f.imageAlt}
                  className="fsc-media-image"
                  fallback={<div className="fsc-media-fallback"></div>}
                />
              </div>
              <div className="fsc-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="fsc-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="landing-about" aria-labelledby="about-heading">
        <div className="about-inner">
          <div className="about-text">
            <span className="section-badge">About Aethea</span>
            <h2 id="about-heading">Built for Patients,<br/>Designed by Experts</h2>
            <p>
              Aethea is a graduation project showing how modern technology can transform
              the patient healthcare experience. We believe everyone deserves clear,
              instant access to their medical information.
            </p>
            <p>
              Our platform combines clean design with practical medical tools — from viewing
              lab results and scans to checking medicine safety and consulting with doctors.
            </p>
            <div className="about-stats">
              {[
                { n: '7', l: 'Core Features' },
                { n: '3', l: 'Platforms' },
                { n: '100%', l: 'Open Source' },
              ].map(s => (
                <div key={s.l} className="about-stat">
                  <div className="about-stat-number">{s.n}</div>
                  <div className="about-stat-label">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="about-visual">
            <ImageWithFallback
              src={imageAssets.aboutSection}
              alt="Healthcare professionals collaborating with a patient"
              className="about-photo"
              fallback={
                <div className="about-card-stack">
                  <div className="about-card ac-1">
                    <div className="ac-dot" style={{ background: '#10B981' }}></div>
                    <span>Lab Results — All Normal</span>
                  </div>
                  <div className="about-card ac-2">
                    <div className="ac-dot" style={{ background: '#3B82F6' }}></div>
                    <span>MRI scan uploaded successfully</span>
                  </div>
                  <div className="about-card ac-3">
                    <div className="ac-dot" style={{ background: '#F59E0B' }}></div>
                    <span>Appointment with Dr. Chen — Tomorrow</span>
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </section>
      </main>

      {/* Footer CTA */}
      <section className="landing-footer-cta" aria-labelledby="cta-heading">
        <h2 id="cta-heading">Ready to Take Control<br/>of Your Health?</h2>
        <p>Create your free account to access all features and start managing your health today.</p>
        <Link to="/register" className="btn-primary-lg">
          Create Free Account
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" aria-hidden="true"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-inner">
          <div className="landing-brand" aria-hidden="true">
            <div className="landing-brand-icon">A</div>
            <span>Aethea</span>
          </div>
          <p className="footer-copy">&copy; 2026 Aethea — Graduation Project. Built with care for better healthcare.</p>
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
      className={`nav-item ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
};

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <>
    {isOpen && <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />}
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
        <div className="brand-logo" aria-hidden="true">A</div>
        <span className="brand-name">Aethea</span>
      </Link>
      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <div className="nav-group" role="group" aria-labelledby="nav-overview">
          <span className="nav-label" id="nav-overview">Overview</span>
          <SidebarItem to="/dashboard" icon={DashboardIcon} label="Dashboard" />
        </div>
        <div className="nav-group" role="group" aria-labelledby="nav-records">
          <span className="nav-label" id="nav-records">Health Records</span>
          <SidebarItem to="/lab-results" icon={LabIcon} label="Lab Results" />
          <SidebarItem to="/scans" icon={ScanIcon} label="Medical Scans" />
        </div>
        <div className="nav-group" role="group" aria-labelledby="nav-care">
          <span className="nav-label" id="nav-care">Care &amp; Wellness</span>
          <SidebarItem to="/medicines" icon={MedicineIcon} label="Medicines" />
          <SidebarItem to="/doctors" icon={DoctorIcon} label="Doctors" />
          <SidebarItem to="/reservations" icon={CalendarIcon} label="Appointments" />
          <SidebarItem to="/nutrition" icon={NutritionIcon} label="Nutrition" />
          <SidebarItem to="/recovery" icon={RecoveryIcon} label="Recovery" />
          <SidebarItem to="/chat" icon={ChatIcon} label="Consultations" />
        </div>
      </nav>
      <div className="sidebar-footer">
        <SidebarItem to="/profile" icon={ProfileIcon} label="My Profile" />
        <Link to="/" className="nav-item" aria-label="Back to home page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6m-6 0h6"/>
          </svg>
          <span>Back to Home</span>
        </Link>
      </div>
    </aside>
  </>
);

/* ───────── App Layout ───────── */

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main id="main-content" className="main-content" role="main" tabIndex={-1}>
        {children}
      </main>
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isSidebarOpen}
      >
        <MenuIcon aria-hidden="true" />
      </button>
    </div>
  );
};

const PageLayout = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>{children}</AppLayout>
);

/* ───────── Dashboard ───────── */

const Dashboard = () => {
  const { user } = useAuth();
  const userName = user?.email?.split('@')[0] || 'Patient';

  return (
    <div className="animate-fade-in dashboard">
      {/* Welcome Banner */}
      <div className="dashboard-hero" role="banner">
        <div className="hero-content">
          <h1 className="hero-title">Welcome back, {userName}</h1>
          <p className="hero-subtitle">
            Here's your health overview. You have <strong>2 upcoming appointments</strong> and <strong>1 new lab result</strong> to review.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <ImageWithFallback
            src={imageAssets.dashboardHero}
            alt="Medical dashboard background"
            className="dashboard-hero-image"
            loading="eager"
            fallback={
              <svg className="dashboard-hero-fallback" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.08)"/>
                <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.06)"/>
                <path d="M80 100 L90 100 L95 85 L100 115 L105 95 L110 105 L115 100 L120 100" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </svg>
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-row" role="list" aria-label="Health summary">
        <div className="summary-card" role="listitem">
          <div className="summary-icon si-lab" aria-hidden="true"><LabIcon /></div>
          <div className="summary-info">
            <div className="summary-value">6</div>
            <div className="summary-label">Lab Tests</div>
          </div>
          <span className="summary-badge sb-green">5 Normal</span>
        </div>
        <div className="summary-card" role="listitem">
          <div className="summary-icon si-scan" aria-hidden="true"><ScanIcon /></div>
          <div className="summary-info">
            <div className="summary-value">3</div>
            <div className="summary-label">Scans</div>
          </div>
          <span className="summary-badge sb-blue">All reviewed</span>
        </div>
        <div className="summary-card" role="listitem">
          <div className="summary-icon si-doc" aria-hidden="true"><DoctorIcon /></div>
          <div className="summary-info">
            <div className="summary-value">2</div>
            <div className="summary-label">Appointments</div>
          </div>
          <span className="summary-badge sb-amber">Next: Tomorrow</span>
        </div>
      </div>

      {/* Section Title */}
      <div className="section-title">
        <div className="section-title-bar"></div>
        <h2>Quick Access</h2>
      </div>

      {/* Bento Grid — limited to 7 items per Miller's Law (7±2) */}
      <div className="bento-grid" role="list" aria-label="Quick access features">

        {/* Doctor — spans 2 rows, has live appointment preview */}
        <Link to="/doctors" className="bento-card theme-doc bento-span-row" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.doctor}
              alt="Doctor consultation preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-doc-bg" />}
            />
          </div>
          <div className="card-decoration" aria-hidden="true"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper" aria-hidden="true"><DoctorIcon /></div>
            <div>
              <h3 className="card-title">Find a Doctor</h3>
              <p className="card-desc">Book appointments with top specialists near you.</p>
            </div>
            <div className="card-mini-info">
              <div className="card-mini-label">Next Appointment</div>
              <div className="card-mini-value">Dr. Sarah Smith</div>
              <div className="card-mini-sub">Tomorrow, 2:00 PM</div>
            </div>
          </div>
        </Link>

        <Link to="/lab-results" className="bento-card theme-lab" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.lab}
              alt="Lab results preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-lab-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><LabIcon /></div>
            <div>
              <h3 className="card-title">Lab Results</h3>
              <p className="card-desc">Blood work, biomarkers &amp; trends.</p>
            </div>
            <div className="card-mini-info">
              <div className="card-mini-label">Latest</div>
              <div className="card-mini-value">5 Normal &middot; 1 Borderline</div>
            </div>
          </div>
        </Link>

        <Link to="/scans" className="bento-card theme-scan" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.scan}
              alt="Medical scan viewer preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-scan-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><ScanIcon /></div>
            <div>
              <h3 className="card-title">Medical Scans</h3>
              <p className="card-desc">X-Rays, MRIs &amp; CT imaging.</p>
            </div>
          </div>
        </Link>

        <Link to="/medicines" className="bento-card theme-med" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.medicine}
              alt="Medicine guide preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-med-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><MedicineIcon /></div>
            <div>
              <h3 className="card-title">Medicine Guide</h3>
              <p className="card-desc">Safety checks &amp; drug interactions.</p>
            </div>
          </div>
        </Link>

        <Link to="/nutrition" className="bento-card theme-food" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.nutrition}
              alt="Nutrition planner preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-food-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><NutritionIcon /></div>
            <div>
              <h3 className="card-title">Nutrition Plan</h3>
              <p className="card-desc">AI-powered meal planning &amp; tracking.</p>
            </div>
          </div>
        </Link>

        <Link to="/recovery" className="bento-card theme-rec" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.recovery}
              alt="Recovery assistant preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-rec-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><RecoveryIcon /></div>
            <div>
              <h3 className="card-title">Recovery</h3>
              <p className="card-desc">Post-surgery exercises &amp; progress.</p>
            </div>
          </div>
        </Link>

        <Link to="/chat" className="bento-card theme-chat" role="listitem">
          <div className="bento-img-wrap" aria-hidden="true">
            <ImageWithFallback
              src={imageAssets.bento.chat}
              alt="Doctor chat preview"
              className="bento-img"
              fallback={<div className="bento-img-fallback theme-chat-bg" />}
            />
          </div>
          <div className="card-decoration"></div>
          <div className="bento-body">
            <div className="card-icon-wrapper"><ChatIcon /></div>
            <div>
              <h3 className="card-title">Doctor Chat</h3>
              <p className="card-desc">Secure real-time consultations.</p>
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
};

/* ───────── Routes ───────── */

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />

        {/* ── Protected routes ── */}
        <Route path="/dashboard" element={<ProtectedRoute><PageLayout><Dashboard /></PageLayout></ProtectedRoute>} />
        <Route path="/lab-results" element={<ProtectedRoute><PageLayout><LabResultsPage /></PageLayout></ProtectedRoute>} />
        <Route path="/scans" element={<ProtectedRoute><PageLayout><ScansPage /></PageLayout></ProtectedRoute>} />
        <Route path="/medicines" element={<ProtectedRoute><PageLayout><MedicineGuidePage /></PageLayout></ProtectedRoute>} />
        <Route path="/doctors" element={<ProtectedRoute><PageLayout><DoctorFinderPage /></PageLayout></ProtectedRoute>} />
        <Route path="/reservations" element={<ProtectedRoute><PageLayout><ReservationsPage /></PageLayout></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><PageLayout><NutritionPlannerPage /></PageLayout></ProtectedRoute>} />
        <Route path="/recovery" element={<ProtectedRoute><PageLayout><RecoveryAssistantPage /></PageLayout></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PageLayout><DoctorChatPage /></PageLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageLayout><ProfilePage /></PageLayout></ProtectedRoute>} />

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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

