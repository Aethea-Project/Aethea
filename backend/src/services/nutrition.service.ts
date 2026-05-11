import prisma from '../lib/prisma.js';

export interface FoodNutrition {
  name: string;
  calories: number;
  protein: number; // in grams
  sugar: number; // in grams
  sodium: number; // in mg
  cholesterol: number; // in mg
}

export class NutritionService {
  /**
   * Mock function to simulate calling an external API (like Edamam or USDA FoodData Central)
   */
  private static async fetchFoodData(foodName: string): Promise<FoodNutrition | null> {
    try {
      const apiKey = process.env.USDA_API_KEY; // In a real app, load from process.env.USDA_API_KEY
      // Added dataType filters so it searches for raw/foundation foods instead of random branded products.
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(foodName)}&dataType=Foundation,SR%20Legacy&pageSize=1`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USDA API Error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.foods || data.foods.length === 0) {
        return null;
      }

      const food = data.foods[0];
      
      const getNutrient = (id: number): number => {
        const nutrient = food.foodNutrients?.find((n: any) => n.nutrientId === id);
        return nutrient ? nutrient.value : 0;
      };

      // USDA Nutrient IDs:
      // 1008 = Energy (kcal), 1003 = Protein (g)
      // 2000 = Sugars (g), 1093 = Sodium (mg), 1253 = Cholesterol (mg)
      return {
        name: food.description,
        calories: getNutrient(1008),
        protein: getNutrient(1003),
        sugar: getNutrient(2000),
        sodium: getNutrient(1093),
        cholesterol: getNutrient(1253),
      };
    } catch (error) {
      console.error('External API failed, returning null', error);
      return null;
    }
  }

  public static async analyzeFoodSafety(userId: string, foodQuery: string) {
    // 1. Fetch Food Nutrition Data
    const foodData = await this.fetchFoodData(foodQuery);
    if (!foodData) {
      throw new Error('Food item not found or could not be analyzed.');
    }

    // 2. Fetch User's Medical Profile & Conditions
    const profile = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { chronic_conditions: true, allergies: true }
    });

    const conditions = await prisma.patientCondition.findMany({
      where: { patientId: userId }
    });

    // 3. Fetch User's Recent Lab Tests (Abnormal/Critical/Borderline)
    const recentLabTests = await prisma.labTest.findMany({
      where: { 
        userId, 
        status: { in: ['abnormal', 'critical', 'borderline'] } 
      },
      orderBy: { measuredAt: 'desc' },
      take: 10
    });

    // 4. Rule Engine for Analysis
    const warnings: string[] = [];
    let safetyStatus: 'safe' | 'warning' | 'avoid' = 'safe';
    let healthScore = 100;

    const allConditions = [
      profile?.chronic_conditions?.toLowerCase() || '',
      ...conditions.map(c => c.condition.toLowerCase())
    ].join(' ');

    const labTestNames = recentLabTests.map(t => t.testName.toLowerCase());

    // Rule: High Sodium
    if (foodData.sodium > 400) {
      healthScore -= 15;
      if (allConditions.includes('hypertension') || allConditions.includes('blood pressure') || labTestNames.some(t => t.includes('sodium') || t.includes('creatinine'))) {
        warnings.push('⚠️ High Sodium: Not recommended due to hypertension or recent kidney/sodium lab results.');
        safetyStatus = safetyStatus === 'avoid' ? 'avoid' : 'warning';
      }
    }

    // Rule: High Sugar
    if (foodData.sugar > 10) {
      healthScore -= 15;
      if (allConditions.includes('diabetes') || labTestNames.some(t => t.includes('glucose') || t.includes('hba1c') || t.includes('sugar'))) {
        warnings.push('❌ High Sugar: Avoid this due to your diabetes conditions or recent abnormal blood sugar labs.');
        safetyStatus = 'avoid';
      }
    }

    // Rule: High Cholesterol
    if (foodData.cholesterol > 50) {
      healthScore -= 10;
      if (labTestNames.some(t => t.includes('cholesterol') || t.includes('lipid') || t.includes('triglycerides'))) {
        warnings.push('⚠️ High Cholesterol: Consider alternatives due to your recent abnormal lipid/cholesterol profile.');
        safetyStatus = safetyStatus === 'avoid' ? 'avoid' : 'warning';
      }
    }

    // Basic Health Score normalization
    healthScore = Math.max(0, healthScore);

    return {
      foodDetails: foodData,
      safetyStatus,
      warnings,
      healthScore
    };
  }

  public static async searchFoodSuggestions(query: string) {
    try {
      const apiKey = process.env.USDA_API_KEY;
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=10`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USDA API Error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.foods) {
        return [];
      }

      return data.foods.map((food: any) => {
        const energyNutrient = food.foodNutrients?.find((n: any) => n.nutrientId === 1008);
        return {
          name: food.description,
          calories: energyNutrient ? energyNutrient.value : 0
        };
      });
    } catch (error) {
      console.error('Search suggestions failed', error);
      return [];
    }
  }
}
