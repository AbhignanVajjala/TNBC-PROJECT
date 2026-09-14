import { Router, Request, Response } from 'express';
import { RECEPTOR_DATASET, LIGANDS_DATABASE, getPairScore } from '../src/data/dataset';
import { generateMechanisticAnalysis, MechanisticAnalysisRequest } from './gemini';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'EXO-TARGET TNBC Prioritization Engine API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    endpoints: [
      'GET  /api/health',
      'GET  /api/targets',
      'GET  /api/targets/:id',
      'GET  /api/ligands',
      'GET  /api/pair-score?receptor=:rec&scaffold=:scaff',
      'POST /api/ai/mechanistic-insights',
      'POST /api/export-dossier',
      'GET  /api/exorank/health',
      'GET  /api/exorank/interaction/:id',
      'GET  /api/exorank/structure/:id'
    ]
  });
});

// Get all TNBC receptor targets
apiRouter.get('/targets', (req: Request, res: Response) => {
  const summary = RECEPTOR_DATASET.map(r => ({
    id: r.id,
    no: r.no,
    target: r.target,
    uniprot: r.uniprot,
    groupACount: r.groupA.length,
    groupBCount: r.groupB.length,
    groupA: r.groupA,
    primerSummary: r.primer.what,
    topology: r.deep.topology
  }));
  res.json({ total: summary.length, targets: summary });
});

// Get individual target
apiRouter.get('/targets/:id', (req: Request, res: Response) => {
  const targetId = req.params.id.toLowerCase();
  const target = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === targetId);
  if (!target) {
    return res.status(404).json({ error: `Target '${targetId}' not found.` });
  }
  res.json({ target });
});

// Get all EV candidates / scaffolds
apiRouter.get('/ligands', (req: Request, res: Response) => {
  const list = Object.entries(LIGANDS_DATABASE).map(([key, item]) => ({
    id: key,
    name: item.name,
    uniprot: item.uniprot,
    scaffoldType: item.deep.scaffoldType,
    exosomeDensity: item.deep.exosomeDensity,
    primerWhat: item.primer.what
  }));
  res.json({ total: list.length, ligands: list });
});

// Get pair scoring details
apiRouter.get('/pair-score', (req: Request, res: Response) => {
  const receptorId = (req.query.receptor as string || 'trop2').toLowerCase();
  const scaffoldId = (req.query.scaffold as string || 'anxa2').toLowerCase();

  const scoreData = getPairScore(receptorId, scaffoldId);
  const receptor = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === receptorId);
  const ligand = LIGANDS_DATABASE[scaffoldId];

  res.json({
    pairKey: `${receptorId}_${scaffoldId}`,
    receptor: receptor ? { id: receptor.id, target: receptor.target, uniprot: receptor.uniprot } : null,
    ligand: ligand ? { id: scaffoldId, name: ligand.name, uniprot: ligand.uniprot } : null,
    biophysicalMetrics: scoreData
  });
});

// AI-powered mechanistic insights and mutagenesis rationale
apiRouter.post('/ai/mechanistic-insights', async (req: Request, res: Response) => {
  try {
    const payload: MechanisticAnalysisRequest = req.body;

    if (!payload.receptorId || !payload.ligandId) {
      return res.status(400).json({
        error: 'Missing required parameters: receptorId and ligandId.'
      });
    }

    const receptor = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === payload.receptorId.toLowerCase());
    const ligand = LIGANDS_DATABASE[payload.ligandId.toLowerCase()];

    const enrichedPayload: MechanisticAnalysisRequest = {
      ...payload,
      receptorName: payload.receptorName || (receptor ? receptor.target : payload.receptorId.toUpperCase()),
      receptorUniprot: payload.receptorUniprot || (receptor ? receptor.uniprot : undefined),
      ligandName: payload.ligandName || (ligand ? ligand.name : payload.ligandId.toUpperCase()),
      ligandUniprot: payload.ligandUniprot || (ligand ? ligand.uniprot : undefined)
    };

    const result = await generateMechanisticAnalysis(enrichedPayload);
    res.json(result);
  } catch (err: any) {
    console.error('API Error /api/ai/mechanistic-insights:', err);
    res.status(500).json({
      error: 'Failed to generate biophysical analysis',
      message: err?.message || 'Unknown internal error'
    });
  }
});

// Export dossier endpoint
apiRouter.post('/export-dossier', (req: Request, res: Response) => {
  const { receptorId, ligandId, customNotes } = req.body;
  const recId = (receptorId || 'trop2').toLowerCase();
  const ligId = (ligandId || 'anxa2').toLowerCase();
  const receptor = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === recId);
  const ligand = LIGANDS_DATABASE[ligId];
  const score = getPairScore(recId, ligId);

  const generatedDate = new Date().toISOString();
  const dossierPayload = {
    title: `Biophysical Validation Dossier: ${receptor?.target || receptorId} × ${ligand?.name || ligandId}`,
    exportTimestamp: generatedDate,
    classification: 'Confidential Pre-Clinical Exosome Engineering Report',
    targetProfile: receptor,
    evCandidateProfile: ligand,
    biophysicalScoring: score,
    customNotes: customNotes || 'None provided.',
    exportVersion: '2.4.0'
  };

  res.json(dossierPayload);
});

// ============================================================================
// EXO-RANK backend proxy — forwards to the FastAPI scientific backend so the
// React app stays same-origin (no CORS). Backend URL is configurable via env.
// ============================================================================
const EXORANK_BACKEND_URL = (process.env.EXORANK_BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const INTERACTION_ID_RE = /^T\d+_[A-Za-z0-9]+$/;   // e.g. T1_ANXA2 (guards against SSRF / path abuse)

apiRouter.get('/exorank/health', async (_req: Request, res: Response) => {
  try {
    const r = await fetch(`${EXORANK_BACKEND_URL}/system/status`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return res.status(502).json({ connected: false, error: `backend HTTP ${r.status}`, backendUrl: EXORANK_BACKEND_URL });
    return res.json({ connected: true, backend: await r.json(), backendUrl: EXORANK_BACKEND_URL });
  } catch (err: any) {
    return res.status(502).json({ connected: false, error: err?.message || 'backend unreachable', backendUrl: EXORANK_BACKEND_URL });
  }
});

apiRouter.get('/exorank/interaction/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!INTERACTION_ID_RE.test(id)) return res.status(400).json({ error: 'invalid interaction id' });
  try {
    const r = await fetch(`${EXORANK_BACKEND_URL}/interactions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(6000) });
    if (r.status === 404) return res.status(404).json({ error: 'interaction not found', id });
    if (!r.ok) return res.status(502).json({ error: `backend HTTP ${r.status}` });
    return res.json(await r.json());
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'backend unreachable' });
  }
});

apiRouter.get('/exorank/structure/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!INTERACTION_ID_RE.test(id)) return res.status(400).send('invalid interaction id');
  try {
    const r = await fetch(`${EXORANK_BACKEND_URL}/interactions/${encodeURIComponent(id)}/structure/pdb`, { signal: AbortSignal.timeout(10000) });
    if (r.status === 404) return res.status(404).send('structure not available');
    if (!r.ok) return res.status(502).send(`backend HTTP ${r.status}`);
    const pdb = await r.text();
    res.setHeader('Content-Type', 'chemical/x-pdb');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(pdb);
  } catch (err: any) {
    return res.status(502).send(err?.message || 'backend unreachable');
  }
});
