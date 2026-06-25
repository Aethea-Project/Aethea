import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { handleUserQuestion } from '../services/researchIngestion.service.js';
import logger from '../lib/logger.js';

export const getResearchArticles = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    const whereClause = category && category !== 'all' 
      ? { category: String(category) } 
      : {};

    const articles = await prisma.researchArticle.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: 20
    });

    res.json({ success: true, data: articles });
  } catch (err: any) {
    logger.error('Failed to get research articles', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const askResearchQuestion = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const articles = await handleUserQuestion(query);
    
    if (articles.length === 0) {
      return res.status(404).json({ success: false, error: 'No scientific literature found for this specific query. Please try rephrasing.' });
    }
    
    res.json({ success: true, message: `Processed ${articles.length} new insights.`, data: articles });
  } catch (err: any) {
    logger.error('Failed to ask research question', err);
    if (err.message?.includes('INVALID_QUERY')) {
       return res.status(400).json({ success: false, error: err.message.replace('INVALID_QUERY: ', '') });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const chatWithPaperController = async (req: Request, res: Response) => {
  try {
    const { documentId, message, history = [] } = req.body;
    if (!documentId || !message) {
      return res.status(400).json({ success: false, error: 'documentId and message are required' });
    }

    // Dynamic import to avoid circular dependency issues and directly call the service
    const { chatWithPaper } = await import('../services/researchIngestion.service.js');
    const answer = await chatWithPaper(documentId, message, history);
    
    res.json({ success: true, answer });
  } catch (err: any) {
    logger.error('Failed to chat with paper', err);
    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ success: false, error: 'Gemini AI API quota exceeded. Please wait a few seconds and try again.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
