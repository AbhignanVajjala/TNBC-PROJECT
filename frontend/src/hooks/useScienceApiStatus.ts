import { useEffect, useState } from 'react';
import { checkExoRankBackend } from '../services/api';

export type ScienceApiStatus = 'connecting' | 'available' | 'temporary-unavailable' | 'unavailable';

/** A failed probe triggers recovery checks before the service is marked unavailable. */
export function useScienceApiStatus(): ScienceApiStatus {
  const [status, setStatus] = useState<ScienceApiStatus>('connecting');

  useEffect(() => {
    const controller = new AbortController();
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;

    const probe = async () => {
      const result = await checkExoRankBackend(controller.signal);
      if (controller.signal.aborted) return;

      if (result.connected) {
        failures = 0;
        setStatus('available');
      } else {
        failures += 1;
        setStatus(failures < 3 ? 'temporary-unavailable' : 'unavailable');
      }

      // Schedule from completion to keep slow checks from overlapping.
      const delay = failures === 1 ? 5000 : failures === 2 ? 15000 : 60000;
      timer = setTimeout(probe, delay);
    };

    void probe();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  return status;
}
