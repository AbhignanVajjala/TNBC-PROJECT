import React from 'react';
import {act, create} from 'react-test-renderer';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {usePairStructure} from '../src/hooks/usePairStructure';
import {EVIDENCE} from '../src/data/dataset';
import {parsePdb,StructureData} from '../src/lib/pdb';
import {MolecularViewer} from '../src/components/MolecularViewer';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const pdb = fs.readFileSync(new URL('../../backend/data/structures/'+EVIDENCE.T1_ANXA2.structure.pdb_file,import.meta.url),'utf8');
const response = () => new Response(pdb,{headers:{'Content-Type':'chemical/x-pdb'}});
let current:ReturnType<typeof usePairStructure>;
function Probe({id,upload}:{id:string;upload?:StructureData}) { current=usePairStructure(id,upload);return null; }

test('rapid pair switching rejects old responses even if the transport ignores abort', async () => {
  const original=globalThis.fetch;
  const pending:{resolve:(r:Response)=>void;signal:AbortSignal}[]=[];
  globalThis.fetch=(_url,options)=>new Promise<Response>(resolve=>pending.push({resolve,signal:options?.signal as AbortSignal}));
  let view:ReturnType<typeof create>;
  try {
    await act(async()=>{view=create(<Probe id="T1_ANXA2"/>);});
    await act(async()=>{view.update(<Probe id="T2_ANXA2"/>);});
    assert.ok(pending[0].signal.aborted);
    await act(async()=>{pending[1].resolve(response());});
    assert.equal(current.structure?.pairId,'T2_ANXA2');
    await act(async()=>{pending[0].resolve(response());});
    assert.equal(current.structure?.pairId,'T2_ANXA2');
  } finally {await act(async()=>view?.unmount());globalThis.fetch=original;}
});

test('upload becomes active and cannot be overwritten by an in-flight backend request', async () => {
  const original=globalThis.fetch;
  let resolve:(r:Response)=>void;
  globalThis.fetch=()=>new Promise<Response>(done=>{resolve=done;});
  let view:ReturnType<typeof create>;
  const upload:StructureData={pairId:'T1_ANXA2',pdb,parsed:parsePdb(pdb),source:'upload',filename:'authentic-test.pdb'};
  try {
    await act(async()=>{view=create(<Probe id="T1_ANXA2"/>);});
    await act(async()=>{view.update(<Probe id="T1_ANXA2" upload={upload}/>);});
    assert.equal(current.structure,upload);
    await act(async()=>{resolve(response());});
    assert.equal(current.structure,upload);
    await act(async()=>{view.update(<Probe id="T2_ANXA2" upload={upload}/>);});
    assert.equal(current.structure,null);
  } finally {await act(async()=>view?.unmount());globalThis.fetch=original;}
});

test('metadata availability is never structure availability; bad responses fail honestly', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify(EVIDENCE.T1_ANXA2),{headers:{'Content-Type':'application/json'}});
  let view:ReturnType<typeof create>;
  try {
    await act(async()=>{view=create(<Probe id="T1_ANXA2"/>);});
    assert.equal(current.status,'failed');assert.equal(current.structure,null);
    assert.match(current.error!,/PDB content/);
  } finally {await act(async()=>view?.unmount());globalThis.fetch=original;}
});

test('missing browser/WebGL initialization fails within the viewer without crashing analysis', async () => {
  const states:string[]=[];
  let view:ReturnType<typeof create>;
  await act(async()=>{
    view=create(<MolecularViewer structure={null} representation="cartoon" onStatus={(status)=>states.push(status)}/>,{createNodeMock:()=>({querySelector:()=>null})});
    await new Promise(resolve=>setTimeout(resolve,100));
  });
  assert.ok(states.includes('error'));
  await act(async()=>view.unmount());
});

test('timeouts and missing structures stay recoverable and retry loads authentic coordinates', async () => {
  const original=globalThis.fetch;
  let view:ReturnType<typeof create>;
  try {
    globalThis.fetch=async()=>{throw new DOMException('Request timed out','TimeoutError');};
    await act(async()=>{view=create(<Probe id="T1_ANXA2"/>);});
    assert.equal(current.status,'failed');assert.equal(current.structure,null);
    globalThis.fetch=async()=>new Response('',{status:404});
    await act(async()=>{view.update(<Probe id="T2_ANXA2"/>);});
    assert.equal(current.status,'unavailable');
    globalThis.fetch=async()=>response();
    await act(async()=>current.retry());
    assert.equal(current.status,'loaded');assert.equal(current.structure?.source,'backend');
  } finally {await act(async()=>view?.unmount());globalThis.fetch=original;}
});
