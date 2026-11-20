import { getLigand, getPairEvidence, RECEPTOR_DATASET } from '../data/dataset';
import { ExoRankInteraction } from '../services/api';
import { StructureData } from './pdb';
export function formatMetric(value:number | null | undefined, digits=2): string {
  return value == null || !Number.isFinite(value) ? 'Not calculated' : (value !== 0 && Math.abs(value) < 0.01 ? value.toExponential(2) : value.toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:digits}));
}
export function metricDelta(a:number|null,b:number|null,digits=2) {
  return a == null || b == null ? 'Not calculated' : `${a-b > 0 ? '+' : ''}${formatMetric(a-b,digits)}`;
}
export function profile(receptor:typeof RECEPTOR_DATASET[number], evKey:string, live?:ExoRankInteraction|null, structure?:StructureData|null) {
  const uploaded = structure?.source === 'upload';
  const data = uploaded ? null : live || getPairEvidence(receptor.id,evKey);
  const ev = getLigand(evKey);
  const unknown = 'Not calculated';
  const protein = (key:string,name:string,uniprot:string,topology:string) => ({key,name,gene:key,uniprot,domain:topology,topology,length:null as number|null,mass:'Metadata unavailable',contacts:[] as number[],contactLabels:unknown,sequence:''});
  const summary = uploaded ? 'User-uploaded coordinates. Protein identity, chain roles, binding geometry and scientific metrics have not been validated or calculated for this file.' : data ? `Repository evidence: ${data.interaction_id}. Computational prioritization for experimental validation; predicted structure and energetics do not prove binding. Coverage ${data.final.coverage || 'unavailable'}; EV feasibility ${data.biology.BS || 'unavailable'}.` : 'Scientific evidence unavailable for this pair. No scores or binding geometry have been inferred.';
  return {
    pairKey:`T${receptor.no}_${evKey}`, receptorString:`${receptor.target} (${receptor.uniprot})`, evKey,
    target:protein(receptor.target,receptor.target,receptor.uniprot,receptor.deep.topology),
    evProtein:protein(evKey,ev.name,ev.uniprot,ev.deep.scaffoldType),
    structureType:uploaded ? 'USER-UPLOADED COORDINATES' : data?.structure.model_type || 'STRUCTURE UNAVAILABLE',
    dockingEngine:uploaded ? 'User-uploaded PDB' : data?.structure.structure_source || 'Model metadata unavailable',
    pdbId:structure?.filename || data?.structure.pdb_file || 'Structure unavailable',
    atomCountText:structure ? `${structure.parsed.atomCount.toLocaleString()} atoms | ${structure.parsed.chains.length} chains (${structure.parsed.chains.map(c=>c.trim()||'blank').join(', ')})` : 'No coordinates parsed',
    rank:data?.final.rank ?? null, rankTotal:200,
    tier:uploaded ? 'Not calculated' : data ? (data.final.preferred ? 'Prioritized for validation' : 'Outside preferred shortlist') : unknown,
    score:data?.final.TPS ?? null, ipTM:data?.alphafold.ipTM ?? null, pDockQ2:null,
    deltaG:data?.prodigy.delta_G ?? null, kd:data?.prodigy.Kd == null ? null : data.prodigy.Kd * 1e9,
    affinityScore:data?.prodigy.PS ?? null, literature:data?.string.SS ?? null,
    bioCompat:null, biology:data?.biology.BS || unknown,
    interfaceArea:null, contactResidueCount:unknown, hbonds:unknown, saltBridges:unknown,
    summary, interpretation:summary, primerText:summary,
    strengths:[{title:uploaded ? 'Uploaded coordinates' : 'Evidence provenance',desc:summary}],
    caveats:[{title:'Experimental validation required',desc:data?.biology.reason || 'Coordinates alone do not establish binding, membrane orientation or biological identity.'}],
    milestone:'Validate receptor binding and EV surface presentation experimentally before drawing biological conclusions.',
  };
}
