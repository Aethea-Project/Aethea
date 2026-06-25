/**
 * Forgot Password Form Component
 * Allows users to request a password reset email
 * Refactored to use React Hook Form + Zod schemas for robust validation.
 */

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@core/auth/useAuth';
import { useTurnstile } from '../hooks/useTurnstile';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../lib/validations/auth';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { PublicNavbar } from './PublicNavbar';

export const ForgotPasswordForm: React.FC = () => {
  const { resetPassword, loading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
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

  const onSubmit = async (data: ForgotPasswordInput) => {
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
      await resetPassword(data.email.trim().toLowerCase(), captchaToken);
      setSuccess(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send reset email';
      setGlobalError(errMsg);
    } finally {
      resetCaptcha();
    }
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen font-sans bg-gradient-to-r from-[#F9F7F3] to-[#F4EFE6] lg:overflow-hidden relative">
      
      {/* ──────────────────────────────────────────────── */}
      {/* SHARED NAVBAR                                    */}
      {/* ──────────────────────────────────────────────── */}
      <PublicNavbar variant="login" />

      {/* ──────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA                                */}
      {/* ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex overflow-hidden">
        
        {/* RIGHT PANEL: Flowers */}
        <div className="absolute inset-y-0 right-0 w-1/2 z-0 hidden lg:block bg-transparent">
          <img 
            src="/flower-Login.webp" 
            alt="Beautiful calming flowers"
            className="w-full h-full object-contain object-right drop-shadow-[0_15px_30px_rgba(0,0,0,0.06)]"
          />
        </div>

        {/* CENTER: Leaf Separator */}
        <div className="hidden lg:block absolute bottom-0 top-0 left-[49.5%] -translate-x-1/2 z-[60] pointer-events-none">
          <img 
            src="/leaf.webp" 
            alt="Elegant leaf separator" 
            className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)] mix-blend-multiply translate-y-8"
          />
        </div>

        {/* LEFT PANEL: Form */}
        <div className="relative z-10 flex w-full lg:w-1/2 min-h-screen lg:h-full justify-center px-6 pt-24 lg:pt-36 pb-6 bg-transparent lg:-translate-x-4 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-sm flex flex-col justify-start">
            <form
              className="w-full relative z-20"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
            {/* ── Header ────────────────── */}
            <div className="flex flex-col items-center gap-2 text-center mb-8">
              <Link to="/" className="inline-block mb-2" aria-label="Back to home">
                <img src="/AetheaLogo.webp" alt="Aethea Logo" className="h-8 w-auto object-contain" />
              </Link>
              <h1 className="m-0 font-serif text-[2.5rem] font-semibold text-sand-900 tracking-tight">Reset Password</h1>
              <p className="m-0 text-[15px] text-sand-600">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

              {globalError && (
                <div className="flex items-start gap-2 bg-red-50/80 border border-red-200 rounded-lg py-2 px-3 mb-4 text-red-700 text-xs leading-relaxed" role="alert">
                  {globalError}
                </div>
              )}

              {success ? (
                <div className="flex flex-col items-center bg-emerald-50/80 border border-emerald-200 rounded-lg py-3 px-4 mb-4 text-emerald-700 text-sm leading-relaxed" role="status">
                  <p className="m-0 text-center">If an account exists with that email, you'll receive a password reset link shortly.</p>
                  <p className="m-0 mt-4 text-center">
                    <Link to="/login" className="font-medium text-sand-900 hover:text-sand-900 underline">Back to Sign In</Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email Input */}
                  <div className="mb-4">
                    <Label htmlFor="email" className="text-sand-800 font-medium text-sm">E-Mail Address</Label>
                    <Input
                      id="email"
                      type="email"
                      error={!!errors.email}
                      placeholder="email@example.com"
                      autoComplete="email"
                      disabled={loading}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      className="bg-transparent focus:bg-white border-sand-300 transition-colors h-12"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Cloudflare Turnstile CAPTCHA */}
                  <div className="min-h-[65px] flex flex-col items-center gap-2 mt-4 mb-6">
                    <div ref={turnstileRef} />
                    {errors.captchaToken && (
                      <p className="text-xs text-red-600 font-medium">{errors.captchaToken.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full mb-6 font-bold tracking-wide shadow-md hover:shadow-lg bg-olive-600 hover:bg-olive-700 focus-visible:outline-olive-600 h-12 text-white"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    {loading ? 'Sending...' : 'SEND RESET LINK'}
                  </Button>
                </div>
              )}

            {/* Back to Login Link */}
            {!success && (
              <div className="flex items-center justify-center text-sm text-sand-600 mt-6">
                <Link to="/login" className="font-medium text-sand-800 hover:text-olive-600 hover:underline underline-offset-4 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            )}
          </form>
          </div>
        </div>
      </div>
    </div>
  );
};
