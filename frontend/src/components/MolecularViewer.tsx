import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { GLViewer } from '3dmol';
import { StructureData, SURFACE_ATOM_LIMIT } from '../lib/pdb';
export type Representation = 'cartoon' | 'surface' | 'stick';
export interface ViewerControls { reset:()=>void; center:()=>void; zoom:(factor:number)=>void }
interface Props {
  structure: StructureData | null;
  representation: Representation;
  onStatus: (status:'loading'|'ready'|'error', message?:string)=>void;
  highlight?: {chain:string; residue:string} | null;
}
const COLORS = [0x3E4F3F, 0xC77A58, 0x8FA085, 0xC7AD82, 0x65CBF3];

// 3Dmol 2.5.5 has no public destroy method. Capture its synchronous global
// listener registrations, then restore the native methods before returning.
function createOwnedViewer(library: typeof import('3dmol'), element: HTMLDivElement) {
  const removers: (()=>void)[] = [];
  const restore: (()=>void)[] = [];
  for (const target of [window, document.body]) {
    const original = target.addEventListener;
    const own = Object.getOwnPropertyDescriptor(target, 'addEventListener');
    target.addEventListener = function(type:any, listener:any, options:any) {
      original.call(this, type, listener, options);
      removers.push(() => this.removeEventListener(type, listener, options));
    } as typeof original;
    restore.push(() => { if (own) Object.defineProperty(target, 'addEventListener', own); else delete (target as any).addEventListener; });
  }
  let viewer: GLViewer;
  try { viewer = library.createViewer(element, {backgroundColor:'#0a0f0a', antialias:true}); }
  catch (error) { removers.forEach(remove => remove()); throw error; }
  finally { restore.forEach(fn => fn()); }
  return {viewer, destroy:() => {
    removers.forEach(remove => remove());
    viewer.spin(false); viewer.stopAnimate(); viewer.clear();
    (viewer as any).divwatcher?.disconnect();
    (viewer as any).intwatcher?.disconnect();
    for (const canvas of element.querySelectorAll('canvas')) {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      (gl as WebGLRenderingContext)?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    element.replaceChildren();
  }};
}

export const MolecularViewer = forwardRef<ViewerControls, Props>(function MolecularViewer({structure, representation, onStatus, highlight}, ref) {
  const container = useRef<HTMLDivElement>(null);
  const owned = useRef<ReturnType<typeof createOwnedViewer>>(null);
  const library = useRef<typeof import('3dmol')>(null);
  const initialView = useRef<number[]>(null);
  const status = useRef(onStatus); status.current = onStatus;
  const [ready, setReady] = useState(false);
  useImperativeHandle(ref, () => ({
    reset:() => { const v=owned.current?.viewer; if(v && initialView.current) {v.setView(initialView.current); v.render();} },
    center:() => {const v=owned.current?.viewer; v?.center(); v?.zoomTo(); v?.render();},
    zoom:(factor) => {const v=owned.current?.viewer; v?.zoom(factor); v?.render();},
  }), []);
  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    let resize: ResizeObserver;
    const lost = (event:Event) => {event.preventDefault(); status.current('error','WebGL context lost. Reload to restore 3D rendering.');};
    status.current('loading');
    import('3dmol/build/3Dmol.es6.js').then(module => {
      if (cancelled || !element) return;
      library.current = module;
      owned.current = createOwnedViewer(module, element);
      element.querySelector('canvas')?.addEventListener('webglcontextlost', lost);
      resize = new ResizeObserver(() => { const v=owned.current?.viewer; if(element.clientWidth && element.clientHeight) {v?.resize(); v?.render();} });
      resize.observe(element);
      setReady(true);
    }).catch(() => {if(!cancelled) status.current('error','3D rendering unavailable. WebGL or the molecular library could not initialize.');});
    return () => {cancelled=true; resize?.disconnect(); element?.querySelector('canvas')?.removeEventListener('webglcontextlost',lost); owned.current?.destroy(); owned.current=null;};
  }, []);
  useEffect(() => {
    const v = owned.current?.viewer;
    if (!ready || !v) return;
    v.clear(); initialView.current=null;
    if (!structure) return;
    try {
      const model = v.addModel(structure.pdb, 'pdb');
      if (!model.selectedAtoms({}).length) throw new Error('The molecular parser found no atoms.');
      v.setStyle({}, {cartoon:{color:COLORS[0]}, line:{color:COLORS[0]}});
      v.zoomTo(); v.render(); initialView.current=v.getView();
      status.current('ready');
    } catch {status.current('error','3D rendering unavailable. The coordinates could not be rendered.');}
  }, [ready, structure]);
  useEffect(() => {
    const v=owned.current?.viewer;
    if (!ready || !v || !structure || !library.current) return;
    let cancelled=false;
    const mode = representation === 'surface' && structure.parsed.atomCount > SURFACE_ATOM_LIMIT ? 'cartoon' : representation;
    try {
      v.removeAllSurfaces(); v.setStyle({}, {});
      structure.parsed.chains.forEach((chain,i) => {
        const color=COLORS[i % COLORS.length];
        v.setStyle({chain}, mode === 'stick' ? {stick:{color,radius:0.18},sphere:{scale:0.25,color}} : {cartoon:{color,thickness:0.7,ribbon:true},line:{color,opacity:0.25}});
        if (mode === 'surface') Promise.resolve(v.addSurface(library.current.SurfaceType.VDW, {opacity:0.75,color}, {chain})).then(() => {if(!cancelled) v.render();}).catch(() => {if(!cancelled) {v.removeAllSurfaces(); status.current('ready','Surface unavailable; showing the genuine backbone coordinates.');}});
      });
      if (highlight) v.addStyle({chain:highlight.chain,resi:Number.parseInt(highlight.residue,10)}, {sphere:{color:0xE3B873,scale:0.45}});
      v.render();
    } catch {status.current('error','3D rendering unavailable for this representation.');}
    return () => {cancelled=true; v.removeAllSurfaces();};
  }, [ready, structure, representation, highlight]);
  return <div id="gmol-viewer" ref={container} className="absolute inset-0" aria-label="Interactive molecular structure"/>;
});
