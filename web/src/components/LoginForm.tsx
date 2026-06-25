/**
 * Login Form Component - React Web
 * Clean split-screen layout mirroring the landing page aesthetic.
 * Shared PublicNavbar enforcement.
 * Wired with React Hook Form + Zod for robust client-side validation.
 */

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@core/auth/useAuth';
import { useTurnstile } from '../hooks/useTurnstile';
import { useUiNotifications } from '../contexts/UiNotificationsProvider';
import { loginSchema, type LoginInput } from '../lib/validations/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { PublicNavbar } from './PublicNavbar';

export const LoginForm: React.FC = () => {
  const { signIn, signInWithGoogle, loading, error: authError, user, session } = useAuth();
  const { notifyError } = useUiNotifications();
  const signUpPath = user && session ? '/dashboard' : '/register';
  
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const handleCaptchaError = useCallback((msg: string) => {
    setError('captchaToken', { type: 'manual', message: msg });
  }, [setError]);

  const handleCaptchaSuccess = useCallback(() => {
    clearErrors('captchaToken');
  }, [clearErrors]);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

  const onSubmit = async (data: LoginInput) => {
    setGlobalError(null);
    clearErrors();

    if (!captchaToken) {
      setError('captchaToken', {
        type: 'manual',
        message: 'Please complete the CAPTCHA verification',
      });
      return;
    }

    try {
      await signIn(data.email.trim(), data.password, captchaToken, data.rememberMe);      // Trigger Dynamic Island notification
      window.dispatchEvent(new CustomEvent('dynamic-island-notify', {
        detail: { message: 'Login successful' }
      }));
      
      resetCaptcha();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Login failed';
      notifyError(
        'Login failed',
        `Unable to sign in with the provided credentials. ${errMsg}`
      );
      setGlobalError(errMsg);
      resetCaptcha();
    }
  };

  const handleGoogleSignIn = async () => {
    setGlobalError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const displayError = globalError || authError?.message;

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gradient-to-r from-[#F9F7F3] to-[#F4EFE6] relative">
      
      {/* ──────────────────────────────────────────────── */}
      {/* SHARED NAVBAR                                    */}
      {/* ──────────────────────────────────────────────── */}
      <PublicNavbar variant="login" />

      {/* ──────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA                                */}
      {/* Background panels stretch to top-0 behind navbar */}
      {/* ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex">
        
        {/* ──────────────────────────────────────────────── */}
        {/* RIGHT PANEL: Flowers                             */}
        {/* ──────────────────────────────────────────────── */}
        <div className="absolute inset-y-0 right-0 w-1/2 z-0 hidden lg:block bg-transparent">
          <img 
            src="/flower-Login.webp" 
            alt="Beautiful calming flowers"
            className="w-full h-full object-contain object-right drop-shadow-[0_15px_30px_rgba(0,0,0,0.06)]"
          />
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* CENTER: Leaf Separator                           */}
        {/* Anchored to the very bottom, stretching to top    */}
        {/* ──────────────────────────────────────────────── */}
        <div className="hidden lg:block absolute bottom-0 top-0 left-[49.5%] -translate-x-1/2 z-[60] pointer-events-none">
          <img 
            src="/leaf.webp" 
            alt="Elegant leaf separator" 
            className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)] mix-blend-multiply translate-y-8"
          />
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* ELEGANT FLOATING TEXT                            */}
        {/* Placed beautifully in the gap between separator  */}
        {/* and the flower bouquet                           */}
        {/* ──────────────────────────────────────────────── */}
        <div className="hidden lg:block absolute left-[56%] top-[48%] -translate-y-1/2 z-10 pointer-events-none text-left">
          <span className="font-serif italic text-3xl md:text-[38px] text-sand-800 tracking-wider opacity-80 select-none leading-relaxed">
            Be part of us.
          </span>
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* LEFT PANEL: Login Form                           */}
        {/* Transparent to show underlying gradient, compact */}
        {/* ──────────────────────────────────────────────── */}
        <div className="relative z-10 flex w-full lg:w-1/2 h-full items-center justify-center px-6 py-4 lg:py-0 bg-transparent lg:-translate-x-12 overflow-y-auto custom-scrollbar">
          
          <div className="w-full max-w-sm flex flex-col justify-center">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full relative z-20">
              
              {/* Title */}
              <div className="text-center mb-4 flex flex-col items-center">
                <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-sand-900 mb-2 tracking-tight">Step Into Your Sanctuary</h1>
                <p className="text-sand-600 text-sm font-light mt-0.5 text-center max-w-[280px]">Begin your tranquil healing journey.</p>
              </div>

              {/* Google Button at the top */}
              <Button
                type="button"
                variant="outline"
                className="w-full mb-3 py-2 text-sm font-medium border border-sand-200 bg-transparent hover:bg-sand-50/50 hover:border-sand-300 text-sand-700 transition-colors h-10 shadow-sm"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="mr-2 inline-block">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.2H12z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-3 text-sand-500 text-xs before:content-[''] before:h-px before:flex-1 before:bg-sand-200 after:content-[''] after:h-px after:flex-1 after:bg-sand-200" role="separator" aria-label="Alternative sign in methods">
                <span>or</span>
              </div>

              {displayError && (
                <div className="flex items-start gap-2 bg-red-50/80 border border-red-200 rounded-lg py-2 px-3 mb-4 text-red-700 text-xs leading-relaxed" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-500 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {displayError}
                </div>
              )}

              {/* Email */}
              <div className="mb-3">
                <Label htmlFor="email" className="text-sand-800 font-medium text-sm">E-Mail Address</Label>
                <Input
                  id="email"
                  type="email"
                  error={!!errors.email}
                  placeholder="johndoe@email.com"
                  autoComplete="username"
                  disabled={loading}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  className="bg-transparent focus:bg-white border-sand-300 transition-colors h-10 focus:border-amber-800 focus:ring-amber-800/20"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="mb-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="mb-0 text-sand-800 font-medium text-sm">Password</Label>
                  <button
                    type="button"
                    className="text-amber-800 bg-transparent text-xs font-medium p-1 rounded-md transition-colors hover:bg-sand-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  error={!!errors.password}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  className="bg-transparent focus:bg-white border-sand-300 transition-colors h-10 focus:border-amber-800 focus:ring-amber-800/20"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Grouped Remember Me & Forgot Password */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <label className="inline-flex items-center gap-2 text-sand-600 cursor-pointer hover:text-sand-900 transition-colors select-none" htmlFor="rememberMe">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    className="w-4 h-4 accent-amber-800 rounded border-sand-300 focus:ring-amber-800"
                    disabled={loading}
                    {...register('rememberMe')}
                  />
                  Keep me signed in
                </label>
                <Link to="/forgot-password" className="text-amber-800 font-medium hover:text-amber-900 hover:underline underline-offset-4 transition-colors">
                  Forgot Password?
                </Link>
              </div>

              {/* CAPTCHA */}
              <div className="mb-4 flex flex-col items-center">
                <div ref={turnstileRef} className="min-h-[55px] w-full flex justify-center" />
                {errors.captchaToken && (
                  <p className="text-xs text-red-600 font-medium mt-1">{errors.captchaToken.message}</p>
                )}
              </div>

              {/* Sign In */}
              <Button
                type="submit"
                variant="primary"
                className="w-full mb-4 font-bold tracking-wide shadow-md hover:shadow-lg bg-amber-800 hover:bg-amber-900 focus-visible:outline-amber-800 h-11 text-white"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Signing in...' : 'SIGN IN'}
              </Button>

              {/* Links - Roomy, elegant placement */}
              <div className="flex items-center justify-center text-sm text-sand-600 mt-4">
                <Link to={signUpPath} className="font-medium text-sand-800 hover:text-amber-800 hover:underline underline-offset-4 transition-colors">
                  Create Account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
