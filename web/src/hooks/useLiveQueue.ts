import { useState, useEffect } from 'react';
import { supabase } from '../services/auth';
import { resolveApiBaseUrl } from '../lib/apiClient';

export interface LiveQueueSlot {
  slotIndex: number;
  startAt: string;
  endAt: string;
  status: 'available' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  isYou: boolean;
}

export interface LiveQueueState {
  scheduleId: string;
  scheduleDate: string;
  startAt: string;
  endAt: string;
  slotDurationMins: number;
  slots: LiveQueueSlot[];
}

export function useLiveQueue(scheduleId: string | null) {
  const [queue, setQueue] = useState<LiveQueueState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!scheduleId) {
      setQueue(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    const connect = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (!token) throw new Error('Not authenticated');

        const apiUrl = resolveApiBaseUrl();
        const sseUrl = `${apiUrl}/v1/reservations/schedule/${scheduleId}/live-queue/stream?token=${encodeURIComponent(token)}`;

        if (!isSubscribed) return;

        eventSource = new EventSource(sseUrl, {
          withCredentials: true,
        });

        eventSource.onmessage = (e) => {
          const data = JSON.parse(e.data);
          setQueue(data);
          setLoading(false);
          setError(null);
        };

        eventSource.addEventListener('error', (e: any) => {
          try {
             const data = JSON.parse(e.data);
             if (data.message) {
               setError(data.message);
             } else {
               setError('Connection to live queue lost');
             }
          } catch {
             setError('Connection to live queue lost');
          }
          setLoading(false);
          eventSource?.close();
        });

      } catch (err: any) {
        if (isSubscribed) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    connect();

    return () => {
      isSubscribed = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [scheduleId]);

  return { queue, error, loading };
}
