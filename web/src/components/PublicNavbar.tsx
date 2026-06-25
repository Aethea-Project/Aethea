import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@core/auth/useAuth';

export interface PublicNavbarProps {
  variant?: 'default' | 'login';
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ variant = 'default' }) => {
  const { user, session, profile } = useAuth();

  return (
    <header className="fixed inset-x-0 top-0 z-50 py-4 px-8 md:px-12 transition-all duration-300 bg-[#F7F5F0]/90 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between relative">
        <Link to="/" className="flex items-center text-sand-900 no-underline z-10">
          <img src="/AetheaLogo.webp" alt="Aethea Logo" className="h-8 w-auto object-contain" />
        </Link>
        
        {variant === 'login' ? (
          // Center links are empty for login view as they are moved to the right side
          <div className="hidden lg:block absolute left-1/2 -translate-x-1/2" />
        ) : (
          <nav className="hidden lg:flex items-center gap-16 absolute left-1/2 -translate-x-1/2" aria-label="Landing page navigation">
            <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900" href="/#sanctuary">The Sanctuary</a>
            <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900" href="/#about">About Us</a>
            <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900" href="/#experts">Our Experts</a>
            <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900" href="/#contact">Contact</a>
          </nav>
        )}
        
        <div className="z-10">
          {variant === 'login' ? (
            <div className="flex items-center gap-8 md:gap-12">
              <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900 no-underline" href="/#about">About Us</a>
              <a className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900 no-underline" href="/#contact">Contact Us</a>
            </div>
          ) : user && session ? (
            <Link to="/dashboard" className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900 no-underline">
              {profile?.firstName || user.email?.split('@')[0] || 'My Account'}
            </Link>
          ) : (
            <Link to="/login" className="text-[14px] font-medium text-sand-600 transition-colors hover:text-sand-900 no-underline">
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
