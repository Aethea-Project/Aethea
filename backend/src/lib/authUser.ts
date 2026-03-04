import { Request } from 'express';
import prisma from './prisma.js';

interface AuthenticatedUser {
  id: string;
}

const toShadowEmail = (userId: string): string => `${userId}@shadow.local`;

export const getAuthenticatedUser = (req: Request): AuthenticatedUser | null => {
  const user = (req as Request & { user?: { id?: unknown; email?: unknown } }).user;

  if (!user || typeof user.id !== 'string') {
    return null;
  }

  return {
    id: user.id,
  };
};

export const ensureLocalUser = async (authUser: AuthenticatedUser) => {
  const shadowEmail = toShadowEmail(authUser.id);

  return prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: shadowEmail,
    },
  });
};
