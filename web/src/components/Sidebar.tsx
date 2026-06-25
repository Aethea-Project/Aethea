import React, { useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { medicalApi } from '../services/medicalApi';
import { resolveAccountType } from '../lib/authResolution';
import {
  DashboardIcon,
  LabIcon,
  ScanIcon,
  MedicineIcon,
  LocationIcon,
  ProfileIcon,
  CalendarIcon,
  QueueIcon,
  FeedbackIcon
} from './Icons';

export const Sidebar = ({ 
  isOpen, 
  onClose, 
  isCollapsed, 
  onToggleCollapse 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  isCollapsed: boolean; 
  onToggleCollapse: () => void;
}) => {
  const { session, profile } = useAuth();
  const accountType = resolveAccountType(session, profile?.accountType);
  const queryClient = useQueryClient();
  const prefetchTimers = useRef<Record<string, number>>({});

  const runPrefetch = useCallback((to: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    if (to === '/lab-results') {
      queryClient.prefetchQuery({ queryKey: ['labTests', userId], queryFn: () => medicalApi.fetchLabTests() });
    } else if (to === '/scans') {
      queryClient.prefetchQuery({ 
        queryKey: ['scans', userId], 
        queryFn: async () => {
          const scans = await medicalApi.fetchScans();
          return scans.map((scan) => ({ ...scan, images: scan.images ?? [] }));
        }
      });
    }
  }, [queryClient, session?.user?.id]);

  const handlePrefetch = useCallback((to: string) => {
    if (prefetchTimers.current[to]) return;

    const schedule = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => {
      return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 150);
    });

    prefetchTimers.current[to] = schedule(() => {
      delete prefetchTimers.current[to];
      runPrefetch(to);
    });
  }, [runPrefetch]);

  const renderLink = (to: string, icon: React.ComponentType<{ className?: string }>, label: string) => (
    <NavLink
      key={label}
      to={to}
      onMouseEnter={() => handlePrefetch(to)}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-[background-color,color] duration-200 mb-1 ${
          isActive
            ? 'bg-organic-terracotta/50 text-sand-800 font-semibold'
            : 'text-sand-500 hover:bg-sand-50/50 hover:text-sand-700 font-medium'
        } ${isCollapsed && !isOpen ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active Accent Bar */}
          {isActive && (
            <span 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-cafe" 
              aria-hidden="true"
            />
          )}

          {React.createElement(icon, { 
            className: `w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
              isActive ? 'text-sand-800' : 'text-sand-400 group-hover:text-sand-600'
            }` 
          })}
          
          {/* Label with smooth fade instead of hard hidden/block */}
          <span 
            className={`min-w-0 text-[0.85rem] tracking-wide whitespace-nowrap overflow-hidden text-ellipsis transition-[opacity,max-width] duration-300 ease-in-out ${
              isCollapsed && !isOpen
                ? 'max-w-0 opacity-0 pointer-events-none' 
                : 'max-w-[180px] opacity-100 flex-1'
            }`}
          >
            {label}
          </span>
          
          {/* Tooltip for collapsed state */}
          <div 
            className={`absolute left-full ml-2 rounded-md bg-sand-900 px-2 py-1 text-xs text-white pointer-events-none z-50 whitespace-nowrap shadow-sm transition-opacity duration-150 ${
              isCollapsed && !isOpen
                ? 'lg:block hidden opacity-0 group-hover:opacity-100' 
                : 'hidden'
            }`}
          >
            {label}
          </div>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-sand-900/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 lg:left-4 lg:top-4 lg:bottom-4 z-50 flex flex-col
          bg-surface-card border-r lg:border border-sand-200/40 rounded-none lg:rounded-2xl shadow-md
          transition-[width,transform] duration-300 ease-in-out will-change-[width,transform]
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[80px]' : 'lg:w-[260px]'}
          w-[260px] 
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Toggle Button in the vertical middle of the sidebar border (Fused Tab) */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex h-12 w-5 items-center justify-center rounded-r-xl border-y border-r border-sand-200/40 bg-surface-card text-sand-400 hover:text-sand-600 shadow-md transition-[color,transform] duration-150 hover:scale-x-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-500"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Branding */}
        <div className={`relative flex-shrink-0 px-4 transition-[border-color,opacity] duration-300 ease-in-out h-20 flex items-center ${isCollapsed ? 'border-b-0' : 'border-b border-sand-100'}`}>
          <NavLink to="/" className="flex items-center outline-none focus-visible:ring-2 focus-visible:ring-sand-500 rounded-md overflow-hidden">
            <img
              src="/AetheaLogo.webp"
              alt="Aethea"
              width={104}
              height={24}
              decoding="async"
              loading="eager"
              className={`h-6 w-auto object-contain transition-[opacity,transform] duration-300 ease-in-out ml-1 hover:opacity-80 ${
                isCollapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
              }`}
            />
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 py-6 flex flex-col gap-1">
          {!accountType ? (
            <div className="space-y-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 rounded-lg bg-sand-100/60" />
              ))}
            </div>
          ) : accountType === 'doctor' ? (
            <>
              {renderLink('/doctor/dashboard', DashboardIcon, 'Dashboard')}
              {renderLink('/clinic-hours', CalendarIcon, 'Clinic Hub')}
              {renderLink('/doctor/queue', QueueIcon, 'Queue Tracker')}
              {renderLink('/doctor/shared-records', LabIcon, 'Shared Records')}
              {renderLink('/doctor/feedback', FeedbackIcon, 'Reviews')}
            </>
          ) : accountType === 'pharmacist' ? (
            <>
              {renderLink('/clinic-hours', CalendarIcon, 'Staff Hub')}
              {renderLink('/medicines', MedicineIcon, 'Medicines')}
            </>
          ) : accountType === 'admin' ? (
            <>
              {renderLink('/admin/dashboard', DashboardIcon, 'Admin Dashboard')}
              {renderLink('/research', ScanIcon, 'Research / Myths')}
              {renderLink('/profile', ProfileIcon, 'Account Profile')}
            </>
          ) : (
            <>
              {renderLink('/dashboard', DashboardIcon, 'Dashboard')}
              {renderLink('/research', ScanIcon, 'Research / Myths')}
              {renderLink('/lab-results', LabIcon, 'Lab Results')}
              {renderLink('/scans', ScanIcon, 'Medical Scans')}
              {renderLink('/medicines', MedicineIcon, 'Medicines')}
              {renderLink('/care-locator', LocationIcon, 'Care Locator')}
              {renderLink('/book-doctor', ProfileIcon, 'Book a Doctor')}
              {renderLink('/my-appointments', CalendarIcon, 'My Appointments')}
            </>
          )}
        </nav>

      </aside>
    </>
  );
};
