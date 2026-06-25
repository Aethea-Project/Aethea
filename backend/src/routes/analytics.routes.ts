import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { createProtectedAuthChain } from '../middleware/protectedAuth.js';
import { requireAccountType } from '../middleware/requireAccountType.js';

export function createAnalyticsRoutes(authMiddleware: RequestHandler): Router {
  const router = Router();
  const adminAuth = [...createProtectedAuthChain(authMiddleware), requireAccountType('admin')];

  // Population health aggregates
  router.get('/population', adminAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Deficiencies & Risks
      const vitaminDDeficiencies = await prisma.labTest.count({
        where: { testName: { contains: 'Vitamin D', mode: 'insensitive' }, status: 'low' }
      });
      
      const highCholesterol = await prisma.labTest.count({
        where: { testName: { contains: 'Cholesterol', mode: 'insensitive' }, status: 'high' }
      });

      // 2. Chronic Diseases
      const diabetesCount = await prisma.patientCondition.count({ where: { condition: 'diabetes' } });
      const kidneyDiseaseCount = await prisma.patientCondition.count({ where: { condition: 'kidney_disease' } });
      const heartDiseaseCount = await prisma.patientCondition.count({ where: { condition: 'heart_disease' } });

      // 3. Top prescribed medicines
      // Use raw SQL for group by and order due to relation grouping
      const topPrescriptions: any[] = await prisma.$queryRaw`
        SELECT m."brandNameAr", COUNT(p.id) as count
        FROM "patient_prescriptions" p
        JOIN "medicines" m ON p."medicineId" = m.id
        WHERE p."isActive" = true
        GROUP BY m."brandNameAr"
        ORDER BY count DESC
        LIMIT 5;
      `;

      res.json({
        success: true,
        data: {
          deficiencies: {
            vitaminDLow: vitaminDDeficiencies,
            cholesterolHigh: highCholesterol,
          },
          chronicDiseases: {
            diabetes: diabetesCount,
            kidney_disease: kidneyDiseaseCount,
            heart_disease: heartDiseaseCount,
          },
          topPrescriptions: topPrescriptions.map(tp => ({
            name: tp.brandNameAr,
            count: Number(tp.count)
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
