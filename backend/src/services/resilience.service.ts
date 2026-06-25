import { retry, circuitBreaker, handleAll, wrap, ConsecutiveBreaker, ExponentialBackoff } from 'cockatiel';
import logger from '../lib/logger.js';

const retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 1000, maxDelay: 10000 }),
});

const circuitBreakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 30 * 1000,
  breaker: new ConsecutiveBreaker(5),
});

circuitBreakerPolicy.onBreak(() => logger.warn('Circuit Breaker OPENED - External API failing consistently'));
circuitBreakerPolicy.onHalfOpen(() => logger.info('Circuit Breaker HALF-OPEN - Testing recovery API connection'));
// Note: onClose does not exist on this version of CircuitBreakerPolicy
// circuitBreakerPolicy.onSuccess(() => logger.info('Circuit Breaker CLOSED - External API recovered'));

export const externalApiCircuit = wrap(retryPolicy, circuitBreakerPolicy);

export async function executeResilientCall<T>(apiCall: () => Promise<T>, fallback: T | null = null): Promise<T> {
  try {
    return await externalApiCircuit.execute(apiCall);
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
}
