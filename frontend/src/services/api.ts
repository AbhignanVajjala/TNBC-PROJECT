import { readPdbResponse } from '../lib/pdb';
export interface BackendHealthResponse {
  status: string;
  service?: string;
  uptime?: number;
  timestamp?: string;
  environment?: string;
  geminiConfigured?: boolean;
  endpoints?: string[];
}

export interface AiMechanisticInsightsRequest {
  receptorId: string;
  receptorName?: string;
  receptorUniprot?: string;
  ligandId: string;
  ligandName?: string;
  ligandUniprot?: string;
  bindingAffinity?: string;
  interfaceArea?: string;
  compositeScore?: number;
  stericClashScore?: string;
}

export interface AiMechanisticInsightsResponse {
  executiveSummary: string;
  bindingInterfaceAnalysis: string[];
  vesiclePresentation: string;
  potentialLiabilities: string[];
  engineeringRecommendations: string[];
  modelUsed: string;
  timestamp: string;
  isAiGenerated: boolean;
}

/**
 * Check connectivity and status of the Express backend server
 */
export async function checkBackendHealth(): Promise<BackendHealthResponse | null> {
  try {
    const res = await fetch('/api/health', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend /api/health check offline or unreachable:', err);
    return null;
  }
}

/**
 * Request dynamic AI or biophysical mechanistic synthesis from the backend
 */
export async function fetchAiMechanisticInsights(
  params: AiMechanisticInsightsRequest
): Promise<AiMechanisticInsightsResponse> {
  const res = await fetch('/api/ai/mechanistic-insights', {
    method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(params), signal:AbortSignal.timeout(25000)
  });
  if (!res.ok) throw new Error(res.status === 503 ? 'AI analysis unavailable. The service is not configured.' : res.status === 429 ? 'AI request limit reached. Try again later.' : 'AI analysis unavailable. Please try again later.');
  return await res.json();
}

/**
 * Request server-side formatted validation dossier
 */
export async function exportDossierApi(params: {
  receptorId: string;
  ligandId: string;
  customNotes?: string;
}): Promise<any> {
  const res = await fetch('/api/export-dossier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to generate export dossier');
  return await res.json();
}

// ============================================================================
// EXO-RANK scientific backend (FastAPI) â€” accessed via the same-origin Express
// proxy (/api/exorank/*). Frontend receptor.no === backend Target No.; the EV
// ligand key (uppercased) === backend candidate protein. So the interaction id
// is  T{receptorNo}_{LIGAND}  (e.g. T1_ANXA2).
// ============================================================================

export interface ExoRankInteraction {
  interaction_id: string;
  target_no: number;
  receptor: string;
  candidate_protein: string;
  group: string;
  structure: { pdb_available: boolean; model_type: string | null; structure_source: string | null; pdb_file?: string | null; pdb_download_url: string | null };
  alphafold: { ipTM: number | null; pTM: number | null; mean_pLDDT: number | null; median_PAE: number | null; interface_PAE: number | null; PAE_range: string | null; AFS: number | null };
  prodigy: {
    available: boolean;
    PS: number | null;
    Kd: number | null;
    delta_G: number | null;
    intermolecular_contacts: number | null;
    contacts: {
      charged_charged: number | null; charged_polar: number | null; charged_apolar: number | null;
      polar_polar: number | null; apolar_polar: number | null; apolar_apolar: number | null;
    };
    NIS: { charged: number | null; apolar: number | null };
  };
  string: { has_evidence: boolean; SS: number | null; combined_score: number | null };
  biology: { BS: string | null; localization: string | null; surface_feasibility: string | null; uniprot_id?: string | null; reason?: string | null };
  final: { TPS: number | null; coverage: string | null; rank: number | null; preferred: boolean; exclusion_reason: string | null };
  provenance: Record<string, unknown>;
}

/** Build the backend interaction id from a frontend receptor number + EV ligand key. */
export function buildInteractionId(receptorNo: number, ligandKey: string): string {
  return `T${receptorNo}_${ligandKey.toUpperCase()}`;
}

/** Same-origin URL a molecular viewer can load the real PDB from. */
export function getStructurePdbUrl(interactionId: string): string {
  return `/api/exorank/structure/${encodeURIComponent(interactionId)}`;
}

export function isInteractionResponse(value: any, interactionId: string): value is ExoRankInteraction {
  const match = /^T(\d+)_([A-Z0-9]+)$/.exec(interactionId);
  if (!match || value?.interaction_id !== interactionId || value.target_no !== Number(match[1]) || value.candidate_protein !== match[2] || typeof value.receptor !== 'string') return false;
  for (const key of ['structure','alphafold','prodigy','string','biology','final','provenance']) {
    if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) return false;
  }
  if (typeof value.structure.pdb_available !== 'boolean' || !value.prodigy.contacts || !value.prodigy.NIS) return false;
  for (const [block, keys] of [
    ['alphafold',['ipTM','pTM','mean_pLDDT','interface_PAE','AFS']],
    ['prodigy',['PS','delta_G','Kd','intermolecular_contacts']],
    ['string',['SS','combined_score']], ['final',['TPS','rank']],
  ] as const) {
    if (keys.some(key => value[block][key] !== null && !Number.isFinite(value[block][key]))) return false;
  }
  return true;
}

/** Fetch the full real interaction record (scores + evidence + structure meta). Null if unavailable. */
export async function fetchExoRankInteraction(interactionId: string, signal?: AbortSignal): Promise<ExoRankInteraction | null> {
  try {
    const res = await fetch(`/api/exorank/interaction/${encodeURIComponent(interactionId)}`, {
      headers: { Accept: 'application/json' }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!isInteractionResponse(data, interactionId)) throw new Error('Invalid scientific metadata or interaction identity mismatch');
    return data;
  } catch (err) {
    if(!signal?.aborted) console.warn('EXO-RANK backend interaction fetch failed:', err);
    return null;
  }
}

/** Fetch the raw PDB text for the pair (for 3Dmol addModel). Rejects missing/invalid responses. */
export async function fetchExoRankStructure(interactionId: string, signal?:AbortSignal): Promise<string> {
  const response = await fetch(getStructurePdbUrl(interactionId), {
    headers:{Accept:'chemical/x-pdb'},
    signal:signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)
  });
  return readPdbResponse(response);
}

/** Check whether the scientific backend is reachable through the proxy. */
export async function checkExoRankBackend(): Promise<{ connected: boolean; backend?: any } | null> {
  try {
    const res = await fetch('/api/exorank/health', { signal: AbortSignal.timeout(4500) });
    const data = await res.json();
    return {connected:res.ok && data.connected === true, backend:data.backend};
  } catch {
    return { connected: false };
  }
}
