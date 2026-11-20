import { RECEPTOR_DATASET } from '../data/dataset';
import type { ScreenMode } from '../types';
export interface Selection { receptor: string; scaffold: string; view: ScreenMode }
export function validSelection(receptor?: string, scaffold?: string, view?: string): Selection {
  const rec = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === receptor?.toLowerCase()) || RECEPTOR_DATASET[0];
  const candidate = [...rec.groupA, ...rec.groupB].find(s => s.toLowerCase() === scaffold?.toLowerCase()) || rec.groupA[0];
  return {receptor:rec.id, scaffold:candidate.toLowerCase(), view:view === 'analysis' ? 'analysis' : 'selector'};
}
export function readSelection(): Selection {
  const params = new URLSearchParams(window.location.search);
  let stored: Partial<Selection> = {};
  if (!params.has('receptor') && !params.has('scaffold')) {
    try { stored = JSON.parse(localStorage.getItem('vesicon_selected_pair') || '{}') || {}; } catch {}
  }
  return validSelection(params.get('receptor') || stored.receptor, params.get('scaffold') || stored.scaffold, params.get('view'));
}
