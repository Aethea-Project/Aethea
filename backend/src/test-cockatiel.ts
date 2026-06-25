import { retry, circuitBreaker, handleAll, wrap, ConsecutiveBreaker, ExponentialBackoff } from 'cockatiel';

const retryPolicy = retry(handleAll, { maxAttempts: 3, backoff: new ExponentialBackoff() });
const cbPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 10 * 1000,
  breaker: new ConsecutiveBreaker(5),
});
const llamaCircuit = wrap(retryPolicy, cbPolicy);

llamaCircuit.execute(() => Promise.resolve('test'));
