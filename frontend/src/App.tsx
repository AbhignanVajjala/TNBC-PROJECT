import React, { useState, useEffect } from 'react';
import { PerspectiveMode, ScreenMode } from './types';
import { RECEPTOR_DATASET, getLigand } from './data/dataset';
import { Header } from './components/Header';
import { TargetSelectorView } from './components/TargetSelectorView';
import { readSelection, validSelection } from './lib/selection';
import type { StructureData } from './lib/pdb';
import { ThemeProvider } from './components/ThemeSwitcher';
import { AnalysisView } from './components/AnalysisView';

export default function App() {
  const [perspective, setPerspective] = useState<PerspectiveMode>('primer');
  const [selection, setSelection] = useState(readSelection);
  const [uploads, setUploads] = useState<Record<string,StructureData>>({});
  const {receptor:selectedReceptorId, scaffold:selectedLigandId, view:screenMode} = selection;
  useEffect(() => {
    const restore = () => setSelection(readSelection());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const updateStateAndUrl = (rec:string, lig:string, view:ScreenMode) => {
    const next = validSelection(rec,lig,view);
    setSelection(next);
    try { localStorage.setItem('vesicon_selected_pair',JSON.stringify(next)); } catch {}
    const params=new URLSearchParams({receptor:next.receptor,scaffold:next.scaffold});
    if(next.view === 'analysis') params.set('view','analysis');
    window.history.pushState({},'',`?${params}`);
  };
  const handleSelectReceptor = (id:string) => updateStateAndUrl(id,selectedLigandId,screenMode);
  const handleSelectLigand = (id:string) => updateStateAndUrl(selectedReceptorId,id,screenMode);
  const handleSelectPair = (rec:string,lig:string) => updateStateAndUrl(rec,lig,'analysis');

  const handleInspectAnalysis = () => {
    updateStateAndUrl(selectedReceptorId, selectedLigandId, 'analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSelector = () => {
    updateStateAndUrl(selectedReceptorId, selectedLigandId, 'selector');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentReceptor = RECEPTOR_DATASET.find((r) => r.id === selectedReceptorId) || RECEPTOR_DATASET[0];
  const currentLigand = getLigand(selectedLigandId);

  return (
    <ThemeProvider><div
      className="min-h-screen flex flex-col justify-between selection:bg-sage/20 selection:text-[var(--deep-forest-ink)] relative overflow-x-hidden"
      data-mode={perspective}
    >
      {/* Understated Molecular / Network Background Geometry */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30"
      >
        <svg
          className="w-full h-full object-cover"
          fill="none"
          viewBox="0 0 1440 1200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#8FA085" strokeDasharray="3 4" strokeOpacity="0.4" strokeWidth="0.85">
            {/* Connecting network grid lines */}
            <line x1="240" x2="480" y1="180" y2="280" />
            <line x1="480" x2="680" y1="280" y2="210" />
            <line x1="680" x2="940" y1="210" y2="340" />
            <line x1="940" x2="1180" y1="340" y2="260" />
            <line x1="480" x2="420" y1="280" y2="520" />
            <line x1="680" x2="740" y1="210" y2="480" />
            <line x1="940" x2="880" y1="340" y2="600" />
            <line x1="740" x2="1020" y1="480" y2="590" />
            <line x1="260" x2="520" y1="780" y2="880" />
            <line x1="520" x2="820" y1="880" y2="800" />
            <line x1="820" x2="1150" y1="800" y2="920" />
          </g>
          {/* Subtle nodal coordinate circles */}
          <circle cx="240" cy="180" fill="#C7AD82" opacity="0.6" r="3.5" />
          <circle cx="480" cy="280" fill="#3E4F3F" opacity="0.5" r="4.5" />
          <circle cx="680" cy="210" fill="#8FA085" opacity="0.7" r="3" />
          <circle cx="940" cy="340" fill="#3E4F3F" opacity="0.4" r="5" />
          <circle cx="1180" cy="260" fill="#C7AD82" opacity="0.6" r="3" />
          <circle cx="420" cy="520" fill="#8FA085" opacity="0.5" r="4" />
          <circle cx="740" cy="480" fill="#3E4F3F" opacity="0.4" r="3.5" />
          <circle cx="880" cy="600" fill="#A6543D" opacity="0.35" r="4.5" />
          <circle cx="1020" cy="590" fill="#8FA085" opacity="0.5" r="3" />
          <circle cx="520" cy="880" fill="#C7AD82" opacity="0.5" r="4" />
          <circle cx="820" cy="800" fill="#3E4F3F" opacity="0.4" r="3.5" />
          {/* Concentric orbital hinting vesicle membrane */}
          <circle
            cx="1160"
            cy="760"
            r="180"
            stroke="#C7AD82"
            strokeDasharray="2 3"
            strokeOpacity="0.25"
            strokeWidth="0.75"
          />
          <circle
            cx="1160"
            cy="760"
            r="230"
            stroke="#3E4F3F"
            strokeOpacity="0.15"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* MAIN VIEW: EITHER TARGET SELECTOR OR FULL ANALYSIS */}
      {screenMode === 'selector' ? (
        <>
          <Header
            perspective={perspective}
            onPerspectiveChange={setPerspective}
            screenMode={screenMode}
            onNavigateHome={handleBackToSelector}
            receptorTarget={currentReceptor.target}
            ligandTarget={currentLigand.name}
          />
          <TargetSelectorView
            perspective={perspective}
            selectedReceptorId={selectedReceptorId}
            selectedLigandId={selectedLigandId}
            onSelectReceptor={handleSelectReceptor}
            onSelectLigand={handleSelectLigand}
            onInspectAnalysis={handleInspectAnalysis}
          />
        </>
      ) : (
        <AnalysisView
          uploads={uploads}
          onUpload={(value) => setUploads(previous => ({...previous,[value.pairId]:value}))}
          onSelectPair={handleSelectPair}
          perspective={perspective}
          onPerspectiveChange={setPerspective}
          selectedReceptorId={selectedReceptorId}
          selectedLigandId={selectedLigandId}
          onBackToSelector={handleBackToSelector}
          onSelectLigand={handleSelectLigand}
          onSelectReceptor={handleSelectReceptor}
        />
      )}
    </div></ThemeProvider>
  );
}
