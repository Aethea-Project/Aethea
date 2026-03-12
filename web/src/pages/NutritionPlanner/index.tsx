import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Nutrition & Diet Planner
 * Personalized meal plans based on medical results (Coming Soon)
 */

export default function NutritionPlannerPage() {
  return (
    <div className="nutrition-planner-page">
      <FeatureHeader
        title="Nutrition Planner"
        subtitle="Personalized meal plans based on your health profile"
        variant="food"
        imageSrc={imageAssets.headers.nutrition}
        imageAlt="Healthy meal planning"
      />
      <div className="coming-soon-card">
        <div className="coming-soon-icon">🥗</div>
        <h2>Smart Nutrition Plans — Coming Soon</h2>
        <p>
          Receive a personalized weekly meal plan built around your medical results,
          dietary restrictions, and calorie targets set by your care team.
        </p>
        <ul className="coming-soon-features">
          <li>🩺 Plans tailored to your diagnosis</li>
          <li>📊 Daily macro and calorie tracking</li>
          <li>🛒 Automatic shopping list generation</li>
          <li>🔄 Weekly plan regeneration</li>
        </ul>
      </div>
    </div>
  );
}
