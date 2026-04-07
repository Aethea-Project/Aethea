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
