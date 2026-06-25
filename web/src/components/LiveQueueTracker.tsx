import React, { useMemo } from 'react';
import { useLiveQueue } from '../hooks/useLiveQueue';
import { cn } from '../lib/utils';
import { Card, CardContent } from './ui/Card';

interface LiveQueueTrackerProps {
  scheduleId: string;
}

export function LiveQueueTracker({ scheduleId }: LiveQueueTrackerProps) {
  const { queue, loading, error } = useLiveQueue(scheduleId);

  const stats = useMemo(() => {
    if (!queue) return null;
    
    const yourSlot = queue.slots.find(s => s.isYou);
    const inProgressSlot = queue.slots.find(s => s.status === 'in_progress');
    
    let patientsAhead = 0;
    if (yourSlot) {
      patientsAhead = queue.slots.filter(
        s => s.slotIndex < yourSlot.slotIndex && 
        (s.status === 'scheduled' || s.status === 'confirmed' || s.status === 'in_progress')
      ).length;
    }

    return { yourSlot, inProgressSlot, patientsAhead };
  }, [queue]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6 bg-surface-card rounded-lg border border-sand-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sand-200 border-t-nescafe" />
        <span className="ml-3 text-sm text-sand-500 font-medium">Connecting to live queue...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-sm">
        {error}
      </div>
    );
  }

  if (!queue || !stats?.yourSlot) {
    return null;
  }

  const { yourSlot, inProgressSlot, patientsAhead } = stats;
  const isYourTurn = inProgressSlot?.slotIndex === yourSlot.slotIndex;
  const isCompleted = ['completed', 'cancelled', 'no_show'].includes(yourSlot.status);

  return (
    <Card className="border-nescafe/30 bg-surface shadow-sm overflow-hidden mt-4 relative">
      <div className="absolute top-0 left-0 w-1 h-full bg-nescafe" />
      <CardContent className="p-5 space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-sand-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {(!isCompleted && !isYourTurn) && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nescafe opacity-50"></span>}
                <span className={cn("relative inline-flex rounded-full h-3 w-3", isCompleted ? "bg-sand-400" : "bg-nescafe")}></span>
              </span>
              Live Queue Tracker
            </h3>
            <p className="text-xs text-sand-500 mt-1 font-medium">Auto-updating securely from the clinic</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-nescafe">#{yourSlot.slotIndex + 1}</div>
            <div className="text-xs font-bold text-sand-400 uppercase tracking-widest">Your Turn</div>
          </div>
        </div>

        {!isCompleted && (
          <div className="bg-sand-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-sand-200">
            <div>
              <p className="text-xs text-sand-500 font-medium uppercase tracking-widest mb-1">Queue Status</p>
              {isYourTurn ? (
                <p className="text-sm font-bold text-emerald-700">The doctor is seeing you now!</p>
              ) : inProgressSlot ? (
                <p className="text-sm font-semibold text-sand-900">
                  Doctor is currently seeing: <span className="text-nescafe">Turn #{inProgressSlot.slotIndex + 1}</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-sand-700">Doctor has not started the next session yet.</p>
              )}
            </div>
            
            {!isYourTurn && (
              <div className="sm:text-right">
                <p className="text-xs text-sand-500 font-medium uppercase tracking-widest mb-1">Estimated Wait</p>
                <p className="text-sm font-bold text-sand-900">
                  {patientsAhead === 0 ? "You are next!" : `${patientsAhead} patient${patientsAhead !== 1 ? 's' : ''} ahead`}
                </p>
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="bg-sand-50 rounded-lg p-4 border border-sand-200">
            <p className="text-sm font-semibold text-sand-700">Your appointment has concluded.</p>
          </div>
        )}

        {/* Visual Timeline (Compact) */}
        <div className="pt-2">
          <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest mb-3">Sequence Map</p>
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {queue.slots.map((slot) => {
              const isMe = slot.isYou;
              const isCurrent = slot.status === 'in_progress';
              const isPast = ['completed', 'cancelled', 'no_show'].includes(slot.status);
              const isWaiting = ['scheduled', 'confirmed'].includes(slot.status);
              
              return (
                <div 
                  key={slot.slotIndex}
                  className={cn(
                    "shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold snap-center border",
                    isCurrent ? "bg-nescafe text-white border-nescafe ring-2 ring-nescafe/30 ring-offset-1" :
                    isPast ? "bg-sand-100 text-sand-400 border-sand-200" :
                    isMe ? "bg-sand-900 text-white border-sand-900" :
                    isWaiting ? "bg-white text-sand-700 border-sand-200" :
                    "bg-white/50 text-sand-300 border-sand-100 border-dashed"
                  )}
                  title={`Slot ${slot.slotIndex + 1} - ${slot.status}`}
                >
                  {isPast && !isMe ? '✓' : slot.slotIndex + 1}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
