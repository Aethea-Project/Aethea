/**
 * Pagination Helpers
 *
 * Source: System Design Best Practices — Performance
 *   "If you have a large amount of data, you should always have pagination
 *    with some limit and offset. Payloads should be minimized."
 *
 * Provides a reusable interface for paginated API responses and a helper
 * to extract validated page/limit from Express query params.
 */

import { Request } from 'express';

/** Default and maximum page size */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Shape returned by all paginated list endpoints */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Extract page & limit from query string with safe defaults.
 * Works even without the Zod validateQuery middleware so controllers
 * stay defensive.
 */
export function parsePagination(req: Request): { page: number; limit: number; skip: number } {
  const rawPage = Number(req.query.page);
  const rawLimit = Number(req.query.limit);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build the standard paginated response envelope.
 */
export function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
