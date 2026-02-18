import { Request } from 'express';
import prisma from './prisma.js';

interface AuthenticatedUser {
  id: string;
  email: string;
}

export const getAuthenticatedUser = (req: Request): AuthenticatedUser | null => {
  const user = (req as Request & { user?: { id?: unknown; email?: unknown } }).user;

  if (!user || typeof user.id !== 'string') {
    return null;
  }

  const fallbackEmail = `${user.id}@no-email.local`;
  const email = typeof user.email === 'string' && user.email.trim().length > 0
    ? user.email
    : fallbackEmail;

  return {
    id: user.id,
    email,
  };
};

export const ensureLocalUser = async (authUser: AuthenticatedUser) => {
  return prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: authUser.email },
    create: {
      id: authUser.id,
      email: authUser.email,
    },
  });
};
