import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Medicine Guidance System
 * Search medicines, check safety, view contraindications (Coming Soon)
 */

export default function MedicineGuidePage() {
  return (
    <div className="medicine-guide-page">
      <FeatureHeader
        title="Medicine Guidance"
        subtitle="Search for medicines and check their safety based on your health profile"
        variant="med"
        imageSrc={imageAssets.headers.medicine}
        imageAlt="Pharmacy and medication"
      />
      <div className="coming-soon-card">
        <div className="coming-soon-icon">💊</div>
        <h2>Personalized Medicine Guide — Coming Soon</h2>
        <p>
          Search any medicine, view its active ingredients and dosage, and instantly check
          if it's safe for your specific health conditions — all in one place.
        </p>
        <ul className="coming-soon-features">
          <li>🔍 Full medicine database search</li>
          <li>⚠️ Safety checker based on your conditions</li>
          <li>💊 Dosage and side-effect details</li>
          <li>🧬 Contraindication alerts</li>
        </ul>
      </div>
    </div>
  );
}
