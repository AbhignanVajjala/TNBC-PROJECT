import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildInteractionId, isInteractionResponse } from '../src/services/api';
import { EVIDENCE, getLigand, getPairScore, RECEPTOR_DATASET } from '../src/data/dataset';
import { parsePdb, readPdbResponse, selectStructure, MAX_PDB_BYTES } from '../src/lib/pdb';
import { validSelection } from '../src/lib/selection';
import { profile, formatMetric, metricDelta } from '../src/lib/pairProfile';
import { readTheme, saveTheme, THEME_KEY } from '../src/lib/theme';
import { scientificBackendUrl } from '../server/scientificBackend';

const root = new URL('../../backend/data/', import.meta.url);
const pdb = fs.readFileSync(new URL('structures/' + EVIDENCE.T1_ANXA2.structure.pdb_file, root), 'utf8');

test('malformed or misidentified scientific metadata is rejected', () => {
  assert.ok(isInteractionResponse(EVIDENCE.T1_ANXA2,'T1_ANXA2'));
  assert.equal(isInteractionResponse({...EVIDENCE.T1_ANXA2,target_no:2},'T1_ANXA2'),false);
  assert.equal(isInteractionResponse({...EVIDENCE.T1_ANXA2,alphafold:null},'T1_ANXA2'),false);
  assert.equal(isInteractionResponse({...EVIDENCE.T1_ANXA2,final:{TPS:NaN}},'T1_ANXA2'),false);
});

test('all 200 receptor/candidate IDs match scientific identities and groups', () => {
  let count = 0;
  for (const r of RECEPTOR_DATASET) for (const group of ['A','B']) for (const candidate of group === 'A' ? r.groupA : r.groupB) {
    const id = buildInteractionId(r.no,candidate.toLowerCase());
    assert.ok(isInteractionResponse(EVIDENCE[id],id));
    assert.equal(EVIDENCE[id].receptor,r.target);
    assert.equal(EVIDENCE[id].candidate_protein,candidate);
    assert.equal(EVIDENCE[id].group,group);
    assert.equal(validSelection(r.id,candidate,'analysis').scaffold,candidate.toLowerCase());
    count++;
  }
  assert.equal(count,200);
});

test('all indexed files exist and parse finite coordinates, including AF2 and AF3', () => {
  const modelCounts:Record<string,number> = {};
  let atomCount = 0;
  for (const row of Object.values(EVIDENCE)) {
    const path = new URL('structures/' + row.structure.pdb_file,root);
    assert.ok(fs.existsSync(path));
    const parsed = parsePdb(fs.readFileSync(path,'utf8'));
    assert.ok(parsed.atomCount > 0);
    assert.ok(parsed.chains.length > 0);
    atomCount += parsed.atomCount;
    modelCounts[row.structure.model_type!] = (modelCounts[row.structure.model_type!] || 0) + 1;
  }
  assert.deepEqual(modelCounts,{alphafold2_multimer_v3:155,alphafold3:45});
  console.info('Parsed structures:',modelCounts,'total atoms:',atomCount);
});

test('invalid, empty, malformed and oversized PDBs are rejected', async () => {
  for (const text of ['', '<html>ATOM error</html>', '{}', pdb.replace(/(-?\d+\.\d{3})/,'NaN')]) assert.throws(()=>parsePdb(text));
  assert.throws(()=>parsePdb(' '.repeat(MAX_PDB_BYTES + 1)));
  await assert.rejects(readPdbResponse(new Response(pdb,{headers:{'Content-Type':'text/html'}})));
  await assert.rejects(readPdbResponse(new Response('ATOM',{headers:{'Content-Type':'chemical/x-pdb'}})));
  await assert.rejects(readPdbResponse(new Response('',{status:404})),/Structure unavailable/);
});

test('validated authentic and uploaded coordinates have explicit precedence and pair isolation', () => {
  const backend = {pairId:'T1_ANXA2',pdb,parsed:parsePdb(pdb),source:'backend' as const};
  const upload = {...backend,source:'upload' as const};
  assert.equal(selectStructure('T1_ANXA2',undefined,backend),backend);
  assert.equal(selectStructure('T1_ANXA2',upload,backend),upload);
  assert.equal(selectStructure('T2_ANXA2',upload,backend),null);
  assert.equal(selectStructure('T1_ANXA2'),null);
});

test('missing metadata never becomes ANXA2; all candidates keep their own symbol', () => {
  for(const r of RECEPTOR_DATASET) for(const symbol of [...r.groupA,...r.groupB]) assert.equal(getLigand(symbol).id,symbol.toLowerCase());
  assert.equal(getLigand('LDHA').uniprot,'P00338');
  assert.equal(getLigand('unknown').name,'UNKNOWN');
  assert.equal(getLigand('unknown').primer.what,'Metadata unavailable');
});

test('scores are locked research values, missing values are null, uploads get no scores', () => {
  assert.equal(getPairScore('trop2','anxa2').score,EVIDENCE.T1_ANXA2.final.TPS);
  assert.equal(getPairScore('trop2','anxa2').scores.evidence,null);
  assert.equal(getPairScore('trop2','unknown').score,null);
  assert.equal(getPairScore('trop2','anxa2').interfaceArea,null);
  const uploaded = {pairId:'T1_ANXA2',pdb,parsed:parsePdb(pdb),source:'upload' as const};
  const result = profile(RECEPTOR_DATASET[0],'ANXA2',EVIDENCE.T1_ANXA2,uploaded);
  for (const key of ['score','ipTM','deltaG','kd','interfaceArea','pDockQ2'] as const) assert.equal(result[key],null);
  assert.equal(formatMetric(null),'Not calculated');
  assert.equal(metricDelta(null,0.5),'Not calculated');
});

test('valid Group B links restore and invalid URL inputs safely fall back', () => {
  assert.deepEqual(validSelection('trop2','gapdh','analysis'),{receptor:'trop2',scaffold:'gapdh',view:'analysis'});
  assert.deepEqual(validSelection('invalid','invalid','oops'),{receptor:'trop2',scaffold:'anxa2',view:'selector'});
});

test('theme persists and blocked storage defaults gracefully to light', () => {
  const store = new Map<string,string>();
  const storage = {getItem:(key:string)=>store.get(key)||null,setItem:(key:string,value:string)=>{store.set(key,value);}};
  assert.equal(readTheme(storage),'light');saveTheme('dark',storage);
  assert.equal(store.get(THEME_KEY),'dark');assert.equal(readTheme(storage),'dark');
  saveTheme('light',storage);assert.equal(readTheme(storage),'light');
  assert.equal(readTheme({getItem:()=>{throw Error();}}),'light');
});

test('production requires an explicitly configured API base URL', () => {
  assert.equal(scientificBackendUrl({NODE_ENV:'production'}),null);
  assert.equal(scientificBackendUrl({NODE_ENV:'development'}),'http://127.0.0.1:8000/api');
  assert.equal(scientificBackendUrl({EXORANK_BACKEND_URL:'https://backend.example/api/'}),'https://backend.example/api');
  for (const url of ['https://backend.example','file:///api','https://user:pass@backend.example/api','https://backend.example/api?secret=1']) assert.throws(()=>scientificBackendUrl({EXORANK_BACKEND_URL:url}));
});
