import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import app from '../server/app';
import { EVIDENCE } from '../src/data/dataset';

test('same-origin proxy, errors, export and public AI validation', async () => {
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const port=(server.address() as any).port;
  const base=`http://127.0.0.1:${port}/api`;
  const fetchOriginal=globalThis.fetch;
  const originalUrl=process.env.EXORANK_BACKEND_URL;
  const originalAi=process.env.ENABLE_AI_ANALYSIS;
  let upstreamStatus=200, upstreamType='chemical/x-pdb';
  const pdb=fs.readFileSync(new URL('../../backend/data/structures/'+EVIDENCE.T1_ANXA2.structure.pdb_file,import.meta.url),'utf8');
  process.env.EXORANK_BACKEND_URL='http://science.test/api';
  delete process.env.ENABLE_AI_ANALYSIS;
  globalThis.fetch=(input,options)=>{
    if(String(input).startsWith('http://science.test')) {
      if(String(input).endsWith('/structure/pdb'))return Promise.resolve(new Response(pdb,{status:upstreamStatus,headers:{'Content-Type':upstreamType}}));
      return Promise.resolve(new Response(JSON.stringify(EVIDENCE.T1_ANXA2),{headers:{'Content-Type':'application/json'}}));
    }
    return fetchOriginal(input,options);
  };
  try {
    const response=await fetchOriginal(base+'/exorank/structure/T1_ANXA2');
    assert.equal(response.status,200);assert.match(response.headers.get('content-type')!,/chemical\/x-pdb/);
    assert.equal(await response.text(),pdb);
    upstreamStatus=404;assert.equal((await fetchOriginal(base+'/exorank/structure/T1_ANXA2')).status,404);
    upstreamStatus=500;assert.equal((await fetchOriginal(base+'/exorank/structure/T1_ANXA2')).status,502);
    upstreamStatus=200;upstreamType='text/html';assert.equal((await fetchOriginal(base+'/exorank/structure/T1_ANXA2')).status,502);
    assert.equal((await fetchOriginal(base+'/exorank/structure/not-an-id')).status,400);
    const post=(route:string,body:unknown)=>fetchOriginal(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal((await post('/ai/mechanistic-insights',{receptorId:7,ligandId:[]})).status,400);
    assert.equal((await post('/ai/mechanistic-insights',{receptorId:'trop2',ligandId:'unknown'})).status,400);
    assert.equal((await post('/ai/mechanistic-insights',{receptorId:'trop2',ligandId:'anxa2'})).status,503);
    const dossier=await (await post('/export-dossier',{receptorId:'trop2',ligandId:'gapdh'})).json();
    assert.equal(dossier.scientificEvidence.interaction_id,'T1_GAPDH');
    assert.equal(dossier.evCandidateProfile.name,'GAPDH');
    assert.ok(!JSON.stringify(dossier).includes('favorable steric'));
    assert.equal((await fetchOriginal(base+'/does-not-exist')).status,404);
    delete process.env.EXORANK_BACKEND_URL;
    const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
    assert.equal((await fetchOriginal(base+'/exorank/health')).status,503);
    if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
  }finally{
    globalThis.fetch=fetchOriginal;
    if(originalUrl===undefined)delete process.env.EXORANK_BACKEND_URL;else process.env.EXORANK_BACKEND_URL=originalUrl;
    if(originalAi===undefined)delete process.env.ENABLE_AI_ANALYSIS;else process.env.ENABLE_AI_ANALYSIS=originalAi;
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
});
