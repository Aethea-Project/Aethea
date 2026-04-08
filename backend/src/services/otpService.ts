import { randomInt } from 'node:crypto';
import { getRedisClient } from '../lib/redisClient.js';
import logger from '../lib/logger.js';

// In-memory fallback if Redis is unavailable
const inMemoryOtpStore = new Map<string, { code: string; expiresAt: number }>();

const OTP_EXPIRES_IN_SECONDS = 10 * 60;

const buildOtpKey = (scope: 'profile_update' | 'password_change', userId: string): string => {
  return `${scope}_otp:${userId}`;
};

const generateOtp = async (
  scope: 'profile_update' | 'password_change',
  userId: string,
): Promise<{ code: string; expiresInSeconds: number }> => {
  const code = randomInt(100000, 1000000).toString();
  const key = buildOtpKey(scope, userId);

  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(key, code, { EX: OTP_EXPIRES_IN_SECONDS });
      return { code, expiresInSeconds: OTP_EXPIRES_IN_SECONDS };
    }
  } catch (error) {
    logger.error({ error, scope }, 'Redis failed to set OTP, falling back to memory');
  }

  inMemoryOtpStore.set(key, { code, expiresAt: Date.now() + OTP_EXPIRES_IN_SECONDS * 1000 });
  return { code, expiresInSeconds: OTP_EXPIRES_IN_SECONDS };
};

const verifyOtp = async (
  scope: 'profile_update' | 'password_change',
  userId: string,
  code: string,
): Promise<boolean> => {
  const key = buildOtpKey(scope, userId);

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
    logger.error({ error, scope }, 'Redis failed to get OTP, falling back to memory');
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

export const generateProfileUpdateOTP = async (userId: string): Promise<{ code: string; expiresInSeconds: number }> => {
  return generateOtp('profile_update', userId);
};

export const verifyProfileUpdateOTP = async (userId: string, code: string): Promise<boolean> => {
  return verifyOtp('profile_update', userId, code);
};

export const generatePasswordChangeOTP = async (userId: string): Promise<{ code: string; expiresInSeconds: number }> => {
  return generateOtp('password_change', userId);
};

export const verifyPasswordChangeOTP = async (userId: string, code: string): Promise<boolean> => {
  return verifyOtp('password_change', userId, code);
};
