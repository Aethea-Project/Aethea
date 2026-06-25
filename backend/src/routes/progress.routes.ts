import { Router, Request, Response, RequestHandler } from 'express';
import { Job } from 'bullmq';
import { createQueueEvents } from '../lib/bullmq.js';
import type { Queue, QueueEvents } from 'bullmq';
import logger from '../lib/logger.js';
import { createProtectedAuthChain } from '../middleware/protectedAuth.js';

export const createProgressRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();
  const auth = createProtectedAuthChain(authMiddleware);

  let queueResources: { queue: Queue; events: QueueEvents } | null = null;
  const getQueueResources = async () => {
    if (!queueResources) {
      const { extractionQueue } = await import('../queues/extraction.queue.js');
      queueResources = {
        queue: extractionQueue,
        events: createQueueEvents(extractionQueue.name),
      };
    }
    return queueResources;
  };

  router.get('/:jobId/progress', auth, async (req: Request, res: Response) => {
    const jobId = req.params.jobId as string;
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.flushHeaders(); // Establish SSE connection immediately

    const sendEvent = (type: string, data: any) => {
      if (!res.writableEnded) {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      const { queue, events: queueEvents } = await getQueueResources();
      const job = await Job.fromId(queue, jobId);
      if (!job) {
        sendEvent('error', { message: 'Job not found' });
        return res.end();
      }

      if (!req.localUser?.id || job.data?.userId !== req.localUser.id) {
        sendEvent('error', { message: 'Job not found' });
        return res.end();
      }

      // Check if job is already completed/failed before we attach listeners
      const isCompleted = await job.isCompleted();
      if (isCompleted) {
        sendEvent('completed', { result: job.returnvalue });
        return res.end();
      }
      
      const isFailed = await job.isFailed();
      if (isFailed) {
        sendEvent('failed', { error: job.failedReason });
        return res.end();
      }

      // Send initial progress if any
      sendEvent('progress', job.progress || {});

      // Event Listeners for this specific job
      const onProgress = ({ jobId: id, data }: { jobId: string; data: any }) => {
        if (id === jobId) sendEvent('progress', data);
      };

      const onCompleted = ({ jobId: id, returnvalue }: { jobId: string; returnvalue: any }) => {
        if (id === jobId) {
          sendEvent('completed', { result: returnvalue });
          cleanup();
        }
      };

      const onFailed = ({ jobId: id, failedReason }: { jobId: string; failedReason: string }) => {
        if (id === jobId) {
          sendEvent('failed', { error: failedReason });
          cleanup();
        }
      };

      queueEvents.on('progress', onProgress);
      queueEvents.on('completed', onCompleted);
      queueEvents.on('failed', onFailed);

      const cleanup = () => {
        queueEvents.off('progress', onProgress);
        queueEvents.off('completed', onCompleted);
        queueEvents.off('failed', onFailed);
        if (!res.writableEnded) res.end();
      };

      // Heartbeat to prevent proxy timeouts
      const heartbeat = setInterval(() => {
        if (!res.writableEnded) {
          res.write(':\n\n'); // SSE comment heartbeat
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(heartbeat);
        cleanup();
        logger.debug(`SSE client disconnected for job ${jobId}`);
      });

    } catch (err: any) {
      logger.error({ err, jobId }, 'SSE setup error');
      sendEvent('error', { message: 'Internal server error' });
      res.end();
    }
  });

  return router;
};
