/**
 * Admin Controller — thin HTTP layer
 *
 * Delegates all business logic to adminUserService.
 * Only responsible for: extracting HTTP params, calling services, sending responses.
 */

import { Request, Response } from 'express';
import { AppError } from '../lib/AppError.js';
import { parsePagination, paginatedResult } from '../lib/pagination.js';
import {
  createStaffUser,
  changeUserStatus,
  listUsers,
  listAuditLog,
} from '../services/adminUserService.js';
import type { AccountStatus } from '../repositories/adminRepository.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/users
 */
export const createAdminUser = async (req: Request, res: Response): Promise<void> => {
  const result = await createStaffUser(req.body, req.user?.id, {
    headers: req.headers as Record<string, string | string[] | undefined>,
    socketAddress: req.socket?.remoteAddress,
  });

  res.status(201).json({ data: result });
};

/**
 * GET /api/admin/users
 */
export const listAdminUsers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = parsePagination(req);
  const { data, total } = await listUsers(
    {
      accountType: req.query.accountType as string | undefined,
      accountStatus: req.query.accountStatus as string | undefined,
      search: req.query.search as string | undefined,
    },
    page,
    limit,
    skip,
  );

  res.json(paginatedResult(data, total, page, limit));
};

/**
 * PATCH /api/admin/users/:id/status
 */
export const updateAdminUserStatus = async (req: Request, res: Response): Promise<void> => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const actorId = req.user?.id;

  if (!id || !UUID_V4_REGEX.test(id)) {
    throw AppError.badRequest('Invalid user id');
  }

  if (!actorId) {
    throw AppError.unauthorized('No authenticated user');
  }

  const data = await changeUserStatus(
    {
      userId: id,
      accountStatus: req.body.accountStatus as AccountStatus,
      reason: req.body.reason as string | undefined,
      actorId,
    },
    {
      headers: req.headers as Record<string, string | string[] | undefined>,
      socketAddress: req.socket?.remoteAddress,
    },
  );

  res.json({ data });
};

/**
 * GET /api/admin/audit-log
 */
export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, skip } = parsePagination(req);
  const { data, total } = await listAuditLog(
    {
      actorId: req.query.actorId as string | undefined,
      action: req.query.action as string | undefined,
      targetId: req.query.targetId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    },
    page,
    limit,
    skip,
  );

  res.json(paginatedResult(data, total, page, limit));
};
