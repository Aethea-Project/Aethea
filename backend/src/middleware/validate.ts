/**
 * Zod Validation Middleware
 *
 * Source: OWASP REST Security — Input Validation
 *   "Validate input: length / range / format and type.
 *    Achieve implicit input validation by using strong types."
 * Source: OWASP API3:2023 — Broken Object Property Level Authorization
 *   Schema validation prevents mass-assignment attacks by only allowing declared fields.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import type { ParsedQs } from 'qs';

/**
 * Validate request body against a Zod schema.
 * Returns 400 with structured errors on failure.
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.issues.map((e: ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
};

/**
 * Validate query params against a Zod schema.
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as ParsedQs;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: err.issues.map((e: ZodIssue) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
};
