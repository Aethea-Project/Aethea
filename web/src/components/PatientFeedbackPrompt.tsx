import React, { useEffect, useState } from 'react';
import { useAuth } from '@core/auth/useAuth';
import { Modal } from './Modal';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { medicalApi, Reservation } from '../services/medicalApi';

export default function PatientFeedbackPrompt() {
  const { session, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReservation, setPendingReservation] = useState<Reservation | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for pending feedbacks when session is ready
  useEffect(() => {
    if (!session) return;
    
    // Only patients can leave feedback
    const accountType = profile?.accountType || session?.user?.user_metadata?.accountType;
    if (accountType && accountType !== 'patient') return;

    async function checkPendingFeedback() {
      try {
        const res = await medicalApi.fetchPendingFeedback();
        if (res.pending && res.reservation) {
          setPendingReservation(res.reservation);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to check pending feedback:', err);
      }
    }

    // Delay checking slightly so it doesn't interrupt page load instantly
    const timer = setTimeout(() => {
      void checkPendingFeedback();
    }, 2500);

    return () => clearTimeout(timer);
  }, [session, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingReservation) return;

    try {
      setSubmitting(true);
      setError(null);
      await medicalApi.submitFeedback({
        reservationId: pendingReservation.id,
        rating,
        comments: comments.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setPendingReservation(null);
        // Reset states
        setSuccess(false);
        setRating(5);
        setComments('');
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Under HIPAA/K-anonymity protocol, patients are encouraged to fill reviews.
    // However, they can dismiss the prompt if needed.
    setIsOpen(false);
  };

  if (!isOpen || !pendingReservation) return null;

  const doc = pendingReservation.doctor;
  const docName = doc ? `Dr. ${doc.firstName} ${doc.lastName}` : 'your Doctor';
  const specialty = doc?.specialty ? `${doc.specialty}` : 'Clinician';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel="Review Your Visit">
      <div className="p-6">
        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sand-50 border border-sand-200">
              <svg className="h-6 w-6 text-sand-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-serif text-xl font-normal text-sand-900">Thank you!</h3>
            <p className="text-sm text-sand-600 font-medium">
              Your anonymous feedback helps us maintain absolute quality in clinical care.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <span className="text-[10px] font-bold text-sand-900 uppercase tracking-widest block mb-1">
                Post-Consultation Survey
              </span>
              <h3 className="font-serif text-2xl font-normal text-sand-900 tracking-tight">
                Review Your Visit
              </h3>
              <p className="mt-2 text-xs text-sand-600 leading-relaxed font-medium">
                You recently completed a consultation with <strong className="text-sand-900">{docName}</strong> ({specialty}). 
                To preserve patient privacy, feedback comments are processed using a K-Anonymity protocol ($k \ge 3$) and completely decoupled from your profile identity before being visible to the doctor.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-sand-500 uppercase tracking-widest">
                Overall Rating
              </Label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <svg
                      className={`h-8 w-8 ${
                        star <= rating ? 'text-olive-600 fill-current' : 'text-sand-300'
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499c.15-.353.64-.353.79 0l2.3 4.658 5.14.747c.39.056.545.534.263.812l-3.72 3.627 1.01 5.14c.077.393-.34.697-.69.51l-4.593-2.414-4.593 2.414c-.35.187-.768-.117-.69-.51l1.01-5.14-3.72-3.627c-.282-.278-.127-.756.263-.812l5.14-.747 2.3-4.658z"
                      />
                    </svg>
                  </button>
                ))}
                <span className="text-xs font-bold text-sand-600 ml-2">
                  {rating} / 5
                </span>
              </div>
            </div>

            {/* Comments Field */}
            <div className="space-y-2">
              <Label htmlFor="review-comments" className="text-xs font-bold text-sand-500 uppercase tracking-widest">
                Anonymous Comments (Optional)
              </Label>
              <textarea
                id="review-comments"
                rows={3}
                className="w-full rounded-lg border border-sand-200 bg-white p-3 text-sm text-sand-900 placeholder-sand-400 focus:border-olive-600 focus:outline-none focus:ring-1 focus:ring-aethea-5"
                placeholder="Share your experience anonymously..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                maxLength={1000}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 font-semibold"
                disabled={submitting}
                onClick={handleClose}
              >
                Skip review
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="h-12 flex-1 font-bold"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
