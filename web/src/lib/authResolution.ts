import { decodeJWT } from '@core/auth/auth-utils';
import type { AccountStatus, AccountType } from '@core/auth/auth-types';

type SessionLike = {
  access_token?: string;
  user?: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
} | null | undefined;

export const parseAccountType = (value: unknown): AccountType | null => {
  return value === 'patient' || value === 'doctor' || value === 'pharmacist' || value === 'admin'
    ? value
    : null;
};

export const parseAccountStatus = (value: unknown): AccountStatus | null => {
  return value === 'pending' || value === 'active' || value === 'suspended' || value === 'rejected'
    ? value
    : null;
};

export const getAccountTypeFromSession = (accessToken?: string): AccountType | null => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  return parseAccountType((decoded as { account_type?: unknown }).account_type);
};

export const getAccountStatusFromSession = (accessToken?: string): AccountStatus | null => {
  if (!accessToken) return null;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return null;
  return parseAccountStatus((decoded as { account_status?: unknown }).account_status);
};

export const getMustChangePasswordFromSession = (accessToken?: string): boolean => {
  if (!accessToken) return false;
  const decoded = decodeJWT(accessToken);
  if (!decoded || typeof decoded !== 'object') return false;
  return (decoded as { must_change_password?: unknown }).must_change_password === true;
};

export const getAccountTypeFromMetadata = (session: SessionLike): AccountType | null => {
  const appType = parseAccountType(session?.user?.app_metadata?.account_type);
  if (appType) return appType;
  const userTypeSnake = parseAccountType(session?.user?.user_metadata?.account_type);
  if (userTypeSnake) return userTypeSnake;
  return parseAccountType(session?.user?.user_metadata?.accountType);
};

export const getAccountStatusFromMetadata = (session: SessionLike): AccountStatus | null => {
  const appStatus = parseAccountStatus(session?.user?.app_metadata?.account_status);
  if (appStatus) return appStatus;
  const userStatusSnake = parseAccountStatus(session?.user?.user_metadata?.account_status);
  if (userStatusSnake) return userStatusSnake;
  return parseAccountStatus(session?.user?.user_metadata?.accountStatus);
};

export const getMustChangePasswordFromMetadata = (session: SessionLike): boolean => {
  return session?.user?.app_metadata?.must_change_password === true ||
    session?.user?.user_metadata?.must_change_password === true ||
    session?.user?.user_metadata?.mustChangePassword === true;
};

export const resolveAccountType = (
  session: SessionLike,
  profileAccountType: AccountType | null | undefined,
): AccountType | null => {
  return getAccountTypeFromSession(session?.access_token) ?? getAccountTypeFromMetadata(session) ?? profileAccountType ?? null;
};

export const resolveAccountStatus = (
  session: SessionLike,
  profileAccountStatus: AccountStatus | null | undefined,
): AccountStatus | null => {
  return getAccountStatusFromSession(session?.access_token) ?? getAccountStatusFromMetadata(session) ?? profileAccountStatus ?? null;
};

export const resolveMustChangePassword = (
  session: SessionLike,
  profileMustChangePassword: boolean | undefined,
): boolean => {
  return getMustChangePasswordFromSession(session?.access_token) || getMustChangePasswordFromMetadata(session) || profileMustChangePassword === true;
};

export const getPostLoginPath = (accountType: AccountType | null): string => {
  if (accountType === 'doctor') return '/doctor/dashboard';
  if (accountType === 'pharmacist') return '/clinic-hours';
  if (accountType === 'admin') return '/admin/dashboard';
  return '/dashboard';
};
