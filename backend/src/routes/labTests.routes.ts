/**
 * Lab Tests Routes
 */

import { Router, RequestHandler } from 'express';
import { createLabTest, listLabTests, updateLabTest } from '../controllers/labTests.controller.js';
import { uploadLabResult, getLabFeedbacks, updateLabFeedback, deleteLabFeedback } from '../controllers/labResults.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireLocalUser } from '../lib/authMiddleware.js';
import { requireActiveAccount, requirePasswordChanged, requireTrustedClaims } from '../middleware/requireAccountType.js';
import { createLabTestSchema, updateLabTestSchema, paginationSchema } from '../schemas/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

const tmpDir = path.join(os.tmpdir(), 'aethea-uploads');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, tmpDir),
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

export const createLabTestRoutes = (authMiddleware: RequestHandler): Router => {
  const router = Router();

  // Fail fast on auth claims/status before touching Prisma.
  const auth = [authMiddleware, requireLocalUser, requireTrustedClaims, requireActiveAccount, requirePasswordChanged];

  router.get('/', auth, validateQuery(paginationSchema), asyncHandler(listLabTests));
  router.post('/', auth, validateBody(createLabTestSchema), asyncHandler(createLabTest));
  router.put('/:id', auth, validateBody(updateLabTestSchema), asyncHandler(updateLabTest));
  router.post('/upload', auth, upload.single('file'), asyncHandler(uploadLabResult));
  router.get('/feedbacks', auth, asyncHandler(getLabFeedbacks));
  router.put('/feedbacks/:id', auth, asyncHandler(updateLabFeedback));
  router.delete('/feedbacks/:id', auth, asyncHandler(deleteLabFeedback));

  return router;
};
