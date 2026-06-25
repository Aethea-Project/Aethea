import { Request, Response, NextFunction } from 'express';

const EXEMPT_PATHS = new Set([
  '/v1/users/me',
  '/v1/staff/verification/me',
  '/v1/auth/status',
  '/users/me',
  '/staff/verification/me',
  '/auth/status',
]);

export const requireAAL2 = (req: Request, res: Response, next: NextFunction) => {
  try {
    // If not authenticated, let the downstream auth handling catch it
    if (!req.user) {
      next();
      return;
    }

    // Parse the current path, removing '/api' prefix and query parameters
    let path = req.originalUrl.split('?')[0];
    if (path.startsWith('/api')) {
      path = path.substring(4);
    }

    // Exempt paths bypass AAL2
    if (EXEMPT_PATHS.has(path)) {
      next();
      return;
    }

    // Only enforce AAL2 for doctor, pharmacist, and admin roles
    const role = req.user.account_type;
    if (role !== 'doctor' && role !== 'pharmacist' && role !== 'admin') {
      next();
      return;
    }

    // Bypass MFA in non-production environments for easier local development
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }

    // Enforce AAL2
    if (req.user.aal !== 'aal2') {
      res.status(403).json({
        error: 'MFA_REQUIRED',
        action: 'SETUP_MFA',
        message: 'Multi-factor authentication (AAL2) is required to access this resource.',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
