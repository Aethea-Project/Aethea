import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { medicalApi } from '../../services/medicalApi';
import { FeatureHeader } from '../../components/FeatureHeader';

interface FeedbackReview {
  id: string;
  rating: number;
  comments?: string;
  createdAt: string;
}

export default function DoctorFeedback() {
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [feedbacks, setFeedbacks] = useState<FeedbackReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        setLoading(true);
        const data = await medicalApi.fetchDoctorReviews();
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        setFeedbacks(data.feedbacks);
        setError(null);
      } catch (err) {
        console.error('Failed to load reviews:', err);
        setError('Failed to retrieve performance insights or access reviews. Clinicians must be registered.');
      } finally {
        setLoading(false);
      }
    }

    void loadReviews();
  }, []);

  const getStarRatingRepresentation = (ratingValue: number) => {
    return (
      <div className="flex gap-0.5 items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(ratingValue);
          return (
            <svg
              key={star}
              className={`h-4 w-4 ${filled ? 'text-amber-600 fill-current' : 'text-sand-200'}`}
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
          );
        })}
      </div>
    );
  };


  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      
      {/* ── Header ── */}
      <FeatureHeader title="Clinical Insights & Reviews" />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── Left Column: Metrics Summary Card ── */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-transparent">
              <CardHeader className="pb-2">
                <CardTitle>
                  Performance Index
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-24 h-24 rounded-full bg-sand-50 border border-sand-150 flex flex-col justify-center items-center">
                  <span className="text-3xl font-serif font-bold text-sand-950">
                    {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                  </span>
                  <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">
                    out of 5
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-center">
                    {getStarRatingRepresentation(averageRating)}
                  </div>
                  <p className="text-xs text-sand-500 font-medium mt-1">
                    Based on {totalReviews} patient survey{totalReviews === 1 ? '' : 's'}
                  </p>
                </div>
              </CardContent>
            </Card>


          </div>

          {/* ── Right Column: Released Anonymous Feedbacks ── */}
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-bold text-sand-500 uppercase tracking-widest block mb-2 px-1">
              Released Patient Reviews ({feedbacks.length})
            </span>

            {feedbacks.length === 0 ? (
              <Card className="border-transparent">
                <CardContent className="p-16 text-center space-y-3">
                  <svg className="mx-auto h-12 w-12 text-sand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-serif font-medium text-sand-900">No Released Reviews Yet</h3>
                  <p className="text-xs text-sand-500 max-w-sm mx-auto leading-relaxed">
                    Once at least 3 patient reviews have been compiled across closed session schedules, comments and ratings will unlock here in a fully anonymous, shuffled batch.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((review) => {
                  const reviewDate = new Date(review.createdAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <Card key={review.id} className="border-transparent hover:shadow-sm transition-colors">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {getStarRatingRepresentation(review.rating)}
                            <span className="text-xs font-bold text-sand-700 bg-sand-50 px-1.5 py-0.5 rounded-lg border border-sand-150">
                              {review.rating}.0
                            </span>
                          </div>
                          <span className="text-xs text-sand-400 font-medium">
                            {reviewDate}
                          </span>
                        </div>

                        {review.comments ? (
                          <p className="text-sm text-sand-800 leading-relaxed font-medium italic bg-sand-50/30 p-3 rounded border border-sand-100">
                            "{review.comments}"
                          </p>
                        ) : (
                          <p className="text-xs text-sand-400 italic">
                            No additional feedback comments were written.
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-sand-900 uppercase tracking-widest">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>K-Anonymity Released</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
