/**
 * Scans Controller (placeholder)
 */

import { Request, Response } from 'express';

export const listScans = (_req: Request, res: Response): void => {
  res.json({ scans: [] });
};
