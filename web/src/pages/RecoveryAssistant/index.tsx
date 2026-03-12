import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';
import './styles.css';

/**
 * Aethea - Post-Surgery Recovery Assistant
 * Exercises, videos, and AI tips for recovery (Coming Soon)
 */

export default function RecoveryAssistantPage() {
  return (
    <div className="recovery-assistant-page">
      <FeatureHeader
        title="Recovery Assistant"
        subtitle="Personalized exercises and guidance for your recovery"
        variant="rec"
        imageSrc={imageAssets.headers.recovery}
        imageAlt="Physical therapy and recovery"
      />
      <div className="coming-soon-card">
        <div className="coming-soon-icon">🏥</div>
        <h2>Post-Surgery Recovery Program — Coming Soon</h2>
        <p>
          Follow a guided day-by-day recovery program with video exercises, progress
          tracking, and care tips — all tailored to your specific surgery and recovery phase.
        </p>
        <ul className="coming-soon-features">
          <li>🏋️ Daily exercise routines with video guides</li>
          <li>📈 Progress tracking and milestones</li>
          <li>⚠️ Warning signs and when to call your doctor</li>
          <li>💡 Recovery tips from your care team</li>
        </ul>
      </div>
    </div>
  );
}
