import { FeatureHeader } from '../../components/FeatureHeader';
import { imageAssets } from '../../constants/imageAssets';

/**
 * Aethea - Doctor Consultation Chat
 * Secure messaging and video consultation (Coming Soon)
 */

export default function DoctorChatPage() {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-10 pt-6">
      <FeatureHeader
        title="Doctor Chat"
        subtitle="Secure messaging and video consultation with your doctor"
        variant="chat"
        imageSrc={imageAssets.headers.chat}
        imageAlt="Doctor consultation"
      />
      <div className="coming-soon-card">
        <div className="coming-soon-icon">💬</div>
        <h2>Secure Consultations — Coming Soon</h2>
        <p>
          Chat directly with your assigned doctor, share files, and join video calls —
          all within Aethea's encrypted platform. This feature is under development.
        </p>
        <ul className="coming-soon-features">
          <li>🔒 End-to-end encrypted messaging</li>
          <li>📹 One-click video consultations</li>
          <li>📎 Medical file sharing</li>
          <li>📅 In-chat appointment scheduling</li>
        </ul>
      </div>
    </div>
  );
}

