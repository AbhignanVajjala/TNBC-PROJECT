export const MAX_PDB_BYTES = 8 * 1024 * 1024;
export const MAX_PDB_ATOMS = 60000;
export const SURFACE_ATOM_LIMIT = 12000;

export interface PdbResidue { id: string; name: string; letter: string }
export interface ParsedPdb { atomCount: number; chains: string[]; residues: Record<string, PdbResidue[]> }
export interface StructureData { pairId: string; pdb: string; parsed: ParsedPdb; source: 'backend' | 'upload'; filename?: string }
const AMINO: Record<string, string> = { ALA:'A', ARG:'R', ASN:'N', ASP:'D', CYS:'C', GLN:'Q', GLU:'E', GLY:'G', HIS:'H', ILE:'I', LEU:'L', LYS:'K', MET:'M', PHE:'F', PRO:'P', SER:'S', THR:'T', TRP:'W', TYR:'Y', VAL:'V', MSE:'M' };

/** Validate fixed-column coordinates, never accept HTML/error bodies as PDBs.
 * Display only the first MODEL, matching the viewer's default parser behavior.
 * Parsing coordinates establishes neither protein identity nor binding geometry.
 */
export function parsePdb(pdb: string): ParsedPdb {
  if (!pdb.trim()) throw new Error('The PDB file is empty.');
  if (pdb.length > MAX_PDB_BYTES || new TextEncoder().encode(pdb).length > MAX_PDB_BYTES) throw new Error('PDB files must be 8 MB or smaller.');
  const residues: ParsedPdb['residues'] = {};
  const seen = new Set<string>();
  let atomCount = 0;
  for (const line of pdb.split(/\r?\n/)) {
    if (line.startsWith('ENDMDL')) break;
    if (!/^(ATOM  |HETATM)/.test(line)) continue;
    if (line.length < 54 || ![30,38,46].every(start => {
      const value = line.slice(start, start + 8).trim();
      return /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value) && Number.isFinite(Number(value));
    })) throw new Error('Invalid PDB atom coordinates. Expected fixed-column X, Y and Z numbers.');
    if (++atomCount > MAX_PDB_ATOMS) throw new Error('This PDB exceeds the 60,000 atom browser limit.');
    const chain = line.slice(21,22);
    residues[chain] ??= [];
    if (line.startsWith('ATOM  ')) {
      const id = line.slice(22,27).trim();
      const key = chain + ':' + id;
      if (!seen.has(key)) {
        const name = line.slice(17,20).trim();
        residues[chain].push({id, name, letter: AMINO[name] || 'X'});
        seen.add(key);
      }
    }
  }
  if (!atomCount) throw new Error('No ATOM or HETATM coordinate records were found.');
  return { atomCount, chains: Object.keys(residues), residues };
}

export function selectStructure(pairId: string, upload?: StructureData, backend?: StructureData): StructureData | null {
  return upload?.pairId === pairId ? upload : backend?.pairId === pairId ? backend : null;
}

export async function readPdbResponse(response: Response): Promise<string> {
  if (!response.ok) throw new Error(response.status === 404 ? 'Structure unavailable' : `Structure request failed (HTTP ${response.status}).`);
  const type = response.headers.get('content-type') || '';
  if (!/chemical\/x-pdb|text\/plain|application\/octet-stream/.test(type)) throw new Error('The server did not return PDB content.');
  if (Number(response.headers.get('content-length')) > MAX_PDB_BYTES) throw new Error('PDB files must be 8 MB or smaller.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty structure response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PDB_BYTES) throw new Error('PDB files must be 8 MB or smaller.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const pdb = new TextDecoder().decode(bytes);
  parsePdb(pdb);
  return pdb;
}
