/**
 * Main App Component - Aethea Medical Platform (Web)
 */

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthProvider';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { useAuth } from '@shared/auth/useAuth';
import LabResultsPage from './pages/LabResults';
import ScansPage from './pages/Scans';
import ProfilePage from './pages/Profile';
import './components/Header.css';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Dashboard with Navigation
const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.firstName || user?.email?.split('@')[0] || 'User';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
      {/* Navigation Bar */}
      <nav style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary-600)', margin: 0 }}>
          Aethea
        </h1>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: '600' }}>
            Dashboard
          </Link>
          <Link to="/lab-results" style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: '500' }}>
            Lab Results
          </Link>
          <Link to="/scans" style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: '500' }}>
            Medical Scans
          </Link>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto', position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="header-profile-link"
              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', transition: 'all 200ms ease' }}>
                <span className="header-profile-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <span className="header-profile-name">
                  {displayName}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 200ms ease', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <path d="M4 6L8 10L12 6" stroke="var(--color-primary-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            
            {isDropdownOpen && (
              <div className="header-dropdown">
                <Link 
                  to="/profile" 
                  className="header-dropdown-item"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>My Profile</span>
                </Link>
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut();
                  }}
                  className="header-dropdown-item"
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', color: 'var(--color-error-600)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'var(--color-surface)',
          padding: '3rem',
          borderRadius: '1rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
            Welcome to Aethea Medical Platform
          </h2>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Logged in as: {user?.email}
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginTop: '2rem'
          }}>
            <Link to="/lab-results" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                backgroundColor: 'var(--color-primary-50)',
                borderRadius: '0.75rem',
                border: '2px solid var(--color-primary-200)',
                cursor: 'pointer',
                transition: 'transform 200ms ease'
              }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-700)', marginBottom: '0.5rem' }}>
                  🧪 Lab Results
                </h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  View your test results and trends
                </p>
              </div>
            </Link>

            <Link to="/scans" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                backgroundColor: 'var(--color-success-50)',
                borderRadius: '0.75rem',
                border: '2px solid var(--color-success-100)',
                cursor: 'pointer',
                transition: 'transform 200ms ease'
              }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-success-600)', marginBottom: '0.5rem' }}>
                  🩻 Medical Scans
                </h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Access your X-rays and imaging (coming soon)
                </p>
              </div>
            </Link>

            <div style={{
              padding: '2rem',
              backgroundColor: 'var(--color-neutral-50)',
              borderRadius: '0.75rem',
              border: '2px solid var(--color-neutral-200)',
              opacity: 0.6
            }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-neutral-600)', marginBottom: '0.5rem' }}>
                📅 Appointments
              </h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Coming soon...
              </p>
            </div>

            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '2rem',
                backgroundColor: '#faf5ff',
                borderRadius: '0.75rem',
                border: '2px solid #e9d5ff',
                cursor: 'pointer',
                transition: 'transform 200ms ease'
              }}>
                <h3 style={{ fontSize: '1.25rem', color: '#7c3aed', marginBottom: '0.5rem' }}>
                  👤 My Profile
                </h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  View and edit your personal &amp; medical info
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab-results"
        element={
          <ProtectedRoute>
            <LabResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scans"
        element={
          <ProtectedRoute>
            <ScansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
