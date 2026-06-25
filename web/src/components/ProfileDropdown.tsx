import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';
import { useUiNotifications } from '../contexts/UiNotificationsProvider';
import { ProfileIcon } from './Icons';

export const ProfileToggle: React.FC<{ isActive: boolean; onClick: () => void }> = ({ isActive, onClick }) => {
  const { user, profile } = useAuth();
  
  const profileName = profile?.firstName 
    ? `${profile.firstName.charAt(0)}${profile.lastName ? profile.lastName.charAt(0) : ''}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <button
      type="button"
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-olive-500 border shadow-sm ${
        isActive
          ? 'bg-olive-600 border-olive-700 text-white'
          : 'bg-olive-50 border-olive-100/80 text-olive-800 hover:bg-olive-100/80'
      }`}
      onClick={onClick}
      aria-label="User menu"
      aria-expanded={isActive}
    >
      <span className="text-xs font-bold tracking-tight">{profileName}</span>
    </button>
  );
};

export const ProfileContent: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const { signOut, user, profile } = useAuth();
  const { notifyInfo, notifyError } = useUiNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      notifyInfo('Signed out', 'You have been signed out successfully.', { autoCloseMs: 2500 });
      await signOut();
      navigate('/');
    } catch (error) {
      notifyError(
        'Sign out failed',
        `Unable to sign out right now. ${error instanceof Error ? error.message : ''}`
      );
    }
  };

  const profileName = profile?.firstName 
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : 'User';
  
  const initials = profile?.firstName 
    ? `${profile.firstName.charAt(0)}${profile.lastName ? profile.lastName.charAt(0) : ''}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="w-full flex flex-col">
      <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-sand-100/50 rounded-full blur-3xl -z-10" />
        
        {/* Large Avatar */}
        <div className="h-16 w-16 mb-3.5 rounded-full bg-gradient-to-tr from-olive-600 to-organic-linen p-[2px] shadow-sm relative group">
          <div className="h-full w-full rounded-full bg-surface-card flex items-center justify-center border-2 border-transparent">
            <span className="text-xl font-bold bg-gradient-to-tr from-sand-900 to-olive-600 bg-clip-text text-transparent">
              {initials}
            </span>
          </div>
        </div>
        
        <h3 className="text-[16px] font-bold text-sand-900 tracking-tight leading-none mb-1.5">
          {profileName}
        </h3>
        <p className="text-[12px] font-medium text-sand-500 tracking-wide">{user?.email}</p>
      </div>

      <div className="px-3 pb-4">
        <div className="flex flex-col gap-1 p-1.5 rounded-2xl bg-sand-50/50 border border-sand-100/50 backdrop-blur-md shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
          <Link
            to="/profile"
            className="flex items-center px-3 py-2.5 rounded-xl text-[13px] font-semibold text-sand-700 hover:bg-white hover:text-sand-900 hover:shadow-sm transition-all group"
            onClick={onDismiss}
          >
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-sand-100/80 text-sand-600 group-hover:bg-sand-100 group-hover:text-sand-900 transition-colors">
              <ProfileIcon className="h-4 w-4" />
            </div>
            Manage Account
            <svg className="w-4 h-4 ml-auto text-sand-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
          
          <button
            onClick={() => {
              onDismiss();
              void handleSignOut();
            }}
            className="flex w-full items-center px-3 py-2.5 rounded-xl text-[13px] font-bold text-rose-600 hover:bg-rose-50 hover:shadow-sm transition-all group text-left"
          >
            <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50/50 text-rose-500 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
