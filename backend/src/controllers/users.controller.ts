/**
 * Users Controller
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { getSupabaseAdminClient } from '../lib/supabaseAdmin.js';
import {
  generatePasswordChangeOTP,
  generateProfileUpdateOTP,
  verifyPasswordChangeOTP,
  verifyProfileUpdateOTP,
} from '../services/otpService.js';
import { sendPasswordChangeOtpEmail, sendProfileUpdateOtpEmail } from '../services/emailService.js';
import { updatePublicProfile } from '../repositories/userRepository.js';

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (attached by authMiddleware).
 */
export const getProfile = (req: Request, res: Response): void => {
  res.json({
    user: req.user,
  });
};

export const requestProfileUpdate = async (req: Request, res: Response) => {
  const { password } = req.body;
  const supabase = getSupabaseAdminClient();

  const { data: userResp } = await supabase.auth.admin.getUserById(req.user!.id);
  const isOAuth = userResp.user?.app_metadata?.provider !== 'email' && userResp.user?.app_metadata?.provider !== undefined;

  if (!isOAuth) {
    if (!password) {
      throw AppError.badRequest('Current password is required', 'CURRENT_PASSWORD_REQUIRED');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: req.user!.email!,
      password,
    });
    if (error) {
      throw new AppError('Incorrect password', 401, 'INVALID_PASSWORD');
    }
  }

  const challenge = await generateProfileUpdateOTP(req.user!.id);
  if (!challenge) {
    throw new AppError('Failed to generate verification code', 500, 'CHALLENGE_FAILED');
  }
  await sendProfileUpdateOtpEmail({
    to: req.user!.email!,
    code: challenge.code,
    expiresInSeconds: challenge.expiresInSeconds,
  });
  res.json({ message: 'Verification code sent', expiresInSeconds: challenge.expiresInSeconds });
};

export const verifyProfileUpdate = async (req: Request, res: Response) => {
  const { code, updates } = req.body;
  const isValid = await verifyProfileUpdateOTP(req.user!.id, code);
  if (!isValid) {
    throw new AppError('Invalid or expired code', 401, 'INVALID_OTP_CODE');
  }

  // 1. Update Supabase Identity (user_metadata)
  const supabase = getSupabaseAdminClient();
  const { data: currentUser } = await supabase.auth.admin.getUserById(req.user!.id);
  const existingMetadata = currentUser.user?.user_metadata || {};

  // Map camelCase to snake_case for user_metadata so frontend ensureProfileRow doesn't rollback
  const metadataUpdates = { ...existingMetadata, ...updates };
  if (updates.firstName !== undefined) metadataUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) metadataUpdates.last_name = updates.lastName;
  if (updates.firstName && updates.lastName) {
    metadataUpdates.full_name = `${updates.firstName} ${updates.lastName}`;
    metadataUpdates.name = `${updates.firstName} ${updates.lastName}`;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(req.user!.id, {
    user_metadata: metadataUpdates,
  });
  if (error) {
    throw new AppError('Failed to update profile identity', 500, 'UPDATE_FAILED');
  }

  // 2. Sync changes to the Postgres public.profiles table
  try {
    await updatePublicProfile(req.user!.id, req.user!.email!, updates);
  } catch {
    throw new AppError('Failed to update public profile', 500, 'UPDATE_FAILED');
  }

  res.json({ message: 'Profile updated successfully', user: data.user });
};

export const requestPasswordChange = async (req: Request, res: Response) => {
  const { currentPassword, captchaToken } = req.body as { currentPassword?: string; captchaToken?: string };
  const email = req.user?.email;

  if (!email) {
    throw AppError.unauthorized('Missing authenticated user email context');
  }

  const mustChangePassword = req.user?.must_change_password === true;
  if (!mustChangePassword) {
    const supabase = getSupabaseAdminClient();
    const { data: userResp } = await supabase.auth.admin.getUserById(req.user!.id);
    const isOAuth = userResp.user?.app_metadata?.provider !== 'email' && userResp.user?.app_metadata?.provider !== undefined;

    if (!isOAuth) {
      if (!currentPassword) {
        throw AppError.badRequest('Current password is required', 'CURRENT_PASSWORD_REQUIRED');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
        options: captchaToken ? { captchaToken } : undefined,
      });

      if (error) {
        const message = error.message || 'Incorrect password';
        const isCaptchaError = /captcha/i.test(message);
        throw new AppError(
          message,
          isCaptchaError ? 400 : 401,
          isCaptchaError ? 'CAPTCHA_VERIFICATION_FAILED' : 'INVALID_PASSWORD',
        );
      }
    }
  }

  const challenge = await generatePasswordChangeOTP(req.user!.id);
  if (!challenge) {
    throw new AppError('Failed to generate verification code', 500, 'CHALLENGE_FAILED');
  }

  await sendPasswordChangeOtpEmail({
    to: email,
    code: challenge.code,
    expiresInSeconds: challenge.expiresInSeconds,
  });

  res.json({
    message: 'Verification code sent',
    expiresInSeconds: challenge.expiresInSeconds,
  });
};

export const verifyPasswordChange = async (req: Request, res: Response) => {
  const { code } = req.body as { code: string };
  const isValid = await verifyPasswordChangeOTP(req.user!.id, code);
  if (!isValid) {
    throw new AppError('Invalid or expired code', 401, 'INVALID_OTP_CODE');
  }

  res.json({
    verified: true,
  });
};

export const getAvatarUploadUrl = async (req: Request, res: Response) => {
  const { fileName } = req.body;
  if (!fileName || typeof fileName !== 'string') {
    throw AppError.badRequest('fileName is required', 'FILENAME_REQUIRED');
  }

  // Ensure safe file name
  const SAFE_UPLOAD_FILE_REGEX = /^[a-zA-Z0-9._-]+$/;
  if (!SAFE_UPLOAD_FILE_REGEX.test(fileName) || fileName.length > 160) {
    throw AppError.badRequest('Invalid file name', 'INVALID_FILENAME');
  }

  const timestamp = Date.now();
  const objectPath = `${req.user!.id}/${timestamp}-${fileName}`;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUploadUrl(objectPath);

  if (error || !data) {
    throw AppError.badRequest(error?.message || 'Failed to create signed upload URL', 'UPLOAD_URL_FAILED');
  }

  res.json({
    token: data.token,
    path: data.path,
  });
};
