import { Router, RequestHandler } from 'express';
import { analyzeFood, searchSuggestions } from '../controllers/nutrition.controller.js';

export function createNutritionRoutes(authMiddleware: RequestHandler) {
  const router = Router();
  
  // Apply auth middleware to protect patient data
  router.use(authMiddleware);

  router.post('/analyze', analyzeFood);
  router.get('/search', searchSuggestions);

  return router;
}
