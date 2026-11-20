export type PerspectiveMode = 'primer' | 'deep';
export type ScreenMode = 'selector' | 'analysis';

export interface PrimerInfo {
  what: string;
  whyTNBC: string;
  mechanism: string;
}

export interface DeepInfo {
  topology: string;
  glycosylation: string;
  pathway: string;
  docking: string;
}

export interface ReceptorItem {
  id: string;
  no: number;
  target: string;
  groupA: string[];
  groupB: string[];
  uniprot: string;
  primer: PrimerInfo;
  deep: DeepInfo;
}

export interface LigandPrimerInfo {
  what: string;
  howEV: string;
  metaphor: string;
}

export interface LigandDeepInfo {
  scaffoldType: string;
  topology: string;
  exosomeDensity: string;
  docking: string;
}

export interface LigandItem {
  id: string;
  name: string;
  uniprot: string;
  primer: LigandPrimerInfo;
  deep: LigandDeepInfo;
}

export interface PairScoreData {
  score: number | null;
  tier: string;
  deltaG: number | null; // kcal/mol
  kd: number | null; // nM
  interfaceArea: number | null; // Å²
  ipTM: number | null; // 0..1
  pae: number | null; // Å
  scores: {
    structural: number | null;
    affinity: number | null;
    specificity: number | null;
    density: number | null;
    evidence: number | null;
  };
  hotspots: {
    receptorResidue: string;
    ligandResidue: string;
    interactionType: 'Salt Bridge' | 'Hydrogen Bond' | 'Hydrophobic' | 'Pi-Stacking';
    distance: string;
  }[];
}
