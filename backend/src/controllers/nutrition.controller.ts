import { Request, Response } from 'express';
import { NutritionService } from '../services/nutrition.service.js';

export const analyzeFood = async (req: Request, res: Response) => {
  try {
    // Assuming auth middleware sets req.user
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { foodQuery } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. User ID missing.' });
    }

    if (!foodQuery) {
      return res.status(400).json({ error: 'Please provide a foodQuery to analyze.' });
    }

    const analysis = await NutritionService.analyzeFoodSafety(userId, foodQuery);

    return res.status(200).json({
      message: 'Nutrition analysis completed successfully.',
      data: analysis
    });
  } catch (error: any) {
    console.error('Error in analyzeFood:', error);
    return res.status(500).json({
      error: 'Failed to analyze food safety.',
      details: error.message
    });
  }
};

export const searchSuggestions = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(200).json({ data: [] });
    }

    const suggestions = await NutritionService.searchFoodSuggestions(q as string);

    return res.status(200).json({
      data: suggestions
    });
  } catch (error: any) {
    console.error('Error in searchSuggestions:', error);
    return res.status(500).json({
      error: 'Failed to fetch suggestions.',
      details: error.message
    });
  }
};
