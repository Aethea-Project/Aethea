import { createClient } from 'redis';
import logger from './logger.js';

let redisClient: ReturnType<typeof createClient> | null = null;

export const getRedisClient = async () => {
  if (redisClient) return redisClient;
  
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not provided. Redis client will not be initialized.');
    return null;
  }
  
  redisClient = createClient({ url: process.env.REDIS_URL });
  
  redisClient.on('error', (err: any) => logger.warn({ err }, 'Redis Client Error'));
  
  try {
    await redisClient.connect();
    logger.info('Redis client connected successfully.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to Redis');
    redisClient = null;
  }
  
  return redisClient;
};
