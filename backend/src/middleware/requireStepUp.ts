import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';
import { getSessionStatus } from '../lib/sessionRegistry.js';

export const requireStepUp = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const localUser = req.localUser;
    const sessionId = req.user?.sessionId;

    if (!localUser || !sessionId) {
      throw AppError.unauthorized('No active authenticated session');
    }

    const status = await getSessionStatus(localUser.id, sessionId);
    if (!status) {
      throw AppError.unauthorized('Session not found');
    }

    if (status.stepUpRequired) {
      throw AppError.forbidden('Step-up authentication required', 'STEP_UP_REQUIRED');
    }

    next();
  } catch (error) {
    next(error);
  }
};