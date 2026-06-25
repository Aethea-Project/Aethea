/**
 * Registration Form Component - React Web
 * Multi-field form with Cloudflare Turnstile CAPTCHA integration
 * Follows web.dev best practices for accessibility and UX
 * Refactored to React Hook Form + Zod for unified, enterprise-grade validation.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@core/auth/useAuth';
import { GENDER_OPTIONS, type Gender } from '@core/auth/auth-types';
import { useTurnstile } from '../hooks/useTurnstile';
import { registerSchema } from '../lib/validations/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { PublicNavbar } from './PublicNavbar';

interface RegisterFormInput {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  password: string;
  confirmPassword: string;
  captchaToken?: string;
}

export const RegisterForm: React.FC = () => {
  const { signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '+20',
      phone: '',
      dateOfBirth: '',
      gender: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password value to update rules dynamically
  const passwordValue = watch('password', '') || '';

  const handleCaptchaError = useCallback(
    (msg: string) => {
      setError('captchaToken', { type: 'manual', message: msg });
    },
    [setError],
  );

  const handleCaptchaSuccess = useCallback(() => {
    clearErrors('captchaToken');
    setGlobalError(null);
  }, [clearErrors]);

  const { captchaToken, turnstileRef, resetCaptcha } = useTurnstile({
    onError: handleCaptchaError,
    onSuccess: handleCaptchaSuccess,
  });

  const handleNextStep = async () => {
    setGlobalError(null);
    const fieldsToValidate: Array<keyof RegisterFormInput> = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dateOfBirth',
      'gender',
    ];
    const isStep1Valid = await trigger(fieldsToValidate);
    
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: RegisterFormInput) => {
    setGlobalError(null);
    setSuccessMessage(null);
    clearErrors();

    if (!captchaToken) {
      setError('captchaToken', {
        type: 'manual',
        message: 'Please complete the CAPTCHA verification',
      });
      return;
    }

    const result = await signUp({
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      countryCode: data.countryCode,
      phone: data.phone.trim(),
      dateOfBirth: data.dateOfBirth,
      gender: data.gender as Gender,
      password: data.password,
      captchaToken: captchaToken,
    });

    if (result.success) {
      setSuccessMessage(result.message || 'Registration successful! Check your email.');
      resetCaptcha();

      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setGlobalError(result.message || 'Registration failed. Please try again.');
      resetCaptcha();
    }
  };

  const handleGoogleSignIn = async () => {
    setGlobalError(null);
    setSuccessMessage(null);
    clearErrors();
    try {
      await signInWithGoogle();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  // Compute max date for DOB (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-gradient-to-r from-[#F9F7F3] to-[#F4EFE6] relative">
      
      {/* ──────────────────────────────────────────────── */}
      {/* SHARED NAVBAR                                    */}
      {/* ──────────────────────────────────────────────── */}
      <PublicNavbar variant="login" />

      {/* ──────────────────────────────────────────────── */}
      {/* RIGHT PANEL: Flowers Image (Full Height)         */}
      {/* Starts from top-0 of screen to bottom-0          */}
      {/* ──────────────────────────────────────────────── */}
      {/* RIGHT PANEL: Flowers Image (Full Height)         */}
      {/* Starts from left-[52%] of screen to bottom-0     */}
      {/* ──────────────────────────────────────────────── */}
      {/* RIGHT PANEL: Flowers Image (Full Height)         */}
      {/* Starts from left-[58%] of screen to bottom-0     */}
      {/* ──────────────────────────────────────────────── */}
      <div className="absolute top-0 bottom-0 right-0 w-[42%] z-0 hidden lg:block bg-transparent">
        <img 
          src="/Flowers-sign up.webp" 
          alt="Beautiful calming flowers"
          className="w-full h-full object-cover object-left"
        />
      </div>

      {/* ──────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA                                */}
      {/* ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex">

        {/* ──────────────────────────────────────────────── */}
        {/* CENTER: Leaf Separator at 44% Boundary           */}
        {/* ──────────────────────────────────────────────── */}
        <div className="hidden lg:block absolute bottom-0 top-0 left-[43.8%] -translate-x-1/2 z-[60] pointer-events-none">
          <img 
            src="/leaf.webp" 
            alt="Elegant leaf separator" 
            className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)] mix-blend-multiply translate-y-8"
          />
        </div>

        {/* ──────────────────────────────────────────────── */}
        {/* ELEGANT FLOATING TEXT (Vertical Stacked Words)   */}
        {/* ──────────────────────────────────────────────── */}
        <div className="hidden lg:block absolute left-[49%] top-[48%] -translate-y-1/2 z-10 pointer-events-none text-left">
          <span className="font-serif italic text-3xl md:text-[38px] text-sand-800 tracking-wider opacity-85 select-none leading-[1.3] flex flex-col gap-1">
            <span>Begin</span>
            <span>your</span>
            <span>deep</span>
            <span>breath.</span>
          </span>
        </div>
        
        {/* ──────────────────────────────────────────────── */}
        {/* LEFT PANEL: Create Account Form                  */}
        {/* ──────────────────────────────────────────────── */}
        <div className="relative z-10 flex w-full lg:w-1/2 h-full items-center justify-center px-6 py-4 lg:py-0 bg-transparent lg:-translate-x-20 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md flex flex-col justify-center">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full relative z-20">
              
              {/* Header */}
              <div className="text-center mb-4 flex flex-col items-center">
                <h1 className="font-serif text-2xl lg:text-3xl font-semibold text-sand-900 mb-1 tracking-tight">Create your account</h1>
              </div>

              {/* Step indicator */}
              <div className="flex justify-center gap-1.5 mb-3">
                <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step === 1 ? 'bg-amber-800' : 'bg-sand-200'}`} />
                <div className={`h-1.5 w-12 rounded-full transition-all duration-300 ${step === 2 ? 'bg-amber-800' : 'bg-sand-200'}`} />
              </div>

              {/* Global Error */}
              {globalError && (
                <div className="flex items-start gap-2 bg-red-50/80 border border-red-200 rounded-lg py-2 px-3 mb-3 text-red-700 text-xs leading-relaxed" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-500 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {globalError}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="flex items-start gap-2 bg-green-50/80 border border-green-200 rounded-lg py-2 px-3 mb-3 text-amber-800 text-xs leading-relaxed" role="status">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-800 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {successMessage}
                </div>
              )}

              {/* Hidden countryCode input */}
              <input type="hidden" {...register('countryCode')} />

              {/* ──────────────────────────────────────────────── */}
              {/* STEP 1: PERSONAL INFORMATION                     */}
              {/* ──────────────────────────────────────────────── */}
              <div className={step === 1 ? "block" : "hidden"}>
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

                  <div className="flex items-center gap-3 mb-3 text-sand-500 text-xs before:content-[''] before:h-px before:flex-1 before:bg-sand-200 after:content-[''] after:h-px after:flex-1 after:bg-sand-200" role="separator" aria-label="Alternative sign up methods">
                    <span>or</span>
                  </div>

                  {/* Name Row */}
                  <div className="flex flex-col md:flex-row gap-3 mb-3">
                    <div className="flex-1">
                      <Label htmlFor="firstName" className="text-sand-800 font-medium text-sm">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        error={!!errors.firstName}
                        placeholder="John"
                        autoComplete="given-name"
                        disabled={loading}
                        aria-invalid={errors.firstName ? 'true' : 'false'}
                        className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                        {...register('firstName')}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="lastName" className="text-sand-800 font-medium text-sm">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        error={!!errors.lastName}
                        placeholder="Doe"
                        autoComplete="family-name"
                        disabled={loading}
                        aria-invalid={errors.lastName ? 'true' : 'false'}
                        className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                        {...register('lastName')}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <Label htmlFor="email" className="text-sand-800 font-medium text-sm">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      error={!!errors.email}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={loading}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Phone Row */}
                  <div className="flex flex-col md:flex-row gap-3 mb-3">
                    <div className="flex-[0_0_120px]">
                      <Label htmlFor="countryCode-display" className="text-sand-800 font-medium text-sm">Country Code</Label>
                      <div
                        id="countryCode-display"
                        className="w-full h-10 px-3 py-2 flex items-center justify-center gap-1 font-semibold text-sand-800 bg-transparent border border-sand-300 rounded-lg cursor-default select-none text-sm"
                        aria-label="Country code: Egypt +20"
                      >
                        🇪🇬 +20
                      </div>
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="phone" className="text-sand-800 font-medium text-sm">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        error={!!errors.phone}
                        placeholder="10XXXXXXXX"
                        autoComplete="tel"
                        disabled={loading}
                        aria-invalid={errors.phone ? 'true' : 'false'}
                        className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                        {...register('phone')}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth & Gender Row */}
                  <div className="flex flex-col md:flex-row gap-3 mb-3">
                    <div className="flex-1">
                      <Label htmlFor="dateOfBirth" className="text-sand-800 font-medium text-sm">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        error={!!errors.dateOfBirth}
                        max={today}
                        disabled={loading}
                        aria-invalid={errors.dateOfBirth ? 'true' : 'false'}
                        className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                        {...register('dateOfBirth')}
                      />
                      {errors.dateOfBirth && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.dateOfBirth.message}</p>
                      )}
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="gender" className="text-sand-800 font-medium text-sm">Gender</Label>
                      <Select
                        id="gender"
                        error={!!errors.gender}
                        disabled={loading}
                        aria-invalid={errors.gender ? 'true' : 'false'}
                        className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                        {...register('gender')}
                      >
                        <option value="" disabled>Select gender</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                      {errors.gender && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.gender.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full mb-3 font-bold tracking-wide shadow-md hover:shadow-lg bg-amber-800 hover:bg-amber-900 focus-visible:outline-amber-800 h-10 text-white transition-colors"
                    onClick={handleNextStep}
                    disabled={loading}
                  >
                    Continue
                  </Button>

                  {/* Sign In Link */}
                  <div className="text-center text-xs text-sand-600 mt-1">
                    Already have an account?{' '}
                    <Link to="/login" className="text-amber-800 font-semibold hover:text-amber-900 hover:underline underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800 rounded">
                      Sign in
                    </Link>
                  </div>
                </div>

              {/* ──────────────────────────────────────────────── */}
              {/* STEP 2: ACCOUNT SECURITY                         */}
              {/* ──────────────────────────────────────────────── */}
              <div className={step === 2 ? "block" : "hidden"}>
                  {/* Password */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="password" className="mb-0 text-sand-800 font-medium text-sm">Password</Label>
                      <button
                        type="button"
                        className="text-amber-800 bg-transparent text-xs font-semibold px-2 py-1 rounded-lg transition-colors hover:bg-sand-100/50 hover:text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[2rem]"
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
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={errors.password ? 'true' : 'false'}
                      className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                      {...register('password')}
                    />
                    
                    {/* Dynamic Password Hints */}
                    <ul className="flex flex-col gap-1 list-none p-0 mt-1" aria-label="Password requirements">
                      <li className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${passwordValue.length >= 8 ? "text-amber-800" : "text-sand-400"}`}>
                        <span className={`text-[11px] w-4 text-center shrink-0 font-bold ${passwordValue.length >= 8 ? "text-amber-800" : "text-sand-300"}`} aria-hidden="true">
                          {passwordValue.length >= 8 ? '✓' : '✗'}
                        </span>
                        At least 8 characters
                      </li>
                      <li className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${/[A-Z]/.test(passwordValue) ? "text-amber-800" : "text-sand-400"}`}>
                        <span className={`text-[11px] w-4 text-center shrink-0 font-bold ${/[A-Z]/.test(passwordValue) ? "text-amber-800" : "text-sand-300"}`} aria-hidden="true">
                          {/[A-Z]/.test(passwordValue) ? '✓' : '✗'}
                        </span>
                        One uppercase letter
                      </li>
                      <li className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${/[a-z]/.test(passwordValue) ? "text-amber-800" : "text-sand-400"}`}>
                        <span className={`text-[11px] w-4 text-center shrink-0 font-bold ${/[a-z]/.test(passwordValue) ? "text-amber-800" : "text-sand-300"}`} aria-hidden="true">
                          {/[a-z]/.test(passwordValue) ? '✓' : '✗'}
                        </span>
                        One lowercase letter
                      </li>
                      <li className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${/\d/.test(passwordValue) ? "text-amber-800" : "text-sand-400"}`}>
                        <span className={`text-[11px] w-4 text-center shrink-0 font-bold ${/\d/.test(passwordValue) ? "text-amber-800" : "text-sand-300"}`} aria-hidden="true">
                          {/\d/.test(passwordValue) ? '✓' : '✗'}
                        </span>
                        One number
                      </li>
                      <li className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${/[^A-Za-z0-9\s]/.test(passwordValue) ? "text-amber-800" : "text-sand-400"}`}>
                        <span className={`text-[11px] w-4 text-center shrink-0 font-bold ${/[^A-Za-z0-9\s]/.test(passwordValue) ? "text-amber-800" : "text-sand-300"}`} aria-hidden="true">
                          {/[^A-Za-z0-9\s]/.test(passwordValue) ? '✓' : '✗'}
                        </span>
                        One special character
                      </li>
                    </ul>

                    {errors.password && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="confirmPassword" className="mb-0 text-sand-800 font-medium text-sm">Confirm Password</Label>
                      <button
                        type="button"
                        className="text-amber-800 bg-transparent text-xs font-semibold px-2 py-1 rounded-lg transition-colors hover:bg-sand-100/50 hover:text-amber-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center min-h-[2rem]"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      error={!!errors.confirmPassword}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      disabled={loading}
                      aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                      className="bg-transparent focus:bg-white border-sand-300 focus:border-amber-800 focus:ring-amber-800/20 transition-colors h-10"
                      {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>
                    )}
                  </div>


                  {/* Cloudflare Turnstile CAPTCHA */}
                  <div className="mb-3 flex flex-col items-center gap-0">
                    <div ref={turnstileRef} className="min-h-[50px] w-full flex justify-center scale-90 origin-top" />
                    {errors.captchaToken && (
                      <p className="text-xs text-red-600 font-medium -mt-2">{errors.captchaToken.message}</p>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 font-bold h-10 border border-sand-200 bg-transparent hover:bg-sand-50/50 hover:border-sand-300 text-sand-700 transition-colors"
                      onClick={() => setStep(1)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-[2_2_0%] font-bold tracking-wide shadow-md hover:shadow-lg bg-amber-800 hover:bg-amber-900 focus-visible:outline-amber-800 h-10 text-white transition-colors"
                      disabled={loading}
                      aria-busy={loading}
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
