/**
 * Structured Logger — Pino
 * Replaces console.log/console.error with structured, async, leveled logging.
 *
 * Source: Express.js Production Performance Best Practices
 *   "Use a logging library like Pino, which is the fastest and most efficient option."
 * Source: OWASP REST Security — Audit Logs
 *   "Write audit logs before and after security related events."
 */

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined // JSON output in production (machine-parseable)
    : {
        target: 'pino/file',
        options: { destination: 1 }, // stdout
      },
  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[REDACTED]',
  },
  // Add base fields to every log line
  base: {
    service: 'medical-platform-api',
    pid: process.pid,
  },
});

export default logger;
