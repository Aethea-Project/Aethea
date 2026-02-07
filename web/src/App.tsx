/**
 * Main App Component - Aethea Medical Platform (Web)
 */

import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { useAuth } from '@shared/auth/useAuth';
import LabResultsPage from './pages/LabResults';
import ScansPage from './pages/Scans';
import ProfilePage from './pages/Profile';

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
  const { user, signOut } = useAuth();

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
          <Link to="/profile" style={{ color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: '500' }}>
            My Profile
          </Link>
          <button onClick={signOut} style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-error-500)',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Logout
          </button>
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
