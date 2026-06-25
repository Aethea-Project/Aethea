import { RequestHandler } from 'express';
import { requireLocalUser } from '../lib/authMiddleware.js';
import {
  requireActiveAccount,
  requirePasswordChanged,
  requireTrustedClaims,
} from './requireAccountType.js';

export const createProtectedAuthChain = (authMiddleware: RequestHandler): RequestHandler[] => [
  authMiddleware,
  requireLocalUser,
  requireTrustedClaims,
  requireActiveAccount,
  requirePasswordChanged,
];

