import { useState } from 'react';
import { FeatureHeader } from '../../components/FeatureHeader';
import { Modal } from '../../components/Modal';
import { imageAssets } from '../../constants/imageAssets';
import { mockMealPlans, defaultPatientProfile as patientProfile, type MealPlan, type Meal } from '../../data/mocks/nutrition';
import './styles.css';

/**
 * Aethea - Nutrition & Diet Planner
 * Personalized meal plans based on medical results
 */

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
      <FeatureHeader
        title="Nutrition Planner"
        subtitle="Personalized meal plans based on your health profile"
        variant="food"
        imageSrc={imageAssets.headers.nutrition}
        imageAlt="Healthy meal planning"
      />

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
      <Modal isOpen={!!selectedMeal} onClose={() => setSelectedMeal(null)} ariaLabel="Meal details">
        {selectedMeal && (
          <>
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
          </>
        )}
      </Modal>
    </div>
  );
}
