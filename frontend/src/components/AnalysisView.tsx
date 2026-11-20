import React, { useState, useEffect, useRef } from 'react';
import { PerspectiveMode } from '../types';
import { RECEPTOR_DATASET, getLigand, getPairEvidence } from '../data/dataset';
import { fetchAiMechanisticInsights, AiMechanisticInsightsResponse, buildInteractionId, fetchExoRankInteraction, ExoRankInteraction } from '../services/api';
import { MAX_PDB_BYTES, parsePdb, StructureData, SURFACE_ATOM_LIMIT } from '../lib/pdb';
import { usePairStructure } from '../hooks/usePairStructure';
import { MolecularViewer, ViewerControls } from './MolecularViewer';
import { ThemeSwitcher } from './ThemeSwitcher';
import { profile, formatMetric, metricDelta } from '../lib/pairProfile';

interface AnalysisViewProps {
  perspective: PerspectiveMode;
  onPerspectiveChange?: (p: PerspectiveMode) => void;
  selectedReceptorId: string;
  selectedLigandId: string;
  onBackToSelector: () => void;
  onSelectLigand: (id: string) => void;
  onSelectReceptor: (id: string) => void;
  onSelectPair: (receptor:string, ligand:string) => void;
  uploads: Record<string,StructureData>;
  onUpload: (value:StructureData) => void;
}
const EV_CATALOG = Object.fromEntries([...new Set(RECEPTOR_DATASET.flatMap(r=>[...r.groupA,...r.groupB]))].map(key=>{
  const item=getLigand(key);
  return [key,{name:item.name,gene:key,uniprot:item.uniprot,topology:item.deep.scaffoldType,length:null,mass:'Metadata unavailable'}];
}));
export const AnalysisView: React.FC<AnalysisViewProps> = ({perspective,onPerspectiveChange,selectedReceptorId,selectedLigandId,onBackToSelector,onSelectLigand,onSelectReceptor,onSelectPair,uploads,onUpload}) => {
  const currentReceptorRecord=RECEPTOR_DATASET.find(r=>r.id === selectedReceptorId) || RECEPTOR_DATASET[0];
  const activeEvKey=selectedLigandId.toUpperCase();
  const activeEvMeta=EV_CATALOG[activeEvKey];
  const interactionId=buildInteractionId(currentReceptorRecord.no,activeEvKey);
  const currentPairLookupKey=interactionId;
  const pairRef=useRef(interactionId); pairRef.current=interactionId;
  const [compareEvKey,setCompareEvKey]=useState(currentReceptorRecord.groupA.find(k=>k!==activeEvKey) || currentReceptorRecord.groupA[0]);
  const [showCompareModal,setShowCompareModal]=useState(false);
  const [compareTab,setCompareTab]=useState<'1v1'|'matrix'>('1v1');
  const [representation,setRepresentation]=useState<'cartoon'|'surface'|'stick'>('cartoon');
  const [seqChain,setSeqChain]=useState('A');
  const [seqOpen,setSeqOpen]=useState(true);
  const [highlight,setHighlight]=useState<{chain:string;residue:string}|null>(null);
  const [copied,setCopied]=useState(false);
  const [uploadError,setUploadError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [aiResult,setAiResult]=useState<{id:string;value:AiMechanisticInsightsResponse}|null>(null);
  const aiAnalysis=aiResult?.id===interactionId ? aiResult.value : null;
  const [isLoadingAi,setIsLoadingAi]=useState(false);
  const [aiError,setAiError]=useState('');
  const [exportSuccess,setExportSuccess]=useState(false);
  const [actionError,setActionError]=useState('');
  const glviewerRef=useRef<ViewerControls>(null);
  const viewerContainerRef=useRef<HTMLDivElement>(null);
  const [live,setLive]=useState<{id:string;data:ExoRankInteraction|null;status:'loading'|'live'|'offline'}>({id:interactionId,data:null,status:'loading'});
  const {structure,status:structureStatus,error:structureError,retry:retryStructure}=usePairStructure(interactionId,uploads[interactionId]);
  const structureRef=useRef(structure); structureRef.current=structure;
  const aiRequestRef=useRef(0);
  const uploadRequestRef=useRef(0);
  const [renderState,setRenderState]=useState<{id:string;status:'loading'|'ready'|'error';message?:string}>({id:interactionId,status:'loading'});
  const rendering=renderState.id===interactionId ? renderState : {status:'loading' as const,message:undefined};
  const structureLabel=structureStatus==='loading' ? 'Loading structure' : structureStatus==='unavailable' ? 'Structure unavailable' : structureStatus==='failed' ? 'Structure loading failed' : rendering.status==='error' ? '3D rendering unavailable' : rendering.status!=='ready' ? 'Loading structure' : structure?.source==='upload' ? 'User-uploaded PDB' : 'Authentic PDB loaded';
  const uploaded=structure?.source==='upload';
  const metadata=live.id===interactionId ? live.data : null;
  const backendStatus=live.id===interactionId ? live.status : 'loading';
  const backendData=uploaded ? null : metadata || getPairEvidence(currentReceptorRecord.id,activeEvKey);
  const getPairProfile=(rec:typeof currentReceptorRecord,key:string) => profile(rec,key,rec.id===currentReceptorRecord.id && key===activeEvKey ? metadata : null,uploads[buildInteractionId(rec.no,key)]);
  const activePairData=profile(currentReceptorRecord,activeEvKey,metadata,structure);
  const compareKey=currentReceptorRecord.groupA.includes(compareEvKey) && compareEvKey!==activeEvKey ? compareEvKey : currentReceptorRecord.groupA.find(k=>k!==activeEvKey) || currentReceptorRecord.groupA[0];
  const comparePairData=getPairProfile(currentReceptorRecord,compareKey);
  useEffect(()=>{setCompareEvKey(compareKey);},[compareKey]);
  const registry=Object.fromEntries([[1,'ANXA2'],[8,'SLC3A2'],[12,'SDCBP'],[2,'FN1'],[3,'CD44'],[6,'MFGE8']].map(([no,key])=>{
    const rec=RECEPTOR_DATASET.find(r=>r.no===no)!;
    const row=getPairProfile(rec,String(key)); return [row.pairKey,row];
  }));
  useEffect(()=>{
    const controller=new AbortController();
    aiRequestRef.current++;uploadRequestRef.current++;
    setLive({id:interactionId,data:null,status:'loading'});
    setAiResult(null);setAiError('');setIsLoadingAi(false);setUploading(false);setUploadError('');setActionError('');setExportSuccess(false);setHighlight(null);setCopied(false);
    fetchExoRankInteraction(interactionId,controller.signal).then(data=>{if(!controller.signal.aborted)setLive({id:interactionId,data,status:data?'live':'offline'});});
    return ()=>controller.abort();
  },[interactionId]);
  useEffect(()=>{if(structure && !structure.parsed.chains.includes(seqChain))setSeqChain(structure.parsed.chains[0]);},[structure,seqChain]);
  useEffect(()=>{setHighlight(null);},[structure]);
  useEffect(()=>{
    if(!showCompareModal)return;
    const before=document.activeElement as HTMLElement;
    const dialog=document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button,select,a[href],input') || []).filter(el=>!el.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setShowCompareModal(false);
      if(event.key==='Tab'){
        const all=focusable(), first=all[0],last=all.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('keydown',key);before?.focus();};
  },[showCompareModal]);
  const handleResetCamera=()=>glviewerRef.current?.reset();
  const handleCenterCamera=()=>glviewerRef.current?.center();
  const handleZoom=(factor:number)=>glviewerRef.current?.zoom(factor);
  const handleSetRepresentation=(mode:'cartoon'|'surface'|'stick')=>setRepresentation(mode);
  const handleFileUpload=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const pairId=interactionId, request=++uploadRequestRef.current;setUploadError('');setUploading(true);
    try {
      if(!/\.(pdb|ent)$/i.test(file.name))throw new Error('Choose a .pdb or .ent file.');
      if(file.size>MAX_PDB_BYTES)throw new Error('PDB files must be 8 MB or smaller.');
      const pdb=await file.text();const parsed=parsePdb(pdb);
      if(request!==uploadRequestRef.current)return;
      onUpload({pairId,pdb,parsed,source:'upload',filename:file.name});
      if(pairRef.current===pairId){aiRequestRef.current++;setIsLoadingAi(false);setAiResult(null);setAiError('');setRenderState({id:pairId,status:'loading'});}
    }catch(error){if(pairRef.current===pairId && request===uploadRequestRef.current)setUploadError((error as Error).message);}
    finally{if(pairRef.current===pairId && request===uploadRequestRef.current)setUploading(false);}
  };
  const handleSelectReceptorString=(value:string)=>{
    const rec=RECEPTOR_DATASET.find(r=>`${r.target} (${r.uniprot})`===value);
    if(rec)onSelectReceptor(rec.id);
  };
  const handleSelectEv=(key:string)=>onSelectLigand(key.toLowerCase());
  const handleLoadPair=(value:string,key:string)=>{
    const rec=RECEPTOR_DATASET.find(r=>`${r.target} (${r.uniprot})`===value);
    if(rec)onSelectPair(rec.id,key.toLowerCase());
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const handleRunAiAnalysis=async()=>{
    const id=interactionId, request=++aiRequestRef.current;
    if(uploaded){setAiError('AI analysis unavailable for uploaded coordinates: scientific metrics have not been calculated.');return;}
    setIsLoadingAi(true);setAiError('');
    try{
      const result=await fetchAiMechanisticInsights({receptorId:currentReceptorRecord.id,ligandId:activeEvKey});
      if(pairRef.current===id && structureRef.current?.source!=='upload' && request===aiRequestRef.current)setAiResult({id,value:result});
    }catch(error){if(pairRef.current===id && request===aiRequestRef.current)setAiError((error as Error).message);}
    finally{if(pairRef.current===id && request===aiRequestRef.current)setIsLoadingAi(false);}
  };
  const handleExportDossierJson=()=>{
    const dossier={title:`EXO-TARGET: ${currentReceptorRecord.target} × ${activeEvKey}`,exportTimestamp:new Date().toISOString(),
      interactionId,targetProfile:currentReceptorRecord,evCandidateProfile:getLigand(activeEvKey),
      structure:structure ? {source:structure.source,filename:structure.filename || activePairData.pdbId,...structure.parsed,chainRoles:'Unverified; chain identifiers are shown as found in the file.'} : {status:structureStatus},
      scientificEvidence:uploaded ? null : backendData,scientificEvidenceSource:uploaded?'Not calculated for uploaded coordinates':metadata?'Scientific backend':'Repository evidence snapshot',
      interpretation:activePairData.summary};
    const url=URL.createObjectURL(new Blob([JSON.stringify(dossier,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`EXO-TARGET_${currentReceptorRecord.id}_${activeEvKey}_dossier.json`;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExportSuccess(true);
  };
  const renderFormattedSequence=()=>{
    const residues=structure?.parsed.residues[seqChain];
    if(!residues?.length)return <div>No protein sequence available from loaded coordinates.</div>;
    return <div className="flex flex-wrap gap-0.5">{residues.map(residue=><button key={residue.id} title={`${residue.name} ${residue.id}, chain ${seqChain.trim()||'blank'}`} onClick={()=>setHighlight({chain:seqChain,residue:residue.id})} className={highlight?.chain===seqChain && highlight?.residue===residue.id ? 'seq-contact' : ''}>{residue.letter}</button>)}</div>;
  };

  return (
    <div className="analysis-page min-h-screen flex flex-col bg-[var(--a-bg-fcf9f0)] text-[var(--a-text-1c1c16)] antialiased">
      {/* Top Navigation */}
      <header className="w-full bg-[var(--a-bg-f3f0e8)]/95 backdrop-blur-md border-b border-[var(--a-border-2c3a2d)]/10 sticky top-0 z-40">
        <div className="min-h-16 py-2 gap-2 flex-wrap px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button to Return to Target Selector */}
            <button
              onClick={onBackToSelector}
              className="mr-1 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-code font-bold uppercase tracking-wider text-[var(--a-text-2c3a2d)] hover:text-[var(--a-text-a6543d)] bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/20 rounded-md shadow-xs hover:border-[var(--a-border-a6543d)] transition-all cursor-pointer"
              title="Return to Target Selector View"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span className="hidden md:inline">Selector</span>
            </button>

            <div className="w-8 h-8 rounded bg-[var(--a-bg-2c3a2d)] flex items-center justify-center text-[var(--a-text-fcf9f0)] shadow-sm">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-[18px] tracking-tight text-[var(--a-text-2c3a2d)] font-semibold leading-none">EXO-TARGET</span>
              <span className="font-mono-code text-[9px] uppercase tracking-widest text-[var(--a-text-53634b)] mt-0.5">COMPUTATIONAL PRIORITY ENGINE</span>
            </div>
            <div className="h-5 w-px bg-[var(--a-bg-2c3a2d)]/20 mx-2 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono-code">
              <span className="text-[var(--a-text-53634b)]">DOSSIER:</span>
              <span className="text-[var(--a-text-2c3a2d)] font-bold">
                {currentReceptorRecord.target.split('/')[0].trim()} × {activeEvKey}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2"><div className="flex items-center bg-[var(--a-bg-f6f4ea)] rounded p-1 border border-[var(--a-border-2c3a2d)]/15 shadow-xs">
            <button
              className={`px-3 py-1 text-xs font-mono-code uppercase tracking-wider rounded transition-all cursor-pointer ${
                perspective === 'primer'
                  ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] font-semibold shadow-xs'
                  : 'text-[var(--a-text-53634b)] hover:text-[var(--a-text-2c3a2d)]'
              }`}
              onClick={() => onPerspectiveChange ? onPerspectiveChange('primer') : null}
            >
              Primer
            </button>
            <button
              className={`px-3 py-1 text-xs font-mono-code uppercase tracking-wider rounded transition-all cursor-pointer ${
                perspective === 'deep'
                  ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] font-semibold shadow-xs'
                  : 'text-[var(--a-text-53634b)] hover:text-[var(--a-text-2c3a2d)]'
              }`}
              onClick={() => onPerspectiveChange ? onPerspectiveChange('deep') : null}
            >
              Deep Biocomputation
            </button>
          </div><ThemeSwitcher/></div>
        </div>
      </header>

      {/* Target & EV Candidate Pair Selectors Bar */}
      <div className="w-full bg-[var(--a-bg-f6f4ea)] border-b border-[var(--a-border-2c3a2d)]/15 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          {/* Target Receptor Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--a-border-2c3a2d)]/25 shadow-xs">
            <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-2c3a2d)] tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[var(--a-text-a6543d)]">adjust</span>
              TARGET RECEPTOR:
            </span>
            <select
              className="text-xs font-mono-code font-bold bg-[var(--a-bg-fcf9f0)] border border-[var(--a-border-2c3a2d)]/25 rounded py-1 px-2.5 text-[var(--a-text-2c3a2d)] focus:ring-2 focus:ring-[var(--a-ring-2c3a2d)] shadow-xs cursor-pointer"
              aria-label="Target receptor"
              value={`${currentReceptorRecord.target} (${currentReceptorRecord.uniprot})`}
              onChange={(e) => handleSelectReceptorString(e.target.value)}
            >
              {RECEPTOR_DATASET.map((r) => {
                const val = `${r.target} (${r.uniprot})`;
                return (
                  <option key={r.id} value={val}>
                    {val}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-[var(--a-text-a6543d)] font-bold font-serif text-lg">×</span>

          {/* Exosomal Candidate Scaffold Selector */}
          <div className="flex items-center gap-1.5 bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--a-border-a6543d)]/35 shadow-xs">
            <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-53634b)] tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[var(--a-text-a6543d)]">bubble_chart</span>
              EV CANDIDATE SCAFFOLD:
            </span>
            <select
              className="text-xs font-mono-code font-bold bg-[var(--a-bg-fcf9f0)] border border-[var(--a-border-a6543d)]/30 rounded py-1 px-2.5 text-[var(--a-text-2c3a2d)] focus:ring-2 focus:ring-[var(--a-ring-a6543d)] shadow-xs cursor-pointer min-w-0 max-w-full"
              aria-label="EV candidate scaffold"
              value={activeEvKey}
              onChange={(e) => handleSelectEv(e.target.value)}
            >
              {[
                ...currentReceptorRecord.groupA.map((sym) => ({ sym, group: 'A' as const })),
                ...currentReceptorRecord.groupB.map((sym) => ({ sym, group: 'B' as const })),
              ].map(({ sym, group }) => {
                const cat = EV_CATALOG[sym];
                return (
                  <option key={`${group}-${sym}`} value={sym}>
                    Group {group}: {cat ? `${cat.name} (${sym})` : sym}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Compare with other EV scaffolds button */}
          <button
            id="compare-ev-scaffolds-btn"
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] active:bg-[var(--a-bg-202b21)] text-[var(--a-text-fcf9f0)] font-mono-code text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer sm:ml-auto"
            title={`Compare ${activeEvKey} with other Group A candidate scaffolds for ${currentReceptorRecord.target}`}
          >
            <span className="material-symbols-outlined text-[17px] text-[var(--a-text-fcf9f0)]">compare_arrows</span>
            <span>Compare EV Scaffolds</span>
            <span className="px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono-code font-bold">
              {currentReceptorRecord.groupA.length} AVAILABLE
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full flex-1 py-6 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Executive Summary Banner */}
        <section className="bg-[var(--a-bg-ece7da)]/70 rounded-xl border border-[var(--a-border-2c3a2d)]/15 p-5 md:p-6 shadow-xs relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[var(--a-bg-a6543d)] text-white font-mono-code text-[11px] uppercase tracking-wider font-semibold shadow-xs">
                  {activePairData.rank == null ? 'RANK NOT CALCULATED' : `RANK #${activePairData.rank} OF ${activePairData.rankTotal} SCREENED`}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--a-bg-d3e5c7)] text-[var(--a-text-2c3a2d)] font-mono-code text-[11px]">
                  {activePairData ? `${activePairData.target.key} (${activePairData.target.domain}) :: ${activePairData.evProtein.key}` : `${currentReceptorRecord.target} :: ${activeEvKey}`}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15 font-mono-code text-[11px] text-[var(--a-text-2c3a2d)]">
                  UniProt: {currentReceptorRecord.uniprot} × {activeEvMeta.uniprot}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--a-bg-2c3a2d)]/10 font-mono-code text-[10px] text-[var(--a-text-2c3a2d)]">
                  {activePairData ? activePairData.structureType : 'NO PDB DATA'}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[var(--a-text-2c3a2d)] font-normal leading-tight">
                {currentReceptorRecord.target} <span className="text-[var(--a-text-a6543d)] font-serif mx-1.5">×</span> {activeEvMeta.name || activeEvKey}
              </h1>
              <p className="text-sm text-[var(--a-text-434842)] leading-relaxed max-w-3xl">
                {activePairData
                  ? (perspective === 'primer' ? activePairData.primerText : activePairData.summary)
                  : `No resultant AlphaFold PDB has been uploaded for this receptor × EV pair. Upload coordinates using the top bar or switch to a converged pair.`}
              </p>
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <div className="w-full lg:max-w-[280px] bg-[var(--surface)] rounded-lg p-4 border border-[var(--a-border-2c3a2d)]/20 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[var(--a-border-2c3a2d)]/10 pb-1.5 text-xs">
                  <span className="font-mono-code uppercase text-[var(--a-text-53634b)] font-semibold">Priority Score</span>
                  <span className="inline-flex items-center gap-1 font-mono-code font-bold">
                    {activePairData.score != null ? (
                      <>
                        <span className="material-symbols-outlined text-[15px] text-[var(--a-text-a6543d)]">verified</span>
                        <span className="text-[var(--a-text-a6543d)]">Computational</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[15px] text-[var(--a-text-d97706)]">file_upload_off</span>
                        <span className="text-[var(--a-text-d97706)]">Not calculated</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl text-[var(--a-text-a6543d)] font-medium leading-none">
                    {activePairData ? formatMetric(activePairData.score, 2) : '—.——'}
                  </span>
                  <span className="font-mono-code text-xs text-[var(--a-text-747872)]">/ 1.00 Composite</span>
                </div>
                <div className="w-full h-2 bg-[var(--a-bg-e5e2d9)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--a-bg-a6543d)] rounded-full transition-all duration-500"
                    style={{ width: `${activePairData ? Math.round(activePairData.score * 100) : 0}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[var(--a-text-53634b)] pt-1">
                  {activePairData
                    ? 'Repository TPS prioritizes experimental validation; it does not establish binding.'
                    : 'Select a converged lead from the Top Leads bar above or matrix below to inspect the 3D model.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 01: REAL INTERACTIVE 3Dmol.js MOLECULAR VIEWER & Multi-Layer Scoring */}
        <section id="interactive-3d-section" className="space-y-4 scroll-mt-24">
          <div className="border-b border-[var(--a-border-2c3a2d)]/15 pb-2 flex items-baseline justify-between">
            <div>
              <span className="font-mono-code text-xs text-[var(--a-text-a6543d)] uppercase tracking-wider font-bold">Section 01</span>
              <h2 className="font-serif text-2xl text-[var(--a-text-2c3a2d)]">Molecular Docking & Multi-Layer Score Breakdown</h2>
            </div>
            <span className="font-mono-code text-xs text-[var(--a-text-747872)] hidden sm:inline">
              {activePairData ? activePairData.dockingEngine : 'MODEL METADATA UNAVAILABLE'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
            {/* Real Interactive 3Dmol.js Molecular Simulation Display Column */}
            <div className="lg:col-span-7 space-y-4 flex flex-col">
              <div className="bg-[var(--a-bg-131713)] text-[var(--a-text-fcf9f0)] rounded-xl overflow-hidden border border-[var(--a-border-2c3a2d)]/30 shadow-md flex flex-col flex-1">
                {/* Viewer Top Metadata Bar with PDB Upload Action */}
                <div className="p-3 px-4 bg-black/75 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[var(--a-text-65cbf3)]">view_in_ar</span>
                    <span className="font-mono-code text-[11px] text-[var(--a-text-b8ccb7)] tracking-wide font-semibold truncate max-w-[280px]">
                      {activePairData.pdbId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-[10px] font-mono-code bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] text-[var(--a-text-fcf9f0)] px-2.5 py-1 rounded border border-white/20 transition-colors flex items-center gap-1 shadow-xs" title="Upload an actual AlphaFold resultant .pdb coordinate file">
                      <span className="material-symbols-outlined text-[12px]">upload_file</span>
                      <span>Upload PDB</span>
                      <input accept=".pdb,.ent" aria-label="Upload PDB" className="sr-only" onChange={handleFileUpload} type="file" />
                    </label>
                    <a
                      className="text-[10px] font-mono-code text-[var(--a-text-fbdfb0)] hover:text-white flex items-center gap-1 bg-white/10 px-2 py-1 rounded border border-white/15 transition-colors"
                      href={`https://alphafold.ebi.ac.uk/entry/${currentReceptorRecord.uniprot.split('/')[0]}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span>AlphaFold DB</span>
                      <span className="material-symbols-outlined text-[11px]">north_east</span>
                    </a>
                    <span className="text-[var(--a-text-a6543d)] font-mono-code text-[11px] font-bold flex items-center gap-1 bg-[var(--a-bg-a6543d)]/15 px-2 py-0.5 rounded border border-[var(--a-border-a6543d)]/30">
                      <span className="w-2 h-2 rounded-full bg-[var(--a-bg-a6543d)] animate-pulse"></span>
                      {structureLabel}
                    </span>
                  </div>
                </div>

                {(uploadError || uploading) && <p role="status" className="p-2 text-xs text-[var(--a-text-fbdfb0)]">{uploadError || 'Reading PDB upload…'}</p>}
                {/* Sub-bar: Dynamic Chain Identifiers & Real Coordinates Count */}
                <div className="p-2.5 px-4 bg-[var(--a-bg-141e15)] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-code">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[var(--a-text-a4baa1)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--a-bg-3e4f3f)] border border-white/60"></span>
                      Chains: {structure?.parsed.chains.map(c=>c.trim()||'blank').join(', ') || 'Unavailable'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--a-text-e09681)]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--a-bg-c77a58)] border border-white/60"></span>
                      Chain roles unverified
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-black/40 text-[var(--a-text-fbdfb0)] border border-[var(--a-border-fbdfb0)]/30">
                    {activePairData ? `Atom coordinates parsed: ${activePairData.atomCountText}` : 'Atom coordinates parsed: 0 atoms'}
                  </span>
                </div>

                {/* Real 3Dmol.js WebGL Viewport Container */}
                <div className="relative w-full bg-[var(--a-bg-0a0f0a)] overflow-hidden flex-1 min-h-[490px]" ref={viewerContainerRef}>
                  <MolecularViewer ref={glviewerRef} structure={structure} representation={representation} highlight={highlight}
                    onStatus={(status,message)=>setRenderState({id:interactionId,status,message})}/>
                  <div className="absolute top-3 right-3 pointer-events-none bg-black/75 text-white/90 font-mono-code text-[10px] px-2.5 py-1.5 rounded border border-white/15 max-w-[220px]">
                    <div>{structureLabel}</div><div>{interactionId}</div>
                    <div>{uploaded ? 'Upload active; backend metrics withheld' : backendStatus==='live' ? 'Scientific metadata: live backend' : backendStatus==='loading' ? 'Checking scientific backend' : 'Scientific metadata: repository snapshot'}</div>
                  </div>
                  {(!structure || rendering.status !== 'ready') && <div role="status" aria-live="polite" className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--a-bg-0e130e)]/95 text-[var(--a-text-fcf9f0)] p-6 text-center gap-2">
                    <h4 className="font-serif text-lg">{structureLabel}</h4>
                    <p className="text-xs max-w-md">{structureError || rendering.message || (structureStatus==='loading' ? 'Loading and validating molecular coordinates…' : 'Loading and validating the molecular model.')}</p>
                    {(structureStatus==='failed' || structureStatus==='unavailable') && <button type="button" onClick={retryStructure} className="px-3 py-1 rounded bg-[var(--a-bg-2c3a2d)] text-white text-xs border border-white/20">Retry structure</button>}
                  </div>}
                  <div className="absolute bottom-2 inset-x-3 pointer-events-none text-[10px] font-mono-code text-white/70 flex flex-wrap justify-between gap-1">
                    <span>Drag: Rotate · Scroll / Pinch: Zoom · Right Drag: Pan</span>
                    <span>{representation==='surface' && (structure?.parsed.atomCount || 0)>SURFACE_ATOM_LIMIT ? 'Large structure: backbone shown to keep interaction responsive' : rendering.message || (structure ? 'Coordinate parsing does not validate binding geometry' : '')}</span>
                  </div>
                </div>

                {/* Real 3Dmol.js Interactive Controls Toolbar */}
                <div className="p-2.5 px-4 bg-black/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono-code">
                  {/* Camera & View Controls */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/50 text-[10px] mr-1 hidden sm:inline">CAMERA:</span>
                    <button
                      className="px-2.5 py-1 rounded text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 cursor-pointer"
                      onClick={handleResetCamera}
                      title="Reset Camera Rotation"
                    >
                      <span className="material-symbols-outlined text-[13px]">restart_alt</span> Reset View
                    </button>
                    <button
                      className="px-2.5 py-1 rounded text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1 cursor-pointer"
                      onClick={handleCenterCamera}
                      title="Center & Fit Structure"
                    >
                      <span className="material-symbols-outlined text-[13px]">filter_center_focus</span> Fit / Center
                    </button>
                    <button
                      className="px-2 py-1 rounded text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      onClick={() => handleZoom(1.2)}
                      title="Zoom In"
                    >
                      Zoom +
                    </button>
                    <button
                      className="px-2 py-1 rounded text-[11px] bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      onClick={() => handleZoom(0.8)}
                      title="Zoom Out"
                    >
                      Zoom −
                    </button>
                  </div>

                  {/* Representation Switcher (Calls Real 3Dmol Methods) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/50 text-[10px] mr-1">ACTIVE REPRESENTATION:</span>
                    <button
                      className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                        representation === 'cartoon'
                          ? 'bg-[var(--a-bg-a6543d)] text-white font-semibold shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                      }`}
                      onClick={() => handleSetRepresentation('cartoon')}
                    >
                      Cartoon / Ribbon
                    </button>
                    <button
                      className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                        representation === 'surface'
                          ? 'bg-[var(--a-bg-a6543d)] text-white font-semibold shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                      }`}
                      onClick={() => handleSetRepresentation('surface')}
                    >
                      Surface
                    </button>
                    <button
                      className={`px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer ${
                        representation === 'stick'
                          ? 'bg-[var(--a-bg-a6543d)] text-white font-semibold shadow-xs'
                          : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                      }`}
                      onClick={() => handleSetRepresentation('stick')}
                    >
                      Ball & Stick
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Scores, Interpretation & Primary Structure Panel */}
            <div className="lg:col-span-5 space-y-4">
              {/* Multi-Layer Biophysical Assessment */}
              <div className="bg-[var(--a-bg-f6f4ea)] rounded-xl border border-[var(--a-border-2c3a2d)]/15 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--a-border-2c3a2d)]/10">
                  <div>
                    <h3 className="font-serif text-lg text-[var(--a-text-2c3a2d)] font-semibold">Multi-Layer Biophysical Assessment</h3>
                    <p className="text-xs text-[var(--a-text-434842)]">Locked EXO-RANK values; biological feasibility is a separate categorical gate.</p>
                  </div>
                  <span className="font-mono-code text-xs text-[var(--a-text-2c3a2d)] px-2 py-0.5 rounded bg-[var(--a-bg-ece7da)] font-bold border border-[var(--a-border-2c3a2d)]/10">N=4 Layers</span>
                </div>

                {/* Layer 1 */}
                <div className="bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--a-border-2c3a2d)]/10 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--a-text-2c3a2d)]">1. Structural Confidence</span>
                      <p className="text-[11px] text-[var(--a-text-53634b)]">
                        {activePairData ? `Interface predicted TM-score: ${formatMetric(activePairData.ipTM, 2)}. pDockQ2: Not calculated.` : 'Awaiting 3D coordinates'}
                      </p>
                    </div>
                    <span className="font-mono-code text-sm font-bold text-[var(--a-text-2c3a2d)]">
                      {activePairData ? formatMetric(activePairData.ipTM, 2) : '—.——'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--a-bg-ebe8df)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--a-bg-2c3a2d)] rounded-full transition-all duration-500"
                      style={{ width: `${activePairData ? Math.round(activePairData.ipTM * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Layer 2 */}
                <div className="bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--a-border-2c3a2d)]/10 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--a-text-2c3a2d)]">2. Binding Affinity & Energetics</span>
                      <p className="text-[11px] text-[var(--a-text-53634b)]">
                        {activePairData ? `Free energy of binding (ΔG: ${formatMetric(activePairData.deltaG, 1)} kcal/mol) with ${formatMetric(activePairData.kd)} nM Kd.` : 'Awaiting 3D coordinates'}
                      </p>
                    </div>
                    <span className="font-mono-code text-sm font-bold text-[var(--a-text-a6543d)]">
                      {activePairData ? formatMetric(activePairData.affinityScore) : '—.——'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--a-bg-ebe8df)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--a-bg-a6543d)] rounded-full transition-all duration-500"
                      style={{ width: `${activePairData ? Math.round((activePairData.affinityScore ?? 0) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Layer 3 */}
                <div className="bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--a-border-2c3a2d)]/10 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--a-text-2c3a2d)]">3. Literature & Co-Expression</span>
                      <p className="text-[11px] text-[var(--a-text-53634b)]">
                        {activePairData ? `STRING prior biological/network association (${formatMetric(activePairData.literature, 2)}).` : 'Awaiting interactome scoring'}
                      </p>
                    </div>
                    <span className="font-mono-code text-sm font-bold text-[var(--a-text-53634b)]">
                      {activePairData ? formatMetric(activePairData.literature, 2) : '—.——'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--a-bg-ebe8df)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--a-bg-53634b)] rounded-full transition-all duration-500"
                      style={{ width: `${activePairData ? Math.round(activePairData.literature * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Layer 4 */}
                <div className="bg-[var(--surface)] p-3.5 rounded-lg border border-[var(--a-border-2c3a2d)]/10 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-[var(--a-text-2c3a2d)]">4. Biological EV Compatibility</span>
                      <p className="text-[11px] text-[var(--a-text-53634b)]">
                        Topology: {activePairData ? activePairData.evProtein.topology : activeEvMeta.topology} (surface presentation requires validation).
                      </p>
                    </div>
                    <span className="font-mono-code text-sm font-bold text-[var(--a-text-2c3a2d)]">
                      {activePairData.biology}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--a-bg-ebe8df)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--a-bg-2c3a2d)] rounded-full transition-all duration-500"
                      style={{ width: `${activePairData ? Math.round(activePairData.bioCompat * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Biocomputation Mode Interpretation Card */}
              <div className="p-4 bg-[var(--a-bg-ece7da)] rounded-xl border-l-4 border-[var(--a-border-2c3a2d)] border border-[var(--a-border-2c3a2d)]/10 shadow-xs">
                <div className="flex items-center gap-2 text-[var(--a-text-2c3a2d)] font-mono-code text-xs font-bold uppercase tracking-wider mb-1.5">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                  <span>{perspective === 'primer' ? 'PRIMER MODE' : 'BIOCOMPUTATION MODE'}: {currentReceptorRecord.target.split('/')[0].trim()} × {activeEvKey}</span>
                </div>
                <p className="text-xs text-[var(--a-text-1c1c16)] leading-relaxed">
                  {activePairData
                    ? (perspective === 'primer' ? activePairData.primerText : activePairData.interpretation)
                    : `Biophysical scoring and 3D molecular coordinates will render once an AlphaFold resultant PDB file is uploaded or selected from the validated cohort.`}
                </p>
              </div>

              {/* PRODIGY Interface Composition — real values from PRODIGY INFO.xlsx (via backend) */}
              <div className="bg-[var(--a-bg-f6f4ea)] rounded-xl border border-[var(--a-border-2c3a2d)]/15 overflow-hidden shadow-xs">
                <div className="p-3.5 px-4 bg-[var(--a-bg-ece7da)]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--a-text-2c3a2d)] text-[20px]">hub</span>
                    <div>
                      <span className="font-mono-code text-[10px] text-[var(--a-text-a6543d)] uppercase tracking-widest font-bold block leading-tight">
                        PRODIGY · Interface Composition
                      </span>
                      <h3 className="font-serif text-base text-[var(--a-text-2c3a2d)] font-semibold">Intermolecular Contacts &amp; NIS Residues</h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-code text-[var(--a-text-53634b)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15">
                    {backendData?.prodigy?.available
                      ? `Total contacts: ${backendData.prodigy.intermolecular_contacts ?? '—'}`
                      : 'Not available'}
                  </span>
                </div>

                {backendData?.prodigy?.available ? (
                  <div className="p-4 border-t border-[var(--a-border-2c3a2d)]/10">
                    <div className="text-[10px] font-mono-code text-[var(--a-text-747872)] uppercase tracking-wide mb-2">Contact types (count)</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {([
                        ['Charged–charged', backendData.prodigy.contacts.charged_charged],
                        ['Charged–polar', backendData.prodigy.contacts.charged_polar],
                        ['Charged–apolar', backendData.prodigy.contacts.charged_apolar],
                        ['Polar–polar', backendData.prodigy.contacts.polar_polar],
                        ['Apolar–polar', backendData.prodigy.contacts.apolar_polar],
                        ['Apolar–apolar', backendData.prodigy.contacts.apolar_apolar],
                      ] as [string, number | null][]).map(([label, val]) => (
                        <div key={label} className="bg-[var(--surface)] rounded-lg border border-[var(--a-border-2c3a2d)]/10 px-3 py-2">
                          <div className="text-[10px] font-mono-code text-[var(--a-text-747872)] uppercase tracking-wide">{label}</div>
                          <div className="text-lg font-serif text-[var(--a-text-2c3a2d)] font-semibold">{val ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] font-mono-code text-[var(--a-text-747872)] uppercase tracking-wide mb-2 mt-4">Non-Interacting Surface (NIS)</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-[var(--surface)] rounded-lg border border-[var(--a-border-2c3a2d)]/10 px-3 py-2">
                        <div className="text-[10px] font-mono-code text-[var(--a-text-747872)] uppercase tracking-wide">% Apolar NIS residues</div>
                        <div className="text-lg font-serif text-[var(--a-text-2c3a2d)] font-semibold">{backendData.prodigy.NIS.apolar ?? '—'}</div>
                      </div>
                      <div className="bg-[var(--surface)] rounded-lg border border-[var(--a-border-2c3a2d)]/10 px-3 py-2">
                        <div className="text-[10px] font-mono-code text-[var(--a-text-747872)] uppercase tracking-wide">% Charged NIS residues</div>
                        <div className="text-lg font-serif text-[var(--a-text-2c3a2d)] font-semibold">{backendData.prodigy.NIS.charged ?? '—'}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--a-text-747872)] mt-3">
                      Source: <span className="font-mono-code">PRODIGY INFO.xlsx</span> · predicted interface contact composition &amp; non-interacting-surface residues. Predicted, not experimental affinity.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border-t border-[var(--a-border-2c3a2d)]/10 text-xs text-[var(--a-text-747872)]">
                    PRODIGY contact / NIS data is not available for these coordinates. Uploads do not inherit the repository model’s calculated metrics.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Protein Sequence — full width directly below the 3D viewer */}
          <div className="w-full">
              {/* Primary Structure & Contacts / Protein Sequence Panel */}
              <div className="bg-[var(--a-bg-f6f4ea)] rounded-xl border border-[var(--a-border-2c3a2d)]/15 overflow-hidden shadow-xs">
                <div
                  role="button" tabIndex={0} aria-expanded={seqOpen} onKeyDown={event=>{if(event.key==='Enter' || event.key===' '){event.preventDefault();setSeqOpen(!seqOpen);}}}
                  className="p-3.5 px-4 flex items-center justify-between cursor-pointer select-none bg-[var(--a-bg-ece7da)]/60 hover:bg-[var(--a-bg-ece7da)] transition-colors"
                  onClick={() => setSeqOpen(!seqOpen)}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--a-text-2c3a2d)] text-[20px] transition-transform duration-200">
                      {seqOpen ? 'expand_less' : 'expand_more'}
                    </span>
                    <div>
                      <span className="font-mono-code text-[10px] text-[var(--a-text-a6543d)] uppercase tracking-widest font-bold block leading-tight">
                        Primary Structure & Contacts
                      </span>
                      <h3 className="font-serif text-base text-[var(--a-text-2c3a2d)] font-semibold">Protein Sequence</h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono-code text-[var(--a-text-53634b)] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15">
                    {`Chain ${seqChain.trim() || 'blank'}: ${structure?.parsed.residues[seqChain]?.length || 0} resolved residues`}
                  </span>
                </div>

                {seqOpen && (
                  <div className="p-4 border-t border-[var(--a-border-2c3a2d)]/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[var(--a-border-2c3a2d)]/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-[var(--a-text-747872)] uppercase text-[11px] font-semibold">Select chain:</span>
                        <div className="flex flex-wrap items-center gap-1">
                          {structure?.parsed.chains.map(chain=><button key={chain} onClick={()=>setSeqChain(chain)} aria-pressed={seqChain===chain} className={`px-2.5 py-1 rounded text-xs font-mono-code ${seqChain===chain ? 'bg-[var(--a-bg-2c3a2d)] text-white' : 'bg-[var(--surface)] text-[var(--a-text-53634b)]'}`}>Chain {chain.trim()||'blank'}</button>)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const residues=structure?.parsed.residues[seqChain];
                          if(!residues?.length)return;
                          try { await navigator.clipboard.writeText(`>Coordinates ${interactionId} chain ${seqChain.trim()||'blank'}; identity unverified\n${residues.map(r=>r.letter).join('')}`);setCopied(true); }
                          catch {setActionError('Clipboard unavailable. Select the sequence to copy it manually.');}
                        }}
                        className="px-2.5 py-1 rounded text-xs font-mono-code font-semibold bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/20 text-[var(--a-text-2c3a2d)] hover:bg-[var(--a-bg-ece7da)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        title="Copy FASTA Sequence to Clipboard"
                      >
                        <span className="material-symbols-outlined text-[14px] text-[var(--a-text-a6543d)]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                        <span>{copied ? 'Copied FASTA' : 'Copy FASTA'}</span>
                      </button>
                    </div>

                    <div className="bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15 rounded-lg p-3 overflow-x-auto max-h-[130px] overflow-y-auto">
                      <div className="font-mono-code text-xs leading-relaxed text-[var(--a-text-1c1c16)] select-text">
                        {renderFormattedSequence()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono-code text-[var(--a-text-747872)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-[var(--a-bg-a6543d)]/25 border border-[var(--a-border-a6543d)] inline-block"></span>
                        <span>
                          Selected coordinate residue:{' '}
                          <span className="text-[var(--a-text-a6543d)] font-bold">
                            {highlight ? `${highlight.chain.trim()||'blank'}:${highlight.residue}` : 'None selected; interface contacts not calculated'}
                          </span>
                        </span>
                      </span>
                      <span>
                        Sequence is derived from resolved ATOM records; chain identity is unverified.
                      </span>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </section>

        {/* SECTION 02: Strengths & Pre-Clinical Caveats */}
        <section className="space-y-4">
          <div className="border-b border-[var(--a-border-2c3a2d)]/15 pb-2">
            <span className="font-mono-code text-xs text-[var(--a-text-a6543d)] uppercase tracking-wider font-bold">Section 02</span>
            <h2 className="font-serif text-2xl text-[var(--a-text-2c3a2d)]">Analytical Synthesis & Pre-Clinical Caveats</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-[var(--a-bg-f6f4ea)] p-5 rounded-xl border border-[var(--a-border-2c3a2d)]/15 space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--a-border-2c3a2d)]/10 pb-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--a-text-2c3a2d)]">verified</span>
                <h3 className="font-serif text-base text-[var(--a-text-2c3a2d)] font-semibold">Why This Candidate? (Computational Strengths)</h3>
              </div>
              <div className="space-y-3">
                {activePairData ? (
                  activePairData.strengths.map((s, idx) => (
                    <div key={idx} className="text-xs border-l-2 border-[var(--a-border-2c3a2d)]/30 pl-3 py-0.5 space-y-0.5">
                      <strong className="text-[var(--a-text-2c3a2d)] block font-semibold">{s.title}</strong>
                      <p className="text-[var(--a-text-434842)] leading-relaxed">{s.desc}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs border-l-2 border-[var(--a-border-747872)] pl-3 py-1 text-[var(--a-text-747872)]">
                    Biophysical scoring and 3D molecular coordinates will render once an AlphaFold resultant PDB file is uploaded or selected from the validated cohort.
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 bg-[var(--a-bg-a6543d)]/5 p-5 rounded-xl border-2 border-[var(--a-border-a6543d)]/30 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 border-b border-[var(--a-border-a6543d)]/20 pb-2 text-[var(--a-text-a6543d)]">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <h3 className="font-serif text-base font-semibold">Pre-Clinical Caveats & Requirements</h3>
                </div>
                <p className="text-xs text-[var(--a-text-1c1c16)] mt-2 leading-relaxed">
                  Predictions are computational. Wet-lab confirmation is mandatory before in vivo deployment:
                </p>
                <ul className="space-y-2 text-xs text-[var(--a-text-434842)] mt-2">
                  {activePairData ? (
                    activePairData.caveats.map((c, idx) => (
                      <li key={idx} className="border-l-2 border-[var(--a-border-a6543d)]/30 pl-2.5 py-0.5">
                        <strong className="text-[var(--a-text-a6543d)] block font-semibold">{c.title}:</strong>
                        <span className="leading-relaxed">{c.desc}</span>
                      </li>
                    ))
                  ) : (
                    <li className="border-l-2 border-[var(--a-border-d97706)] pl-2.5 py-0.5 text-xs text-[var(--a-text-53634b)]">
                      Awaiting 3D coordinates. Step 3 Negative Controls ({currentReceptorRecord.groupB.join(', ')}) confirmed and active.
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-2 border-t border-[var(--a-border-a6543d)]/20 bg-[var(--a-bg-a6543d)]/5 -mx-5 -mb-5 p-4 rounded-b-xl">
                <span className="font-mono-code text-[10px] text-[var(--a-text-a6543d)] uppercase font-bold block">Mandatory Milestone</span>
                <p className="text-xs text-[var(--a-text-434842)] mt-0.5">
                  {activePairData ? activePairData.milestone : 'Select a converged lead from the Top Leads bar above or matrix below to inspect the 3D model.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 03: Group A EV Scaffold Comparative Analysis */}
        <section id="ev-scaffold-comparison" className="space-y-6 pt-2">
          <div className="border-b border-[var(--a-border-2c3a2d)]/15 pb-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <span className="font-mono-code text-xs text-[var(--a-text-a6543d)] uppercase tracking-wider font-bold">Section 03</span>
              <h2 className="font-serif text-2xl text-[var(--a-text-2c3a2d)]">
                Group A EV Scaffold Comparative Analysis for {currentReceptorRecord.target}
              </h2>
              <p className="text-xs text-[var(--a-text-53634b)] mt-1 max-w-2xl font-serif">
                Direct in silico biophysical benchmarking comparing the current active lead <strong>{activeEvKey}</strong> against other prioritized exosomal scaffolds curated for {currentReceptorRecord.target} ({currentReceptorRecord.uniprot}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--a-border-2c3a2d)]/20 p-0.5 bg-[var(--a-bg-f6f4ea)] text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => setCompareTab('1v1')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-bold ${
                    compareTab === '1v1'
                      ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] shadow-xs'
                      : 'text-[var(--a-text-53634b)] hover:text-[var(--a-text-2c3a2d)]'
                  }`}
                >
                  Head-to-Head 1v1
                </button>
                <button
                  type="button"
                  onClick={() => setCompareTab('matrix')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer font-bold ${
                    compareTab === 'matrix'
                      ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] shadow-xs'
                      : 'text-[var(--a-text-53634b)] hover:text-[var(--a-text-2c3a2d)]'
                  }`}
                >
                  Group A Matrix ({currentReceptorRecord.groupA.length})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Scaffold Selector Pills */}
          <div className="bg-[var(--a-bg-f6f4ea)] border border-[var(--a-border-2c3a2d)]/15 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-53634b)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[var(--a-text-a6543d)]">tune</span>
                SELECT COMPARISON CANDIDATE:
              </span>
              <span className="text-[11px] font-mono-code text-[var(--a-text-747872)]">
                Target: {currentReceptorRecord.target} ({currentReceptorRecord.uniprot})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentReceptorRecord.groupA.map((sym) => {
                const cat = EV_CATALOG[sym];
                const isCurrentActive = sym === activeEvKey;
                const isSelectedCompare = sym === compareEvKey && !isCurrentActive;
                const rec = getPairProfile(currentReceptorRecord, sym);

                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      if (!isCurrentActive) {
                        setCompareEvKey(sym);
                        setCompareTab('1v1');
                      }
                    }}
                    className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isCurrentActive
                        ? 'bg-[var(--a-bg-a6543d)]/15 border-[var(--a-border-a6543d)] text-[var(--a-text-2c3a2d)] ring-1 ring-[var(--a-ring-a6543d)]/40'
                        : isSelectedCompare
                        ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] border-[var(--a-border-2c3a2d)] shadow-xs'
                        : 'bg-[var(--surface)] hover:bg-[var(--a-bg-ece7da)]/60 border-[var(--a-border-2c3a2d)]/20 text-[var(--a-text-2c3a2d)]'
                    }`}
                  >
                    <span className="font-mono-code text-xs font-bold">{sym}</span>
                    <span className={`text-[11px] truncate max-w-[120px] ${isSelectedCompare ? 'text-[var(--a-text-e5e3d7)]' : 'text-[var(--a-text-747872)]'}`}>
                      {cat?.name || sym}
                    </span>
                    <span
                      className={`font-mono-code text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isCurrentActive
                          ? 'bg-[var(--a-bg-a6543d)] text-white'
                          : isSelectedCompare
                          ? 'bg-white/20 text-[var(--a-text-fcf9f0)]'
                          : 'bg-[var(--a-bg-ece7da)] text-[var(--a-text-2c3a2d)]'
                      }`}
                    >
                      {isCurrentActive ? 'ACTIVE LEAD' : isSelectedCompare ? 'COMPARING' : `Score ${formatMetric(rec.score, 2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Head-to-Head 1v1 Comparison Cards */}
          {compareTab === '1v1' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Active Scaffold Card */}
              <div className="bg-[var(--surface)] rounded-xl border-2 border-[var(--a-border-a6543d)]/40 p-5 md:p-6 shadow-sm space-y-5 relative">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--a-border-2c3a2d)]/10 pb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--a-bg-a6543d)] text-white font-mono-code text-[11px] font-bold uppercase tracking-wider mb-2">
                      <span className="material-symbols-outlined text-[13px]">view_in_ar</span>
                      SELECTED RECEPTOR–SCAFFOLD PAIR
                    </div>
                    <h3 className="font-serif text-2xl text-[var(--a-text-2c3a2d)] flex items-center gap-2">
                      <span>{activePairData.evProtein.name}</span>
                      <span className="font-mono-code text-sm font-bold text-[var(--a-text-a6543d)]">({activePairData.evProtein.key})</span>
                    </h3>
                    <p className="font-mono-code text-xs text-[var(--a-text-53634b)] mt-1">
                      UniProt: {activePairData.evProtein.uniprot} · Gene: {activePairData.evProtein.gene} · {activePairData.evProtein.topology}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-code text-[10px] uppercase text-[var(--a-text-747872)] block">Composite Score</span>
                    <span className="font-serif text-3xl font-bold text-[var(--a-text-a6543d)]">{formatMetric(activePairData.score, 2)}</span>
                    <span className="block font-mono-code text-[10px] text-[var(--a-text-53634b)] uppercase font-bold">{activePairData.tier}</span>
                  </div>
                </div>

                {/* Biophysical Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Binding Free Energy</span>
                    <span className="font-mono-code text-base font-bold text-[var(--a-text-a6543d)]">{formatMetric(activePairData.deltaG, 1)} kcal/mol</span>
                  </div>
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Dissociation Constant (Kd)</span>
                    <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.kd)} nM</span>
                  </div>
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Interface Confidence (ipTM)</span>
                    <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.ipTM, 2)}</span>
                  </div>
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Buried Interface Area</span>
                    <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.interfaceArea, 0)} Å²</span>
                  </div>
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Contacts (H-Bonds / Salt)</span>
                    <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{activePairData.hbonds} / {activePairData.saltBridges}</span>
                  </div>
                  <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Vesicle Topology</span>
                    <span className="font-mono-code text-xs font-bold text-[var(--a-text-2c3a2d)] truncate block" title={activePairData.evProtein.topology}>
                      {activePairData.evProtein.topology}
                    </span>
                  </div>
                </div>

                {/* Structural Summary */}
                <div className="space-y-2 bg-[var(--a-bg-fcf9f0)] p-4 rounded-xl border border-[var(--a-border-2c3a2d)]/10">
                  <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-2c3a2d)] block">Structural Orientation & Rationale:</span>
                  <p className="text-xs text-[var(--a-text-434842)] leading-relaxed font-serif">
                    {activePairData.summary}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-mono-code text-[var(--a-text-747872)] flex items-center justify-between">
                    <span>Contact Residues: {activePairData.contactResidueCount} positions</span>
                    <span>Mass: {activePairData.evProtein.mass}</span>
                  </div>
                </div>
              </div>

              {/* Comparative Scaffold Card */}
              <div className="bg-[var(--surface)] rounded-xl border-2 border-[var(--a-border-2c3a2d)]/30 p-5 md:p-6 shadow-sm space-y-5 relative flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--a-border-2c3a2d)]/10 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] font-mono-code text-[11px] font-bold uppercase tracking-wider mb-2">
                        <span className="material-symbols-outlined text-[13px]">compare</span>
                        COMPARATIVE BENCHMARK CANDIDATE
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={comparePairData.evProtein.key}
                          onChange={(e) => setCompareEvKey(e.target.value)}
                          className="font-serif text-xl font-bold text-[var(--a-text-2c3a2d)] bg-[var(--a-bg-f6f4ea)] border border-[var(--a-border-2c3a2d)]/20 rounded-lg px-2.5 py-1 cursor-pointer"
                        >
                          {currentReceptorRecord.groupA
                            .filter((k) => k !== activeEvKey)
                            .map((sym) => {
                              const cat = EV_CATALOG[sym];
                              return (
                                <option key={sym} value={sym}>
                                  {cat?.name || sym} ({sym})
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <p className="font-mono-code text-xs text-[var(--a-text-53634b)]">
                        UniProt: {comparePairData.evProtein.uniprot} · Gene: {comparePairData.evProtein.gene} · {comparePairData.evProtein.topology}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono-code text-[10px] uppercase text-[var(--a-text-747872)] block">Composite Score</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-serif text-3xl font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.score, 2)}</span>
                        {(() => {
                          if(comparePairData.score == null || activePairData.score == null) return null;
                          const diff = comparePairData.score - activePairData.score;
                          if (Math.abs(diff) < 0.005) return null;
                          const isBetter = diff > 0;
                          return (
                            <span
                              className={`text-[11px] font-mono-code font-bold px-1 py-0.5 rounded ${
                                isBetter ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isBetter ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="block font-mono-code text-[10px] text-[var(--a-text-53634b)] uppercase font-bold">{comparePairData.tier}</span>
                    </div>
                  </div>

                  {/* Comparative Biophysical Metrics Grid with Differential Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Binding Free Energy</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.deltaG, 1)} kcal</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono-code font-bold block mt-1 ${
                          comparePairData.deltaG < activePairData.deltaG
                            ? 'text-emerald-700'
                            : comparePairData.deltaG > activePairData.deltaG
                            ? 'text-amber-800'
                            : 'text-[var(--a-text-747872)]'
                        }`}
                      >
                        {comparePairData.deltaG == null || activePairData.deltaG == null ? 'Not calculated' : comparePairData.deltaG < activePairData.deltaG ? `ΔΔG = ${metricDelta(comparePairData.deltaG,activePairData.deltaG,1)} (more negative prediction)`
                          : comparePairData.deltaG > activePairData.deltaG
                          ? `ΔΔG = +${metricDelta(comparePairData.deltaG,activePairData.deltaG,1)} (less negative prediction)`
                          : 'Equal ΔG'}
                      </span>
                    </div>

                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Dissociation Constant (Kd)</span>
                      <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.kd)} nM</span>
                      <span className="text-[10px] font-mono-code text-[var(--a-text-747872)] block mt-1">
                        {comparePairData.kd == null || activePairData.kd == null ? 'Not calculated' : comparePairData.kd < activePairData.kd ? `${(activePairData.kd / comparePairData.kd).toFixed(1)}× lower predicted Kd`
                          : `${(comparePairData.kd / activePairData.kd).toFixed(1)}× higher predicted Kd`}
                      </span>
                    </div>

                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Interface Confidence (ipTM)</span>
                      <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.ipTM, 2)}</span>
                      <span
                        className={`text-[10px] font-mono-code font-bold block mt-1 ${
                          comparePairData.ipTM >= activePairData.ipTM ? 'text-emerald-700' : 'text-amber-800'
                        }`}
                      >
                        {comparePairData.ipTM == null || activePairData.ipTM == null ? 'Not calculated' : comparePairData.ipTM - activePairData.ipTM >= 0
                          ? `+${metricDelta(comparePairData.ipTM,activePairData.ipTM,2)} ipTM`
                          : `${metricDelta(comparePairData.ipTM,activePairData.ipTM,2)} ipTM`}
                      </span>
                    </div>

                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Buried Interface Area</span>
                      <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.interfaceArea, 0)} Å²</span>
                      <span className="text-[10px] font-mono-code text-[var(--a-text-747872)] block mt-1">

                        {metricDelta(comparePairData.interfaceArea,activePairData.interfaceArea)} Å²
                      </span>
                    </div>

                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Contacts (H-Bonds / Salt)</span>
                      <span className="font-mono-code text-base font-bold text-[var(--a-text-2c3a2d)]">{comparePairData.hbonds} / {comparePairData.saltBridges}</span>
                      <span className="text-[10px] font-mono-code text-[var(--a-text-747872)] block mt-1">
                        vs {activePairData.hbonds} / {activePairData.saltBridges}
                      </span>
                    </div>

                    <div className="bg-[var(--a-bg-f6f4ea)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Vesicle Topology</span>
                      <span className="font-mono-code text-xs font-bold text-[var(--a-text-2c3a2d)] truncate block" title={comparePairData.evProtein.topology}>
                        {comparePairData.evProtein.topology}
                      </span>
                      <span className="text-[10px] font-mono-code text-[var(--a-text-747872)] block mt-1">
                        Mass: {comparePairData.evProtein.mass}
                      </span>
                    </div>
                  </div>

                  {/* Structural Summary */}
                  <div className="space-y-2 bg-[var(--a-bg-fcf9f0)] p-4 rounded-xl border border-[var(--a-border-2c3a2d)]/10">
                    <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-2c3a2d)] block">Structural Orientation & Rationale:</span>
                    <p className="text-xs text-[var(--a-text-434842)] leading-relaxed font-serif">
                      {comparePairData.summary}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button: Switch Active Lead to This Scaffold */}
                <div className="pt-3 border-t border-[var(--a-border-2c3a2d)]/10">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectEv(comparePairData.evProtein.key);
                      // Scroll to viewer smoothly
                      const viewerEl = document.getElementById('interactive-3d-section');
                      if (viewerEl) {
                        viewerEl.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] active:bg-[var(--a-bg-202b21)] text-[var(--a-text-fcf9f0)] font-mono-code text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[17px]">swap_horiz</span>
                    <span>Set {comparePairData.evProtein.key} as Primary 3D Lead Complex</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Complete Group A Benchmarking Matrix for Current Receptor */}
          {compareTab === 'matrix' && (
            <div className="overflow-x-auto rounded-xl border border-[var(--a-border-2c3a2d)]/15 bg-[var(--surface)] shadow-xs">
              <table className="w-full text-left border-collapse text-xs font-mono-code">
                <thead>
                  <tr className="border-b border-[var(--a-border-2c3a2d)]/15 bg-[var(--a-bg-ece7da)]/70 text-[var(--a-text-53634b)] uppercase">
                    <th className="py-3 px-4 font-semibold">Curated EV Scaffold</th>
                    <th className="py-3 px-4 font-semibold">Gene & UniProt</th>
                    <th className="py-3 px-4 font-semibold">Membrane Topology</th>
                    <th className="py-3 px-4 font-semibold text-right">ipTM</th>
                    <th className="py-3 px-4 font-semibold text-right">ΔG (Affinity)</th>
                    <th className="py-3 px-4 font-semibold text-right">Kd (nM)</th>
                    <th className="py-3 px-4 font-semibold text-right">Buried Area</th>
                    <th className="py-3 px-4 font-semibold text-right">Score</th>
                    <th className="py-3 px-4 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--a-divide-2c3a2d)]/5">
                  {currentReceptorRecord.groupA.map((sym) => {
                    const cat = EV_CATALOG[sym];
                    const rec = getPairProfile(currentReceptorRecord, sym);
                    const isAct = sym === activeEvKey;
                    const isCompare = sym === compareEvKey && !isAct;

                    return (
                      <tr
                        key={sym}
                        className={`hover:bg-[var(--a-bg-f6f4ea)] transition-colors ${
                          isAct ? 'bg-[var(--a-bg-a6543d)]/10 font-semibold' : isCompare ? 'bg-[var(--a-bg-ece7da)]/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAct ? 'bg-[var(--a-bg-a6543d)]' : isCompare ? 'bg-[var(--a-bg-2c3a2d)]' : 'bg-[var(--a-bg-2c3a2d)]/20'
                              }`}
                            ></span>
                            <div>
                              <span className={`font-bold ${isAct ? 'text-[var(--a-text-a6543d)]' : 'text-[var(--a-text-2c3a2d)]'}`}>
                                {cat?.name || sym}
                              </span>
                              <span className="block text-[11px] text-[var(--a-text-747872)]">Symbol: {sym}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--a-text-53634b)]">
                          <span>{cat?.gene || sym}</span> · <span className="underline">{cat?.uniprot || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4 text-[var(--a-text-434842)]">
                          <span className="px-1.5 py-0.5 rounded bg-[var(--a-bg-ece7da)] text-[11px] font-medium">
                            {cat?.topology || 'Exosomal Surface'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">{formatMetric(rec.ipTM, 2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--a-text-a6543d)]">
                          {formatMetric(rec.deltaG, 1)} kcal
                        </td>
                        <td className="py-3 px-4 text-right">{formatMetric(rec.kd)} nM</td>
                        <td className="py-3 px-4 text-right">{formatMetric(rec.interfaceArea, 0)} Å²</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-bold ${isAct ? 'text-[var(--a-text-a6543d)]' : 'text-[var(--a-text-2c3a2d)]'}`}>
                            {formatMetric(rec.score, 2)}
                          </span>
                          <span className="block text-[10px] text-[var(--a-text-747872)]">{rec.tier}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isAct ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--a-bg-a6543d)] text-white text-[10px] font-mono-code font-bold uppercase tracking-wider">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              SELECTED
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCompareEvKey(sym);
                                  setCompareTab('1v1');
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-mono-code font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  isCompare
                                    ? 'bg-[var(--a-bg-2c3a2d)] text-white shadow-xs'
                                    : 'border border-[var(--a-border-2c3a2d)]/30 text-[var(--a-text-2c3a2d)] hover:bg-[var(--a-bg-ece7da)]'
                                }`}
                              >
                                {isCompare ? 'IN 1v1' : 'COMPARE'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectEv(sym)}
                                className="px-2.5 py-1 rounded bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] text-[var(--a-text-fcf9f0)] text-[10px] font-mono-code font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                LOAD 3D
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 04: Cohort Benchmarking Table (Global Registry) */}
        <section className="space-y-4">
          <div className="border-b border-[var(--a-border-2c3a2d)]/15 pb-2 flex items-baseline justify-between">
            <div>
              <span className="font-mono-code text-xs text-[var(--a-text-a6543d)] uppercase tracking-wider font-bold">Section 04</span>
              <h2 className="font-serif text-2xl text-[var(--a-text-2c3a2d)]">Cross-Receptor Heterodimer Benchmark Cohort</h2>
            </div>
            <span className="font-mono-code text-xs text-[var(--a-text-747872)]">CLICK ROW TO LOAD 3D STRUCTURE</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--a-border-2c3a2d)]/15 bg-[var(--surface)] shadow-xs">
            <table className="w-full text-left border-collapse text-xs font-mono-code">
              <thead>
                <tr className="border-b border-[var(--a-border-2c3a2d)]/15 bg-[var(--a-bg-ece7da)]/70 text-[var(--a-text-53634b)] uppercase">
                  <th className="py-3 px-4 font-semibold">Heterodimer Pair</th>
                  <th className="py-3 px-4 font-semibold">Target Receptor (Group C)</th>
                  <th className="py-3 px-4 font-semibold">Curated Exosome Scaffold (Group A)</th>
                  <th className="py-3 px-4 font-semibold text-right">ipTM</th>
                  <th className="py-3 px-4 font-semibold text-right">ΔG</th>
                  <th className="py-3 px-4 font-semibold text-right">Bio-Compat</th>
                  <th className="py-3 px-4 font-semibold text-right">Priority</th>
                  <th className="py-3 px-4 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--a-divide-2c3a2d)]/5">
                {Object.keys(registry).map((key) => {
                  const row = registry[key];
                  const isAct = key === currentPairLookupKey;
                  return (
                    <tr
                      key={key}
                      onClick={() => handleLoadPair(row.receptorString, row.evKey)}
                      tabIndex={0} onKeyDown={event=>{if(event.key==='Enter')handleLoadPair(row.receptorString,row.evKey);}}
                      className={`hover:bg-[var(--a-bg-f6f4ea)] transition-colors cursor-pointer ${
                        isAct ? 'bg-[var(--a-bg-ece7da)]/60 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAct ? 'bg-[var(--a-bg-a6543d)]' : 'bg-[var(--a-bg-2c3a2d)]/20'
                          }`}
                        ></span>
                        <span className={`${isAct ? 'text-[var(--a-text-a6543d)] font-bold' : 'text-[var(--a-text-2c3a2d)] font-semibold'}`}>
                          {row.target.key} × {row.evProtein.key}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--a-text-53634b)]">{row.target.name}</td>
                      <td className="py-2.5 px-4 text-[var(--a-text-53634b)]">
                        <span className="px-1.5 py-0.5 rounded bg-[var(--a-bg-ece7da)] font-bold text-[var(--a-text-2c3a2d)]">{row.evProtein.key}</span> ({row.evProtein.name})
                      </td>
                      <td className="py-2.5 px-4 text-right">{formatMetric(row.ipTM, 2)}</td>
                      <td className="py-2.5 px-4 text-right text-[var(--a-text-a6543d)]">{formatMetric(row.deltaG, 1)} kcal</td>
                      <td className="py-2.5 px-4 text-right">{formatMetric(row.bioCompat, 2)}</td>
                      <td className={`py-2.5 px-4 text-right font-bold ${isAct ? 'text-[var(--a-text-a6543d)]' : 'text-[var(--a-text-2c3a2d)]'}`}>
                        {formatMetric(row.score, 2)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono-code uppercase ${
                            isAct ? 'bg-[var(--a-bg-a6543d)] text-white' : 'bg-[var(--a-bg-ece7da)] text-[var(--a-text-53634b)]'
                          }`}
                        >
                          {isAct ? 'ACTIVE' : 'INSPECT 3D'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 07: BACKEND ENGINE & GEMINI AI MECHANISTIC SYNTHESIS */}
        <section className="space-y-4">
          <div className="border-b border-[var(--a-border-2c3a2d)]/15 pb-2 flex items-baseline justify-between">
            <div>
              <span className="font-mono-code text-xs text-[var(--a-text-a6543d)] uppercase tracking-wider font-bold">Section 07</span>
              <h3 className="font-serif text-2xl text-[var(--a-text-2c3a2d)]">
                Backend Services & AI Mechanistic Synthesis
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono-code font-bold bg-[var(--a-bg-ece7da)] text-[var(--a-text-2c3a2d)] border border-[var(--a-border-2c3a2d)]/15">
                EXO-RANK API
              </span>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--a-border-2c3a2d)]/15 p-5 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[var(--a-border-2c3a2d)]/10 pb-4">
              <div>
                <h4 className="font-serif text-lg text-[var(--a-text-2c3a2d)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--a-text-a6543d)] text-[20px]">psychology</span>
                  <span>Deep Mechanistic Review: {currentReceptorRecord.target} × {activeEvMeta.name}</span>
                </h4>
                <p className="text-xs text-[var(--a-text-747872)] font-mono-code mt-0.5">
                  Server-side endpoint: <code className="text-[var(--a-text-a6543d)]">/api/ai/mechanistic-insights</code> · AI availability depends on server configuration
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleExportDossierJson}
                  className="px-3.5 py-2 rounded-lg bg-[var(--a-bg-f6f4ea)] hover:bg-[var(--a-bg-ece7da)] text-[var(--a-text-2c3a2d)] border border-[var(--a-border-2c3a2d)]/20 font-mono-code text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Export scientific evidence and active structure provenance as JSON"
                >
                  <span className="material-symbols-outlined text-[16px] text-[var(--a-text-53634b)]">
                    {exportSuccess ? 'check_circle' : 'download'}
                  </span>
                  <span>{exportSuccess ? 'Dossier Exported' : 'Export Dossier (.JSON)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={isLoadingAi || uploaded}
                  className={`px-4 py-2 rounded-lg font-mono-code text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isLoadingAi
                      ? 'bg-[var(--a-bg-ece7da)] text-[var(--a-text-747872)] cursor-not-allowed'
                      : 'bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] text-[var(--a-text-fcf9f0)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${isLoadingAi ? 'animate-spin' : 'text-[var(--a-text-fcf9f0)]'}`}>
                    {isLoadingAi ? 'autorenew' : 'auto_awesome'}
                  </span>
                  <span>{isLoadingAi ? 'Synthesizing with AI...' : 'Run Gemini AI Analysis'}</span>
                </button>
              </div>
            </div>

            {(aiError || actionError) && <p role="status" className="text-xs text-[var(--a-text-a6543d)]">{aiError || actionError}</p>}
            {/* AI Results Display */}
            {aiAnalysis ? (
              <div className="space-y-4 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-mono-code bg-[var(--a-bg-f6f4ea)] px-3.5 py-2 rounded border border-[var(--a-border-2c3a2d)]/10">
                  <span className="text-[var(--a-text-53634b)]">
                    Engine: <strong className="text-[var(--a-text-2c3a2d)]">{aiAnalysis.modelUsed}</strong>
                  </span>
                  <span className="text-[var(--a-text-747872)]">
                    Generated at: {new Date(aiAnalysis.timestamp).toLocaleTimeString()} · {aiAnalysis.isAiGenerated ? 'Live Gemini AI' : 'Evidence summary'}
                  </span>
                </div>

                <div className="bg-[var(--a-bg-fcf9f0)] p-4 rounded-lg border border-[var(--a-border-2c3a2d)]/15">
                  <h5 className="font-mono-code text-xs uppercase tracking-wider font-bold text-[var(--a-text-a6543d)] mb-1">
                    Executive Viability Rationale
                  </h5>
                  <p className="text-sm font-serif text-[var(--a-text-2c3a2d)] leading-relaxed">
                    {aiAnalysis.executiveSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15 space-y-2">
                    <h5 className="font-mono-code text-xs uppercase tracking-wider font-bold text-[var(--a-text-2c3a2d)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--a-text-53634b)]">hub</span>
                      <span>Interface & Electrostatic Features</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-[var(--a-text-434842)] list-disc list-inside leading-relaxed font-sans">
                      {aiAnalysis.bindingInterfaceAnalysis.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/15 space-y-2">
                    <h5 className="font-mono-code text-xs uppercase tracking-wider font-bold text-[var(--a-text-2c3a2d)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--a-text-53634b)]">adjust</span>
                      <span>Vesicle Membrane Presentation</span>
                    </h5>
                    <p className="text-xs text-[var(--a-text-434842)] leading-relaxed font-sans">
                      {aiAnalysis.vesiclePresentation}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[var(--a-bg-fff8f6)] border border-[var(--a-border-a6543d)]/20 space-y-2">
                    <h5 className="font-mono-code text-xs uppercase tracking-wider font-bold text-[var(--a-text-a6543d)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--a-text-a6543d)]">warning</span>
                      <span>Biophysical Liabilities & Off-Target Risks</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-[var(--a-text-434842)] list-disc list-inside leading-relaxed font-sans">
                      {aiAnalysis.potentialLiabilities.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-[var(--a-bg-f4f7f2)] border border-[var(--a-border-53634b)]/25 space-y-2">
                    <h5 className="font-mono-code text-xs uppercase tracking-wider font-bold text-[var(--a-text-2c3a2d)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[var(--a-text-53634b)]">build_circle</span>
                      <span>Recommended Mutagenesis & Linker Optimization</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-[var(--a-text-434842)] list-disc list-inside leading-relaxed font-sans">
                      {aiAnalysis.engineeringRecommendations.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-[var(--a-border-2c3a2d)]/15 rounded-lg bg-[var(--a-bg-fcf9f0)]/60 space-y-2">
                <span className="material-symbols-outlined text-3xl text-[var(--a-text-53634b)]/60">query_stats</span>
                <p className="font-serif text-base text-[var(--a-text-2c3a2d)]">
                  AI Mechanistic Review
                </p>
                <p className="text-xs text-[var(--a-text-747872)] max-w-xl mx-auto font-sans">
                  Click the button above to query the Express backend at <code className="text-[var(--a-text-a6543d)]">/api/ai/mechanistic-insights</code> for an evidence-limited, nonvalidated AI review of <strong>{currentReceptorRecord.target} × {activeEvMeta.name}</strong>.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Back to Selector Action Button */}
        <div className="pt-4 pb-8 flex justify-center">
          <button
            onClick={onBackToSelector}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] text-[var(--a-text-fcf9f0)] font-mono-code text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Return to Target Pair Selector Matrix</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[var(--a-bg-f6f4ea)] border-t border-[var(--a-border-2c3a2d)]/15 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center space-y-2">
          <p className="font-mono-code text-[11px] text-[var(--a-text-747872)] max-w-4xl mx-auto">
            <strong className="text-[var(--a-text-2c3a2d)]">SCIENTIFIC DISCLAIMER:</strong> VESICON / EXO-TARGET is an in silico biocomputational prioritization framework intended to rank candidate heterodimers for subsequent experimental wet-lab validation. Models include AlphaFold2-Multimer and AlphaFold3. Predicted energetics are not experimental affinity.
          </p>
        </div>
      </footer>

      {/* EV Candidate Scaffold Comparative Modal */}
      {showCompareModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCompareModal(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-label="EV Candidate Scaffold Comparator" className="bg-[var(--a-bg-fcf9f0)] border-2 border-[var(--a-border-2c3a2d)]/30 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-[var(--a-bg-ece7da)] border-b border-[var(--a-border-2c3a2d)]/20 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">compare_arrows</span>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[var(--a-text-2c3a2d)]">
                    EV Candidate Scaffold Comparator
                  </h3>
                  <p className="font-mono-code text-xs text-[var(--a-text-53634b)]">
                    Target: <strong>{currentReceptorRecord.target}</strong> ({currentReceptorRecord.uniprot}) · {currentReceptorRecord.groupA.length} Curated Scaffolds
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="w-8 h-8 rounded-lg bg-[var(--surface)]/60 hover:bg-[var(--surface)] text-[var(--a-text-2c3a2d)] border border-[var(--a-border-2c3a2d)]/20 flex items-center justify-center cursor-pointer transition-all"
                title="Close Comparator"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
              {/* Quick Switch Comparison Candidate Strip */}
              <div className="bg-[var(--a-bg-f6f4ea)] border border-[var(--a-border-2c3a2d)]/15 rounded-xl p-3 space-y-2">
                <span className="font-mono-code text-[11px] font-bold uppercase text-[var(--a-text-53634b)] block">
                  Select Scaffold to Compare with Active Lead ({activeEvKey}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentReceptorRecord.groupA.map((sym) => {
                    const cat = EV_CATALOG[sym];
                    const isAct = sym === activeEvKey;
                    const isComp = sym === compareEvKey && !isAct;
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          if (!isAct) setCompareEvKey(sym);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono-code transition-all cursor-pointer flex items-center gap-2 ${
                          isAct
                            ? 'bg-[var(--a-bg-a6543d)]/15 border-[var(--a-border-a6543d)] text-[var(--a-text-2c3a2d)] font-bold'
                            : isComp
                            ? 'bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] border-[var(--a-border-2c3a2d)] font-bold shadow-xs'
                            : 'bg-[var(--surface)] hover:bg-[var(--a-bg-ece7da)] border-[var(--a-border-2c3a2d)]/20 text-[var(--a-text-2c3a2d)]'
                        }`}
                      >
                        <span>{sym}</span>
                        <span className={`text-[10px] ${isComp ? 'text-[var(--a-text-e5e3d7)]' : 'text-[var(--a-text-747872)]'}`}>
                          {cat?.name || sym}
                        </span>
                        {isAct && (
                          <span className="px-1.5 py-0.2 bg-[var(--a-bg-a6543d)] text-white text-[9px] rounded font-bold uppercase">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Active Lead */}
                <div className="bg-[var(--surface)] rounded-xl border-2 border-[var(--a-border-a6543d)]/40 p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between border-b border-[var(--a-border-2c3a2d)]/10 pb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-[var(--a-bg-a6543d)] text-white font-mono-code text-[10px] font-bold uppercase block w-max mb-1">
                        Active Lead
                      </span>
                      <h4 className="font-serif text-xl text-[var(--a-text-2c3a2d)]">
                        {activePairData.evProtein.name} ({activePairData.evProtein.key})
                      </h4>
                      <p className="font-mono-code text-xs text-[var(--a-text-747872)]">
                        {activePairData.evProtein.topology} · {activePairData.evProtein.mass}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Score</span>
                      <span className="font-serif text-2xl font-bold text-[var(--a-text-a6543d)]">
                        {formatMetric(activePairData.score, 2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                    <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                      <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">ΔG Binding</span>
                      <span className="font-bold text-[var(--a-text-a6543d)]">{formatMetric(activePairData.deltaG, 1)} kcal</span>
                    </div>
                    <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                      <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">Kd Affinity</span>
                      <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.kd)} nM</span>
                    </div>
                    <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                      <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">ipTM Confidence</span>
                      <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.ipTM, 2)}</span>
                    </div>
                    <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                      <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">Buried Area</span>
                      <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(activePairData.interfaceArea, 0)} Å²</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--a-text-434842)] bg-[var(--a-bg-fcf9f0)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10 font-serif leading-relaxed">
                    {activePairData.summary}
                  </p>
                </div>

                {/* Comparator */}
                <div className="bg-[var(--surface)] rounded-xl border-2 border-[var(--a-border-2c3a2d)]/30 p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between border-b border-[var(--a-border-2c3a2d)]/10 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-[var(--a-bg-2c3a2d)] text-[var(--a-text-fcf9f0)] font-mono-code text-[10px] font-bold uppercase block w-max mb-1">
                          Benchmark Candidate
                        </span>
                        <h4 className="font-serif text-xl text-[var(--a-text-2c3a2d)]">
                          {comparePairData.evProtein.name} ({comparePairData.evProtein.key})
                        </h4>
                        <p className="font-mono-code text-xs text-[var(--a-text-747872)]">
                          {comparePairData.evProtein.topology} · {comparePairData.evProtein.mass}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono-code text-[10px] text-[var(--a-text-747872)] uppercase block">Score</span>
                        <span className="font-serif text-2xl font-bold text-[var(--a-text-2c3a2d)]">
                          {formatMetric(comparePairData.score, 2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                      <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                        <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">ΔG Binding</span>
                        <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.deltaG, 1)} kcal</span>
                        <span className="text-[10px] font-bold block mt-0.5 text-[var(--a-text-a6543d)]">
                          {comparePairData.deltaG == null || activePairData.deltaG == null ? 'Not calculated' : comparePairData.deltaG < activePairData.deltaG ? `ΔΔG = ${metricDelta(comparePairData.deltaG,activePairData.deltaG,1)} (more negative prediction)`
                            : `ΔΔG = +${metricDelta(comparePairData.deltaG,activePairData.deltaG,1)} (less negative prediction)`}
                        </span>
                      </div>
                      <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                        <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">Kd Affinity</span>
                        <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.kd)} nM</span>
                        <span className="text-[10px] text-[var(--a-text-747872)] block mt-0.5">
                          {comparePairData.kd == null || activePairData.kd == null ? 'Not calculated' : comparePairData.kd < activePairData.kd ? 'Lower predicted Kd' : 'Higher predicted Kd'}
                        </span>
                      </div>
                      <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                        <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">ipTM Confidence</span>
                        <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.ipTM, 2)}</span>
                        <span className="text-[10px] text-[var(--a-text-747872)] block mt-0.5">
                          {comparePairData.ipTM == null || activePairData.ipTM == null ? 'Not calculated' : comparePairData.ipTM < activePairData.ipTM ? '+ higher' : 'lower'}
                        </span>
                      </div>
                      <div className="bg-[var(--a-bg-f6f4ea)] p-2.5 rounded border border-[var(--a-border-2c3a2d)]/10">
                        <span className="text-[10px] text-[var(--a-text-747872)] uppercase block">Buried Area</span>
                        <span className="font-bold text-[var(--a-text-2c3a2d)]">{formatMetric(comparePairData.interfaceArea, 0)} Å²</span>
                        <span className="text-[10px] text-[var(--a-text-747872)] block mt-0.5">

                          {metricDelta(comparePairData.interfaceArea,activePairData.interfaceArea)} Å²
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--a-text-434842)] bg-[var(--a-bg-fcf9f0)] p-3 rounded-lg border border-[var(--a-border-2c3a2d)]/10 font-serif leading-relaxed">
                      {comparePairData.summary}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectEv(comparePairData.evProtein.key);
                        setShowCompareModal(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-[var(--a-bg-2c3a2d)] hover:bg-[var(--a-bg-3e4f3f)] text-[var(--a-text-fcf9f0)] font-mono-code text-xs font-bold uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      <span>Switch Active 3D Complex to {comparePairData.evProtein.key}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[var(--a-bg-ece7da)] border-t border-[var(--a-border-2c3a2d)]/20 px-5 py-3 flex items-center justify-between">
              <span className="font-mono-code text-xs text-[var(--a-text-747872)]">
                Group A: curated candidates; EV feasibility varies by protein.
              </span>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--a-border-2c3a2d)]/20 hover:bg-[var(--a-bg-f6f4ea)] text-[var(--a-text-2c3a2d)] font-mono-code text-xs font-bold cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
