import React, { useState } from 'react';
import './styles.css';

/**
 * Aethea - Nutrition & Diet Planner
 * Personalized meal plans based on medical results
 */

interface MealPlan {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: Meal[];
}

interface Meal {
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

// Mock patient data based on lab results
const patientProfile = {
  condition: 'Pre-diabetic',
  targetCalories: 1800,
  restrictions: ['Low sugar', 'Low sodium'],
  goals: ['Weight loss', 'Blood sugar control'],
};

const mockMealPlans: MealPlan[] = [
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

export default function NutritionPlannerPage() {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const currentPlan = mockMealPlans[0];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const mealsByType = {
    breakfast: currentPlan.meals.filter((m) => m.type === 'breakfast'),
    lunch: currentPlan.meals.filter((m) => m.type === 'lunch'),
    dinner: currentPlan.meals.filter((m) => m.type === 'dinner'),
    snack: currentPlan.meals.filter((m) => m.type === 'snack'),
  };

  return (
    <div className="nutrition-planner-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1>🥗 Nutrition Planner</h1>
          <p>Personalized meal plans based on your health profile</p>
        </div>
      </div>

      {/* Health Profile Summary */}
      <div className="profile-banner">
        <div className="banner-content">
          <div className="profile-stat">
            <span className="stat-label">Condition</span>
            <span className="stat-value">{patientProfile.condition}</span>
          </div>
          <div className="profile-stat">
            <span className="stat-label">Daily Target</span>
            <span className="stat-value">{patientProfile.targetCalories} cal</span>
          </div>
          <div className="profile-stat">
            <span className="stat-label">Restrictions</span>
            <span className="stat-value">{patientProfile.restrictions.join(', ')}</span>
          </div>
          <div className="profile-stat">
            <span className="stat-label">Goals</span>
            <span className="stat-value">{patientProfile.goals.join(', ')}</span>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Sidebar */}
        <div className="sidebar">
          {/* Plan Overview */}
          <div className="plan-card">
            <h3>Your Plan</h3>
            <h2>{currentPlan.name}</h2>

            <div className="macro-summary">
              <div className="macro-item">
                <div className="macro-circle calories">
                  <span className="macro-value">{currentPlan.calories}</span>
                  <span className="macro-label">cal</span>
                </div>
                <span className="macro-name">Calories</span>
              </div>
              <div className="macro-item">
                <div className="macro-circle protein">
                  <span className="macro-value">{currentPlan.protein}g</span>
                </div>
                <span className="macro-name">Protein</span>
              </div>
              <div className="macro-item">
                <div className="macro-circle carbs">
                  <span className="macro-value">{currentPlan.carbs}g</span>
                </div>
                <span className="macro-name">Carbs</span>
              </div>
              <div className="macro-item">
                <div className="macro-circle fats">
                  <span className="macro-value">{currentPlan.fats}g</span>
                </div>
                <span className="macro-name">Fats</span>
              </div>
            </div>
          </div>

          {/* Day Selector */}
          <div className="day-selector">
            <h3>Select Day</h3>
            <div className="day-list">
              {days.map((day) => (
                <button
                  key={day}
                  className={`day-btn ${selectedDay === day ? 'active' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="day-header">
            <h2>{selectedDay}'s Meal Plan</h2>
            <button className="generate-btn">🔄 Generate New Plan</button>
          </div>

          {/* Meals by Type */}
          <div className="meals-section">
            <h3 className="meal-type-header">🌅 Breakfast</h3>
            <div className="meals-grid">
              {mealsByType.breakfast.map((meal) => (
                <div
                  key={meal.id}
                  className="meal-card"
                  onClick={() => setSelectedMeal(meal)}
                >
                  <div className="meal-image">{meal.image}</div>
                  <div className="meal-info">
                    <h4>{meal.name}</h4>
                    <div className="meal-macros">
                      <span>{meal.calories} cal</span>
                      <span>•</span>
                      <span>{meal.protein}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="meals-section">
            <h3 className="meal-type-header">☀️ Lunch</h3>
            <div className="meals-grid">
              {mealsByType.lunch.map((meal) => (
                <div
                  key={meal.id}
                  className="meal-card"
                  onClick={() => setSelectedMeal(meal)}
                >
                  <div className="meal-image">{meal.image}</div>
                  <div className="meal-info">
                    <h4>{meal.name}</h4>
                    <div className="meal-macros">
                      <span>{meal.calories} cal</span>
                      <span>•</span>
                      <span>{meal.protein}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="meals-section">
            <h3 className="meal-type-header">🍪 Snacks</h3>
            <div className="meals-grid">
              {mealsByType.snack.map((meal) => (
                <div
                  key={meal.id}
                  className="meal-card"
                  onClick={() => setSelectedMeal(meal)}
                >
                  <div className="meal-image">{meal.image}</div>
                  <div className="meal-info">
                    <h4>{meal.name}</h4>
                    <div className="meal-macros">
                      <span>{meal.calories} cal</span>
                      <span>•</span>
                      <span>{meal.protein}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="meals-section">
            <h3 className="meal-type-header">🌙 Dinner</h3>
            <div className="meals-grid">
              {mealsByType.dinner.map((meal) => (
                <div
                  key={meal.id}
                  className="meal-card"
                  onClick={() => setSelectedMeal(meal)}
                >
                  <div className="meal-image">{meal.image}</div>
                  <div className="meal-info">
                    <h4>{meal.name}</h4>
                    <div className="meal-macros">
                      <span>{meal.calories} cal</span>
                      <span>•</span>
                      <span>{meal.protein}g protein</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <div className="modal-overlay" onClick={() => setSelectedMeal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMeal.name}</h2>
              <button className="close-modal-btn" onClick={() => setSelectedMeal(null)}>
                ×
              </button>
            </div>

            <div className="meal-detail-content">
              <div className="meal-detail-image">{selectedMeal.image}</div>

              <div className="nutrition-facts">
                <h3>Nutrition Facts</h3>
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-label">Calories</span>
                    <span className="nutrition-value">{selectedMeal.calories}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Protein</span>
                    <span className="nutrition-value">{selectedMeal.protein}g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Carbs</span>
                    <span className="nutrition-value">{selectedMeal.carbs}g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Fats</span>
                    <span className="nutrition-value">{selectedMeal.fats}g</span>
                  </div>
                </div>
              </div>

              <div className="ingredients-section">
                <h3>Ingredients</h3>
                <ul>
                  {selectedMeal.ingredients.map((ingredient, idx) => (
                    <li key={idx}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              <div className="instructions-section">
                <h3>Instructions</h3>
                <p>{selectedMeal.instructions}</p>
              </div>

              <div className="meal-actions">
                <button className="action-btn primary">Add to My Plan</button>
                <button className="action-btn secondary">Find Alternatives</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
