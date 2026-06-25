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
const isTest = process.env.NODE_ENV === 'test';

const redactUrlToken = (url: string | undefined): string | undefined => {
  if (!url) return url;
  return url.replace(/([?&]token=)[^&]*/gi, '$1[REDACTED]');
};

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : isTest ? 'silent' : 'debug'),
  transport: isProduction || isTest
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
  hooks: {
    logMethod(args, method) {
      const first = args[0];
      if (first && typeof first === 'object') {
        const record = first as {
          req?: { url?: string; originalUrl?: string };
          url?: string;
          originalUrl?: string;
        };
        record.url = redactUrlToken(record.url);
        record.originalUrl = redactUrlToken(record.originalUrl);
        if (record.req) {
          record.req = {
            ...record.req,
            url: redactUrlToken(record.req.url),
            originalUrl: redactUrlToken(record.req.originalUrl),
          };
        }
      }
      method.apply(this, args);
    },
  },
  // Add base fields to every log line
  base: {
    service: 'medical-platform-api',
    pid: process.pid,
  },
});

export default logger;
