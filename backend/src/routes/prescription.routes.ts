import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AppError } from '../lib/AppError.js';
import { createProtectedAuthChain } from '../middleware/protectedAuth.js';
import { requireAccountType } from '../middleware/requireAccountType.js';

const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  medicineId: z.string().uuid(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

export function createPrescriptionRoutes(authMiddleware: RequestHandler): Router {
  const router = Router();
  const auth = createProtectedAuthChain(authMiddleware);
  const prescriberAuth = [...auth, requireAccountType('doctor', 'pharmacist')];

  // Create a new prescription
  router.post('/', prescriberAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createPrescriptionSchema.parse(req.body);
      const doctorId = req.localUser?.id;
      if (!doctorId) {
        throw AppError.unauthorized('No authenticated user');
      }
      
      const prescription = await prisma.patientPrescription.create({
        data: {
          patientId: data.patientId,
          medicineId: data.medicineId,
          dosage: data.dosage,
          frequency: data.frequency,
          doctorId,
        },
        include: { medicine: true }
      });

      res.status(201).json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  });

  // Get active prescriptions for a patient
  router.get('/patient/:patientId', auth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patientId = req.params.patientId as string;
      const userId = req.localUser?.id;
      const accountType = req.user?.account_type;

      if (!userId) {
        throw AppError.unauthorized('No authenticated user');
      }

      if (accountType === 'patient' && patientId !== userId) {
        throw AppError.forbidden('You are not allowed to view prescriptions for another patient');
      }

      const where =
        accountType === 'patient'
          ? { patientId: userId, isActive: true }
          : accountType === 'doctor' || accountType === 'pharmacist'
            ? { patientId, doctorId: userId, isActive: true }
            : null;

      if (!where) {
        throw AppError.forbidden('You are not allowed to view prescriptions');
      }
      
      const prescriptions = await prisma.patientPrescription.findMany({
        where,
        include: { medicine: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: prescriptions });
    } catch (error) {
      next(error);
    }
  });

  // Stop a prescription
  router.put('/:id/stop', prescriberAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const doctorId = req.localUser?.id;
      if (!doctorId) {
        throw AppError.unauthorized('No authenticated user');
      }

      const existing = await prisma.patientPrescription.findFirst({
        where: { id, doctorId },
        select: { id: true },
      });

      if (!existing) {
        throw AppError.notFound('Prescription not found');
      }
      
      const prescription = await prisma.patientPrescription.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({ success: true, data: prescription });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
