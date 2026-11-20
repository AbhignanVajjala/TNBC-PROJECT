/** Read-only retrieval checks against a running Express/Vercel frontend. */
import {parsePdb} from '../src/lib/pdb';
import {EVIDENCE} from '../src/data/dataset';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
const base=(process.argv[2] || 'http://localhost:3000').replace(/\/$/,'');
const results:unknown[]=[];
const health=await fetch(base+'/api/exorank/health',{signal:AbortSignal.timeout(30000)});
const status=await health.json();
if(!health.ok || !status.connected)throw Error('Scientific backend health failed');
results.push({path:'/api/exorank/health',status:health.status,contentType:health.headers.get('content-type'),connected:status.connected});
for(const id of ['T1_ANXA2','T1_FN1','T6_MFGE8']) {
  const response=await fetch(base+'/api/exorank/interaction/'+id,{signal:AbortSignal.timeout(30000)});
  const metadata=await response.json();
  if(!response.ok || metadata.interaction_id!==id || metadata.receptor!==EVIDENCE[id].receptor || metadata.candidate_protein!==EVIDENCE[id].candidate_protein)throw Error('Interaction mismatch: '+id);
  const pdbResponse=await fetch(base+'/api/exorank/structure/'+id,{signal:AbortSignal.timeout(30000)});
  if(!pdbResponse.ok || !pdbResponse.headers.get('content-type')?.startsWith('chemical/x-pdb'))throw Error('PDB HTTP response failed: '+id);
  const pdb=await pdbResponse.text(), parsed=parsePdb(pdb);
  const local=fs.readFileSync(new URL('../../backend/data/structures/'+metadata.structure.pdb_file,import.meta.url),'utf8');
  const hash=(text:string)=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
  if(hash(pdb)!==hash(local))throw Error('Remote coordinates differ from repository: '+id);
  results.push({interactionId:id,metadataStatus:response.status,structureStatus:pdbResponse.status,contentType:pdbResponse.headers.get('content-type'),model:metadata.structure.model_type,atomCount:parsed.atomCount,chains:parsed.chains,repositoryCoordinatesMatch:true});
}
console.log(JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));
