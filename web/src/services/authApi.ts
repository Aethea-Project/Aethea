import { authFetch } from '../lib/apiClient';

interface PasswordCompletionResponse {
  success: boolean;
}

/**
 * Marks first-login password change as completed in backend auth state.
 */
export const completePasswordChange = async (options?: { recoveryFlow?: boolean }): Promise<void> => {
  await authFetch<PasswordCompletionResponse>('/v1/auth/password/complete', {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
};
