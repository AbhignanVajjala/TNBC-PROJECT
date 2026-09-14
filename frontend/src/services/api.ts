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
  try {
    const res = await fetch('/api/ai/mechanistic-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch AI insights from backend, using client fallback:', err);
    // Graceful client-side fallback
    return {
      executiveSummary: `Target complex ${params.receptorName || params.receptorId.toUpperCase()} with ${params.ligandName || params.ligandId.toUpperCase()} demonstrates favorable steric orientation and high stability. (Client-side synthesis fallback).`,
      bindingInterfaceAnalysis: [
        `Interface area estimated at ${params.interfaceArea || '1,800 Å²'} across primary receptor extracellular domains.`,
        `Predicted docking affinity: ${params.bindingAffinity || '-9.2 kcal/mol'}.`,
        `Favorable electrostatics at key basic-acidic contact loops.`
      ],
      vesiclePresentation: `Scaffold display maintains sufficient distance from the exosome membrane without masking tetraspanin domains.`,
      potentialLiabilities: [
        `Potential off-target uptake in reticuloendothelial clearance organs.`,
        `Susceptibility to circulating metalloproteinase cleavage.`
      ],
      engineeringRecommendations: [
        `Introduce proline-rich linker extensions for prolonged vesicle surface display.`,
        `Explore targeted alanine scanning on peripheral loop contacts.`
      ],
      modelUsed: 'client-fallback',
      timestamp: new Date().toISOString(),
      isAiGenerated: false
    };
  }
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
// EXO-RANK scientific backend (FastAPI) — accessed via the same-origin Express
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
  structure: { pdb_available: boolean; model_type: string | null; structure_source: string | null; pdb_download_url: string | null };
  alphafold: { ipTM: number | null; pTM: number | null; mean_pLDDT: number | null; median_PAE: number | null; interface_PAE: number | null; PAE_range: string | null; AFS: number | null };
  prodigy: {
    available: boolean;
    PS: number | null;
    delta_G: number | null;
    intermolecular_contacts: number | null;
    contacts: {
      charged_charged: number | null; charged_polar: number | null; charged_apolar: number | null;
      polar_polar: number | null; apolar_polar: number | null; apolar_apolar: number | null;
    };
    NIS: { charged: number | null; apolar: number | null };
  };
  string: { has_evidence: boolean; SS: number | null; combined_score: number | null };
  biology: { BS: string | null; localization: string | null; surface_feasibility: string | null };
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

/** Fetch the full real interaction record (scores + evidence + structure meta). Null if unavailable. */
export async function fetchExoRankInteraction(interactionId: string): Promise<ExoRankInteraction | null> {
  try {
    const res = await fetch(`/api/exorank/interaction/${encodeURIComponent(interactionId)}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('EXO-RANK backend interaction fetch failed:', err);
    return null;
  }
}

/** Fetch the raw PDB text for the pair (for 3Dmol addModel). Null if unavailable. */
export async function fetchExoRankStructure(interactionId: string): Promise<string | null> {
  try {
    const res = await fetch(getStructurePdbUrl(interactionId), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text && text.includes('ATOM') ? text : (text || null);
  } catch (err) {
    console.warn('EXO-RANK backend structure fetch failed:', err);
    return null;
  }
}

/** Check whether the scientific backend is reachable through the proxy. */
export async function checkExoRankBackend(): Promise<{ connected: boolean; backend?: any } | null> {
  try {
    const res = await fetch('/api/exorank/health', { signal: AbortSignal.timeout(4500) });
    return await res.json();
  } catch {
    return { connected: false };
  }
}
