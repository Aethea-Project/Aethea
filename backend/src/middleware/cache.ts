import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce zero caching for sensitive endpoints (e.g., auth, users, transactions).
 * Prevents clients, downstream proxies, and CDNs from storing the response.
 */
export const noCache = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

/**
 * Middleware to enable targeted public caching for immutable or semi-static data (e.g., medicine catalog, doctor specialties).
 * Supports browser caching and downstream CDN/Edge caching via s-maxage.
 *
 * @param maxAgeSeconds Maximum age for browser caching (in seconds)
 * @param sMaxAgeSeconds Optional maximum age for shared/CDN caching (in seconds). Defaults to maxAgeSeconds.
 */
export const publicCache = (maxAgeSeconds: number, sMaxAgeSeconds?: number) => {
  const cdnAge = sMaxAgeSeconds !== undefined ? sMaxAgeSeconds : maxAgeSeconds;
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${cdnAge}`);
    next();
  };
};
