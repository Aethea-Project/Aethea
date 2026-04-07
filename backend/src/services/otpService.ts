import { randomInt } from 'node:crypto';
import { getRedisClient } from '../lib/redisClient.js';
import logger from '../lib/logger.js';

// In-memory fallback if Redis is unavailable
const inMemoryOtpStore = new Map<string, { code: string; expiresAt: number }>();

export const generateProfileUpdateOTP = async (userId: string): Promise<{ code: string; expiresInSeconds: number }> => {
  const code = randomInt(100000, 1000000).toString();
  const expiresInSeconds = 10 * 60; // 10 minutes
  const key = `profile_update_otp:${userId}`;

  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(key, code, { EX: expiresInSeconds });
      return { code, expiresInSeconds };
    }
  } catch (error) {
    logger.error({ error }, 'Redis failed to set OTP, falling back to memory');
  }

  inMemoryOtpStore.set(key, { code, expiresAt: Date.now() + expiresInSeconds * 1000 });
  return { code, expiresInSeconds };
};

export const verifyProfileUpdateOTP = async (userId: string, code: string): Promise<boolean> => {
  const key = `profile_update_otp:${userId}`;

  try {
    const redis = await getRedisClient();
    if (redis) {
      const storedCode = await redis.get(key);
      if (storedCode === code) {
        await redis.del(key);
        return true;
      }
      return false;
    }
  } catch (error) {
    logger.error({ error }, 'Redis failed to get OTP, falling back to memory');
  }

  const record = inMemoryOtpStore.get(key);
  if (!record) return false;

  if (record.expiresAt < Date.now()) {
    inMemoryOtpStore.delete(key);
    return false;
  }

  if (record.code === code) {
    inMemoryOtpStore.delete(key);
    return true;
  }

  return false;
};
