import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { getRedisClient } from '../lib/redisClient.js';
import logger from '../lib/logger.js';

// In-memory fallback if Redis is unavailable
const inMemoryOtpStore = new Map<string, { codeHash: string; attempts: number; expiresAt: number }>();
const inMemoryPasswordCompletionStore = new Map<string, number>();

const OTP_EXPIRES_IN_SECONDS = 10 * 60;
const PASSWORD_COMPLETION_EXPIRES_IN_SECONDS = 10 * 60;
const MAX_OTP_ATTEMPTS = 5;

const buildOtpKey = (scope: 'profile_update' | 'password_change', userId: string): string => {
  return `${scope}_otp:${userId}`;
};

const buildPasswordCompletionKey = (userId: string): string => {
  return `password_change_verified:${userId}`;
};

const hashCode = (code: string): string => {
  return createHash('sha256').update(code).digest('hex');
};

const hashesMatch = (storedHash: string, code: string): boolean => {
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashCode(code), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const parseStoredOtp = (stored: string): { codeHash?: string; attempts?: number } | null => {
  try {
    const parsed = JSON.parse(stored) as { codeHash?: unknown; attempts?: unknown };
    return {
      codeHash: typeof parsed.codeHash === 'string' ? parsed.codeHash : undefined,
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : undefined,
    };
  } catch {
    return null;
  }
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
      await redis.set(key, JSON.stringify({ codeHash: hashCode(code), attempts: 0 }), { EX: OTP_EXPIRES_IN_SECONDS });
      return { code, expiresInSeconds: OTP_EXPIRES_IN_SECONDS };
    }
  } catch (error) {
    logger.error({ error, scope }, 'Redis failed to set OTP, falling back to memory');
  }

  inMemoryOtpStore.set(key, { codeHash: hashCode(code), attempts: 0, expiresAt: Date.now() + OTP_EXPIRES_IN_SECONDS * 1000 });
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
      const stored = await redis.get(key);
      if (!stored) return false;
      const parsed = parseStoredOtp(stored);
      if (!parsed) {
        await redis.del(key);
        return false;
      }
      const attempts = parsed.attempts ?? 0;
      if (!parsed.codeHash || attempts >= MAX_OTP_ATTEMPTS) {
        await redis.del(key);
        return false;
      }
      if (hashesMatch(parsed.codeHash, code)) {
        await redis.del(key);
        if (scope === 'password_change') {
          await redis.set(buildPasswordCompletionKey(userId), 'verified', { EX: PASSWORD_COMPLETION_EXPIRES_IN_SECONDS });
        }
        return true;
      }
      await redis.set(key, JSON.stringify({ codeHash: parsed.codeHash, attempts: attempts + 1 }), { EX: OTP_EXPIRES_IN_SECONDS });
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

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    inMemoryOtpStore.delete(key);
    return false;
  }

  if (hashesMatch(record.codeHash, code)) {
    inMemoryOtpStore.delete(key);
    if (scope === 'password_change') {
      inMemoryPasswordCompletionStore.set(
        buildPasswordCompletionKey(userId),
        Date.now() + PASSWORD_COMPLETION_EXPIRES_IN_SECONDS * 1000,
      );
    }
    return true;
  }

  inMemoryOtpStore.set(key, { ...record, attempts: record.attempts + 1 });
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

export const consumePasswordChangeVerification = async (userId: string): Promise<boolean> => {
  const key = buildPasswordCompletionKey(userId);

  try {
    const redis = await getRedisClient();
    if (redis) {
      const marker = await redis.get(key);
      if (!marker) return false;
      await redis.del(key);
      return true;
    }
  } catch (error) {
    logger.error({ error }, 'Redis failed to consume password completion marker, falling back to memory');
  }

  const expiresAt = inMemoryPasswordCompletionStore.get(key);
  if (!expiresAt || expiresAt < Date.now()) {
    inMemoryPasswordCompletionStore.delete(key);
    return false;
  }

  inMemoryPasswordCompletionStore.delete(key);
  return true;
};
