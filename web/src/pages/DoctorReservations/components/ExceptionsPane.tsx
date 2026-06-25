import React from 'react';
import type { ScheduleException } from '../../../services/medicalApi';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';

interface ExceptionsPaneProps {
  exceptionsError: string | null;
  exceptionSaveError: string | null;
  exceptionDate: string;
  setExceptionDate: (val: string) => void;
  exceptionReason: string;
  setExceptionReason: (val: string) => void;
  exceptionSaving: boolean;
  onAddException: () => void;
  exceptionsLoading: boolean;
  exceptions: ScheduleException[];
  onRemoveException: (id: string) => void;
}

export const ExceptionsPane = React.memo(function ExceptionsPane({
  exceptionsError,
  exceptionSaveError,
  exceptionDate,
  setExceptionDate,
  exceptionReason,
  setExceptionReason,
  exceptionSaving,
  onAddException,
  exceptionsLoading,
  exceptions,
  onRemoveException,
}: ExceptionsPaneProps) {
  return (
    <div className="space-y-6">
      {exceptionsError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{exceptionsError}</p>}
      {exceptionSaveError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{exceptionSaveError}</p>}

      <Card className="border-transparent p-6">
        <h3 className="font-serif text-xl font-medium text-sand-900 mb-3">Schedule Time Off Exception</h3>
        <p className="text-sm text-sand-500 mb-4">
          Block a single specific date (for sickness, holiday, etc.). Existing schedule entries on this date will be permanently deleted and patients will be automatically notified of the cancellation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Label>Date</Label>
            <Input
              type="date"
              value={exceptionDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setExceptionDate(e.target.value)}
            />
          </div>
          <div className="flex-[2] w-full">
            <Label>Reason (Optional)</Label>
            <Input
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="e.g. Clinic maintenance, out of town"
            />
          </div>
          <Button
            variant="primary"
            onClick={onAddException}
            disabled={exceptionSaving || !exceptionDate}
            className="h-12 w-full sm:w-auto"
          >
            {exceptionSaving ? 'Saving...' : 'Add Time Off'}
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="font-serif text-lg font-medium text-sand-900 mb-3">Upcoming Exceptions</h3>
        {exceptionsLoading ? (
          <p className="text-sm text-sand-500">Loading exceptions...</p>
        ) : exceptions.length === 0 ? (
          <p className="text-sm text-sand-400 bg-surface-card p-4 rounded-lg border border-sand-200 text-center font-medium">No upcoming blocked dates scheduled.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {exceptions.map((exc) => (
              <div key={exc.id} className="flex justify-between items-center p-4 border border-sand-200 rounded-lg bg-surface-card">
                <div>
                  <div className="font-medium text-sand-900 text-sm">
                    {new Date(exc.exceptionDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-sm text-sand-500">
                    {exc.reason || 'Unavailable'}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={() => onRemoveException(exc.id)}
                  className="font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
