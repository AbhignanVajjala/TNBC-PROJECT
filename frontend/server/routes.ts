import { scientificBackendUrl } from './scientificBackend';
import { readPdbResponse } from '../src/lib/pdb';
import { Router, Request, Response } from 'express';
import { RECEPTOR_DATASET, LIGANDS_DATABASE, getPairScore, getPairEvidence, getLigand } from '../src/data/dataset';
import { generateMechanisticAnalysis } from './gemini';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'EXO-TARGET TNBC Prioritization Engine API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    geminiConfigured: process.env.ENABLE_AI_ANALYSIS === 'true' && !!process.env.GEMINI_API_KEY && !!process.env.GEMINI_MODEL,
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

  if(!requestPair({receptorId,ligandId:scaffoldId}))return res.status(400).json({error:'Invalid receptor/candidate pair.'});
  const scoreData = getPairScore(receptorId, scaffoldId);
  const receptor = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === receptorId);
  const ligand = getLigand(scaffoldId);

  res.json({
    pairKey: `${receptorId}_${scaffoldId}`,
    receptor: receptor ? { id: receptor.id, target: receptor.target, uniprot: receptor.uniprot } : null,
    ligand: ligand ? { id: scaffoldId, name: ligand.name, uniprot: ligand.uniprot } : null,
    biophysicalMetrics: scoreData
  });
});

function requestPair(body:any) {
  if(!body || typeof body.receptorId!=='string' || typeof body.ligandId!=='string' || body.receptorId.length>64 || body.ligandId.length>64)return null;
  const receptor=RECEPTOR_DATASET.find(r=>r.id===body.receptorId.toLowerCase());
  const candidate=body.ligandId.toUpperCase();
  if(!receptor || ![...receptor.groupA,...receptor.groupB].includes(candidate))return null;
  const evidence=getPairEvidence(receptor.id,candidate);
  return {receptor,candidate,evidence,ligand:getLigand(candidate)};
}
// Bounded per-instance usage; public deployments should also enable platform rate limits.
const usage=new Map<string,{count:number;reset:number}>();
let concurrentAi=0, globalCount=0, globalReset=0;
apiRouter.post('/ai/mechanistic-insights', async(req:Request,res:Response)=>{
  const pair=requestPair(req.body);
  if(!pair)return res.status(400).json({error:'Select a valid receptor and candidate pair.'});
  const origin=req.get('origin');
  if(origin){try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({error:'Cross-origin AI requests are not allowed.'});}catch{return res.status(403).json({error:'Invalid origin.'});}}
  if(process.env.ENABLE_AI_ANALYSIS!=='true' || !process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL)return res.status(503).json({error:'AI analysis unavailable: service not configured.'});
  if(!pair.evidence)return res.status(422).json({error:'Scientific evidence unavailable.'});
  const now=Date.now(), hour=3600000;
  if(now>=globalReset){globalCount=0;globalReset=now+hour;}
  for(const [key,value] of usage)if(now>=value.reset)usage.delete(key);
  const key=req.ip || 'unknown';
  const user=usage.get(key) || {count:0,reset:now+hour};
  if(user.count>=5 || globalCount>=20 || concurrentAi>=2 || usage.size>=1000){res.setHeader('Retry-After','3600');return res.status(429).json({error:'AI request limit reached.'});}
  user.count++;usage.set(key,user);globalCount++;concurrentAi++;
  try{
    const result=await generateMechanisticAnalysis({receptorId:pair.receptor.id,ligandId:pair.candidate,receptorName:pair.receptor.target,ligandName:pair.ligand.name,evidence:pair.evidence});
    return res.json(result);
  }catch{return res.status(502).json({error:'AI analysis unavailable. The provider request failed.'});}
  finally{concurrentAi--;}
});
apiRouter.post('/export-dossier',(req:Request,res:Response)=>{
  const pair=requestPair(req.body);
  if(!pair)return res.status(400).json({error:'Select a valid receptor and candidate pair.'});
  return res.json({title:`EXO-TARGET: ${pair.receptor.target} × ${pair.candidate}`,exportTimestamp:new Date().toISOString(),targetProfile:pair.receptor,evCandidateProfile:pair.ligand,scientificEvidence:pair.evidence,
    scientificEvidenceSource:'Repository evidence snapshot',structureStatus:'Coordinates not retrieved by this endpoint',interpretation:'Computational prioritization for experimental validation; not experimentally confirmed binding.',customNotes:typeof req.body.customNotes==='string'?req.body.customNotes.slice(0,4000):null});
});

// ============================================================================
// EXO-RANK backend proxy â€” forwards to the FastAPI scientific backend so the
// React app stays same-origin (no CORS). Backend URL is configurable via env.
// ============================================================================

const INTERACTION_ID_RE = /^T\d+_[A-Za-z0-9]+$/;   // e.g. T1_ANXA2 (guards against SSRF / path abuse)

apiRouter.get('/exorank/health', async (_req: Request, res: Response) => {
  try {
    const EXORANK_BACKEND_URL=scientificBackendUrl();
    if(!EXORANK_BACKEND_URL)return res.status(503).json({connected:false,error:'Scientific backend is not configured.'});
    const r = await fetch(`${EXORANK_BACKEND_URL}/system/status`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return res.status(502).json({ connected: false, error: `backend HTTP ${r.status}` });
    return res.json({ connected: true, backend: await r.json() });
  } catch (err: any) {
    return res.status(502).json({ connected: false, error: 'Scientific backend unreachable or misconfigured.' });
  }
});

apiRouter.get('/exorank/interaction/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!INTERACTION_ID_RE.test(id)) return res.status(400).json({ error: 'invalid interaction id' });
  try {
    const EXORANK_BACKEND_URL=scientificBackendUrl();
    if(!EXORANK_BACKEND_URL)return res.status(503).json({connected:false,error:'Scientific backend is not configured.'});
    const r = await fetch(`${EXORANK_BACKEND_URL}/interactions/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
    if (r.status === 404) return res.status(404).json({ error: 'interaction not found', id });
    if (!r.ok) return res.status(502).json({ error: `backend HTTP ${r.status}` });
    return res.json(await r.json());
  } catch (err: any) {
    return res.status(502).json({ error: 'Scientific backend unreachable or misconfigured.' });
  }
});

apiRouter.get('/exorank/structure/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!INTERACTION_ID_RE.test(id)) return res.status(400).send('invalid interaction id');
  try {
    const EXORANK_BACKEND_URL=scientificBackendUrl();
    if(!EXORANK_BACKEND_URL)return res.status(503).json({connected:false,error:'Scientific backend is not configured.'});
    const r = await fetch(`${EXORANK_BACKEND_URL}/interactions/${encodeURIComponent(id)}/structure/pdb`, { signal: AbortSignal.timeout(18000) });
    if (r.status === 404) return res.status(404).send('structure not available');
    if (!r.ok) return res.status(502).send(`backend HTTP ${r.status}`);
    const pdb = await readPdbResponse(r);
    res.setHeader('Content-Type', 'chemical/x-pdb');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(pdb);
  } catch (err: any) {
    return res.status(502).send('Scientific backend unreachable or invalid PDB response.');
  }
});
