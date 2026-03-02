/**
 * Users Controller
 */

import { Request, Response } from 'express';

/**
 * GET /api/users/profile
 * Returns the authenticated user's profile (attached by authMiddleware).
 */
export const getProfile = (req: Request, res: Response): void => {
  res.json({
    user: req.user,
  });
};
