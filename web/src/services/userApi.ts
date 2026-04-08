import { authFetch } from '../lib/apiClient';
import type { ProfileUpdateRequest } from '@core/auth/auth-types';

export const requestProfileUpdateOTP = async (password: string) => {
  return authFetch('/users/profile/update-request', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
};

export const verifyProfileUpdateOTP = async (code: string, updates: ProfileUpdateRequest) => {
  return authFetch('/users/profile/verify-update', {
    method: 'PUT',
    body: JSON.stringify({ code, updates }),
  });
};

export const requestPasswordChangeOTP = async (params: { currentPassword?: string; captchaToken?: string }) => {
  return authFetch('/users/password/change-request', {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

export const verifyPasswordChangeOTP = async (code: string) => {
  return authFetch('/users/password/verify-change', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
};
