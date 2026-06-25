import { Router, RequestHandler } from 'express';
import { getResearchArticles, askResearchQuestion, chatWithPaperController } from '../controllers/research.controller.js';

export function createResearchRoutes(authMiddleware?: RequestHandler) {
  const router = Router();

  if (authMiddleware) {
    router.get('/articles', authMiddleware, getResearchArticles);
    router.post('/ask', authMiddleware, askResearchQuestion);
    router.post('/chat', authMiddleware, chatWithPaperController);
  } else {
    router.get('/articles', getResearchArticles);
    router.post('/ask', askResearchQuestion);
    router.post('/chat', chatWithPaperController);
  }

  return router;
}
