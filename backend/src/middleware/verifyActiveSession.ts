import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../lib/redisClient.js';
import prisma from '../lib/prisma.js';

const locks = new Map<string, Promise<void>>();

async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  while (locks.has(userId)) await locks.get(userId);
  let resolveLock!: () => void;
  locks.set(userId, new Promise(r => { resolveLock = r; }));
  try { return await fn(); } finally { locks.delete(userId); resolveLock(); }
}

export const verifyActiveSession = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id ?? (req as any).localUser?.id;
  if (!userId) return next(); // Skip if not authenticated

  const redis = await getRedisClient();
  const redisKey = `user:status:${userId}`;

  try {
    let accountStatus = redis ? await redis.get(redisKey) : null;

    if (!accountStatus) {
      accountStatus = await withUserLock(userId, async () => {
        const reCheck = redis ? await redis.get(redisKey) : null;
        if (reCheck) return reCheck;

        const dbUser = await prisma.user_accounts.findUnique({
          where: { id: userId },
          select: { account_status: true },
        });
        
        const status = dbUser?.account_status || 'pending';

        if (redis) await redis.set(redisKey, status, { EX: 60 });
        return status;
      });
    }

    // Inject the real-time status into the request so requireAccountType can use it
    if ((req as any).user) {
      (req as any).user.account_status = accountStatus;
    }
    
    next();
  } catch (err) {
    next(err);
  }
};
