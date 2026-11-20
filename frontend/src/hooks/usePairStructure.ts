import { useEffect, useState } from 'react';
import { fetchExoRankStructure } from '../services/api';
import { parsePdb, selectStructure, StructureData } from '../lib/pdb';

export function usePairStructure(pairId: string, upload?: StructureData) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{pairId: string; structure?: StructureData; status: 'loading'|'unavailable'|'failed'|'loaded'; error?: string}>({pairId, status:'loading'});
  useEffect(() => {
    const controller = new AbortController();
    if (upload?.pairId === pairId) return () => controller.abort();
    setResult({pairId, status:'loading'});
    fetchExoRankStructure(pairId, controller.signal).then(pdb => {
      if (!controller.signal.aborted) setResult({pairId, status:'loaded', structure:{pairId, pdb, parsed:parsePdb(pdb), source:'backend'}});
    }).catch(error => {
      if (!controller.signal.aborted) setResult({pairId, status:error.message === 'Structure unavailable' ? 'unavailable' : 'failed', error:error.message});
    });
    return () => controller.abort();
  }, [pairId, upload, attempt]);
  const active = result.pairId === pairId ? result : {pairId, status:'loading' as const};
  const structure = selectStructure(pairId, upload, active.structure);
  return {structure, status:structure ? 'loaded' as const : active.status, error:structure ? undefined : active.error, retry:()=>setAttempt(value=>value+1)};
}
