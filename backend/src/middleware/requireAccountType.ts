import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';
import { ACCOUNT_TYPES, ACCOUNT_STATUSES } from '../lib/constants.js';

export type AccountType = typeof ACCOUNT_TYPES[keyof typeof ACCOUNT_TYPES];
export type AccountStatus = typeof ACCOUNT_STATUSES[keyof typeof ACCOUNT_STATUSES];

const getAuthClaims = (req: Request): { accountType: AccountType; accountStatus: AccountStatus; mustChangePassword: boolean } => {
  const accountType = req.user?.account_type as AccountType;
  const accountStatus = req.user?.account_status as AccountStatus;

  if (!accountType || !Object.values(ACCOUNT_TYPES).includes(accountType)) {
    throw AppError.unauthorized('Missing or invalid account_type claim');
  }

  if (!accountStatus || !Object.values(ACCOUNT_STATUSES).includes(accountStatus)) {
    throw AppError.unauthorized('Missing or invalid account_status claim');
  }

  return {
    accountType,
    accountStatus,
    mustChangePassword: req.user?.must_change_password === true,
  };
};

const checkAccountStatus = (accountStatus: AccountStatus, allowedStatuses: AccountStatus[] = [ACCOUNT_STATUSES.ACTIVE as AccountStatus]) => {
  if (!allowedStatuses.includes(accountStatus)) {
    if (accountStatus === ACCOUNT_STATUSES.SUSPENDED) {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }
    if (accountStatus === ACCOUNT_STATUSES.REJECTED) {
      throw new AppError('Your account was rejected. Contact support.', 403);
    }
    if (accountStatus === ACCOUNT_STATUSES.PENDING) {
      throw new AppError('Your account is pending approval by an administrator.', 403);
    }
    throw new AppError('Your account status does not allow this action.', 403);
  }
};

/**
 * Ensures required authorization claims exist and are valid.
 * Keep this before any DB middleware to fail fast and reduce load.
 */
export const requireTrustedClaims = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Not authenticated');
    }
    getAuthClaims(req);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Allows only active accounts to continue.
 * Suspended/rejected/pending accounts are rejected before controller/DB work.
 */
export const requireActiveAccount = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { accountStatus } = getAuthClaims(req);
    checkAccountStatus(accountStatus);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restricts a route to users whose account_type is in `allowedTypes`.
 * Also blocks suspended, rejected, and pending accounts.
 *
 * Usage:
 *   router.get('/admin/users', requireAccountType('admin'), handler);
 *   router.get('/prescriptions', requireAccountType('doctor', 'pharmacist'), handler);
 */
export const requireAccountType = (...allowedTypes: AccountType[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { accountType, accountStatus } = getAuthClaims(req);

      if (!allowedTypes.includes(accountType)) {
        throw new AppError('Forbidden — insufficient account privileges', 403);
      }

      checkAccountStatus(accountStatus);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Restricts to account types and an explicit allowlist of statuses.
 * Useful for onboarding flows where pending staff must still access endpoints.
 */
export const requireAccountTypeWithStatuses = (
  allowedTypes: AccountType[],
  allowedStatuses: AccountStatus[],
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { accountType, accountStatus } = getAuthClaims(req);

      if (!allowedTypes.includes(accountType)) {
        throw new AppError('Forbidden — insufficient account privileges', 403);
      }

      checkAccountStatus(accountStatus, allowedStatuses);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Blocks access if the user must change their password first.
 * Place after requireLocalUser on any route a first-login staff user should not reach.
 *
 * Usage:
 *   router.get('/dashboard', requireLocalUser, requirePasswordChanged, handler);
 */
export const requirePasswordChanged = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const { mustChangePassword } = getAuthClaims(req);
    if (mustChangePassword) {
      throw new AppError('You must change your password before accessing this resource.', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};
