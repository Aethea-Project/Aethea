import { FeatureHeader } from '../../components/FeatureHeader';
import { useAuth } from '@core/auth/useAuth';

export default function DashboardPage() {
  const { session } = useAuth();
  const user = session?.user;

  return (
    <div className="max-w-5xl mx-auto p-10 space-y-12">
      <FeatureHeader title="Dashboard" />
      
      <div className="mt-12 flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 bg-olive-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-olive-100">
          <svg className="w-10 h-10 text-olive-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-serif font-medium text-sand-900 mb-4 tracking-tight">
          Welcome back, {(user as unknown as Record<string, unknown>)?.firstName as string || 'Patient'}
        </h2>
        <p className="text-lg text-sand-600 max-w-lg leading-relaxed">
          Your dashboard canvas is clear. We've moved your medical and lab metrics into their respective features for a cleaner, more focused experience.
        </p>
      </div>
    </div>
  );
}
