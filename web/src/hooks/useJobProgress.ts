import { useState, useEffect } from 'react';
import { supabase } from '../services/auth';
import { resolveApiBaseUrl } from '../lib/apiClient';

interface JobProgressState {
  status: 'idle' | 'starting' | 'downloaded' | 'analyzing' | 'extracting' | 'saving' | 'completed' | 'failed';
  token?: string;
  error?: string;
  result?: any;
}

export function useJobProgress(jobId: string | null) {
  const [state, setState] = useState<JobProgressState>({ status: 'idle' });

  useEffect(() => {
    if (!jobId) {
      setState({ status: 'idle' });
      return;
    }

    let eventSource: EventSource | null = null;
    let isSubscribed = true;

    const connect = async () => {
      try {
        // To use SSE with authentication, we need to pass the access token.
        // EventSource doesn't natively support headers, so we append it as a query param.
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (!token) throw new Error('Not authenticated');

        const apiUrl = resolveApiBaseUrl();
        const sseUrl = `${apiUrl}/v1/jobs/${jobId}/progress?token=${encodeURIComponent(token)}`;

        if (!isSubscribed) return;

        eventSource = new EventSource(sseUrl, {
          withCredentials: true,
        });

        eventSource.addEventListener('progress', (e) => {
          const data = JSON.parse(e.data);
          setState((prev) => ({
            ...prev,
            status: data.status || prev.status,
            token: data.token || prev.token,
          }));
        });

        eventSource.addEventListener('completed', (e) => {
          const data = JSON.parse(e.data);
          setState({ status: 'completed', result: data.result });
          eventSource?.close();
        });

        eventSource.addEventListener('failed', (e) => {
          const data = JSON.parse(e.data);
          setState({ status: 'failed', error: data.error });
          eventSource?.close();
        });

        eventSource.addEventListener('error', () => {
          // EventSource error doesn't give much detail, just close it
          setState({ status: 'failed', error: 'Connection to server lost' });
          eventSource?.close();
        });

      } catch (err: any) {
        if (isSubscribed) {
          setState({ status: 'failed', error: err.message });
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
  }, [jobId]);

  return state;
}
