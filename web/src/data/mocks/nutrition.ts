/**
 * Mock nutrition/meal plan data for NutritionPlanner page
 * Will be replaced by API calls when the backend endpoints are ready.
 */

export interface MealPlan {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: Meal[];
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string;
  image: string;
}

export interface PatientNutritionProfile {
  condition: string;
  targetCalories: number;
  restrictions: string[];
  goals: string[];
}

/** Default patient profile based on lab results */
export const defaultPatientProfile: PatientNutritionProfile = {
  condition: 'Pre-diabetic',
  targetCalories: 1800,
  restrictions: ['Low sugar', 'Low sodium'],
  goals: ['Weight loss', 'Blood sugar control'],
};

export const mockMealPlans: MealPlan[] = [
  {
    id: 'plan-001',
    name: 'Diabetes-Friendly Mediterranean',
    calories: 1800,
    protein: 90,
    carbs: 180,
    fats: 60,
    meals: [
      {
        id: 'meal-001',
        type: 'breakfast',
        name: 'Greek Yogurt with Berries & Nuts',
        calories: 350,
        protein: 20,
        carbs: 35,
        fats: 12,
        ingredients: [
          '1 cup low-fat Greek yogurt',
          '1/2 cup mixed berries',
          '2 tbsp almonds',
          '1 tsp honey',
        ],
        instructions:
          'Layer Greek yogurt in a bowl. Top with fresh berries, chopped almonds, and drizzle honey.',
        image: '🥣',
      },
      {
        id: 'meal-002',
        type: 'lunch',
        name: 'Grilled Chicken Salad',
        calories: 450,
        protein: 35,
        carbs: 30,
        fats: 18,
        ingredients: [
          '150g grilled chicken breast',
          '2 cups mixed greens',
          '1/2 avocado',
          'Cherry tomatoes',
          'Olive oil vinaigrette',
        ],
        instructions:
          'Slice grilled chicken over mixed greens. Add avocado slices, cherry tomatoes. Dress with olive oil vinaigrette.',
        image: '🥗',
      },
      {
        id: 'meal-003',
        type: 'snack',
        name: 'Hummus with Veggie Sticks',
        calories: 200,
        protein: 8,
        carbs: 20,
        fats: 10,
        ingredients: ['1/4 cup hummus', 'Carrot sticks', 'Cucumber slices', 'Bell pepper strips'],
        instructions: 'Arrange fresh vegetable sticks on a plate with hummus for dipping.',
        image: '🥕',
      },
      {
        id: 'meal-004',
        type: 'dinner',
        name: 'Baked Salmon with Quinoa',
        calories: 500,
        protein: 40,
        carbs: 45,
        fats: 18,
        ingredients: [
          '150g salmon fillet',
          '1 cup cooked quinoa',
          'Roasted vegetables',
          'Lemon',
          'Herbs',
        ],
        instructions:
          'Bake salmon with lemon and herbs at 200°C for 15 minutes. Serve with quinoa and roasted vegetables.',
        image: '🐟',
      },
      {
        id: 'meal-005',
        type: 'snack',
        name: 'Apple with Almond Butter',
        calories: 180,
        protein: 4,
        carbs: 25,
        fats: 8,
        ingredients: ['1 medium apple', '1 tbsp almond butter'],
        instructions: 'Slice apple and serve with almond butter for dipping.',
        image: '🍎',
      },
    ],
  },
];
