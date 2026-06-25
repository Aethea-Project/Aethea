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

import { SEEDED_EMAILS, SEEDED_IDS } from './constants.js';

export const ensureLocalUser = async (authUser: AuthenticatedUser, email?: string) => {
  const shadowEmail = toShadowEmail(authUser.id);
  const accountType = authUser.accountType || 'patient';
  
  // Determine if this is a seeded test user
  let userEmail = email;
  if (!userEmail) {
    const existing = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (existing) {
      userEmail = existing.email;
    }
  }
  
  const isSeeded = (userEmail && SEEDED_EMAILS.has(userEmail.toLowerCase())) || SEEDED_IDS.has(authUser.id);

  // 1. Ensure primary user record exists via Prisma
  let user;
  try {
    user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: { 
        accountType,
        ...(userEmail ? { email: userEmail } : {}),
      },
      create: {
        id: authUser.id,
        email: userEmail || shadowEmail,
        accountType,
      },
    });
    } catch (err: any) {
      if (err.code === 'P2002') {
        user = await prisma.user.findUnique({ where: { id: authUser.id } });
        if (!user) {
          // If user doesn't exist, the unique constraint violation is likely on the email field
          // This happens if a previous user was deleted from Supabase but not Prisma, 
          // or if emails got out of sync. Supabase is the source of truth, so we free the email.
          const conflictingEmail = userEmail || shadowEmail;
          const conflictingUser = await prisma.user.findUnique({ where: { email: conflictingEmail } });
          
          if (conflictingUser && conflictingUser.id !== authUser.id) {
            // Rename the orphaned user's email to free it up
            await prisma.user.update({
              where: { id: conflictingUser.id },
              data: { email: `orphan_${Date.now()}_${conflictingUser.id.substring(0, 8)}@deleted.local` }
            });
            
            // Retry the upsert now that the conflict is resolved
            user = await prisma.user.upsert({
              where: { id: authUser.id },
              update: { 
                accountType,
                ...(userEmail ? { email: userEmail } : {}),
              },
              create: {
                id: authUser.id,
                email: conflictingEmail,
                accountType,
              },
            });
          } else {
            throw err;
          }
        }
      } else {
        throw err;
      }
    }

  if (isSeeded) {
    // Force user accounts table to be active and clear force password changes
    await prisma.$executeRaw`
      INSERT INTO public.user_accounts (id, account_type, account_status, must_change_password)
      VALUES (
        ${authUser.id}::uuid,
        ${accountType}::public.account_type,
        'active'::public.account_status,
        FALSE
      )
      ON CONFLICT (id) DO UPDATE SET
        account_status = 'active'::public.account_status,
        must_change_password = FALSE
    `;

    // Make sure doctor/pharmacist profiles are present and verified to bypass onboarding
    if (accountType === 'doctor') {
      try {
        await prisma.doctorProfile.upsert({
          where: { userId: authUser.id },
          update: { verified: true },
          create: {
            userId: authUser.id,
            firstName: 'Developer',
            lastName: 'Doctor',
            specialty: 'Internal Medicine',
            clinicName: 'Aethea Local Dev Clinic',
            consultFee: 150,
            languages: ['English'],
            verified: true,
          },
        });
      } catch (err: any) {
        if (err.code !== 'P2002') throw err;
      }

      await prisma.$executeRaw`
        INSERT INTO public.staff_profiles (user_id, staff_type, specialty, verification_status, submitted_at, reviewed_at)
        VALUES (
          ${authUser.id}::uuid,
          'doctor'::public.account_type,
          'Internal Medicine',
          'verified',
          now(),
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          verification_status = 'verified'
      `;
    } else if (accountType === 'pharmacist') {
      await prisma.$executeRaw`
        INSERT INTO public.staff_profiles (user_id, staff_type, specialty, verification_status, submitted_at, reviewed_at)
        VALUES (
          ${authUser.id}::uuid,
          'pharmacist'::public.account_type,
          'Pharmacy Practice',
          'verified',
          now(),
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          verification_status = 'verified'
      `;
    }
  } else {
    // 2. Ensure user_accounts record exists via raw SQL to bypass Prisma mapping issues
    // We use ON CONFLICT DO NOTHING to avoid overwriting existing status/privileges for normal users
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
  }

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
