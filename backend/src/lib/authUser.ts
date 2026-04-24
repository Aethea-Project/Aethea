import { Request } from 'express';
import prisma from './prisma.js';

interface AuthenticatedUser {
  id: string;
  accountType?: 'patient' | 'doctor' | 'pharmacist' | 'admin';
}

const toShadowEmail = (userId: string): string => `${userId}@shadow.local`;

export const getAuthenticatedUser = (req: Request): AuthenticatedUser | null => {
  const user = (req as Request & { user?: { id?: unknown; account_type?: unknown } }).user;

  if (!user || typeof user.id !== 'string') {
    return null;
  }

  const accountType = typeof user.account_type === 'string'
    ? (user.account_type as AuthenticatedUser['accountType'])
    : undefined;

  return {
    id: user.id,
    accountType,
  };
};

export const ensureLocalUser = async (authUser: AuthenticatedUser) => {
  const shadowEmail = toShadowEmail(authUser.id);
  const accountType = authUser.accountType || 'patient';
  
  // 1. Ensure primary user record exists via Prisma
  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: { accountType },
    create: {
      id: authUser.id,
      email: shadowEmail,
      accountType,
    },
  });

  // 2. Ensure user_accounts record exists via raw SQL to bypass Prisma mapping issues
  // We use ON CONFLICT DO NOTHING to avoid overwriting existing status/privileges
  await prisma.$executeRaw`
    INSERT INTO public.user_accounts (id, account_type, account_status, must_change_password)
    VALUES (
      ${authUser.id}::uuid,
      ${accountType}::public.account_type,
      'active'::public.account_status,
      FALSE
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // 3. Fetch the final account status
  const accountRows = await prisma.$queryRaw<Array<{ account_status: string }>>`
    SELECT account_status FROM public.user_accounts WHERE id = ${authUser.id}::uuid
  `;
  
  const accountStatus = accountRows[0]?.account_status || 'active';

  return {
    ...user,
    accountStatus,
  };
};
