import { createQueue } from '../lib/bullmq.js';

export const extractionQueue = createQueue('clinical-extraction');
