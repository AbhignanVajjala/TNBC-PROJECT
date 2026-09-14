import React, { useState, useEffect } from 'react';
import { PerspectiveMode, ScreenMode } from './types';
import { RECEPTOR_DATASET, LIGANDS_DATABASE } from './data/dataset';
import { Header } from './components/Header';
import { TargetSelectorView } from './components/TargetSelectorView';
import { AnalysisView } from './components/AnalysisView';

export default function App() {
  const [perspective, setPerspective] = useState<PerspectiveMode>('primer');
  const [screenMode, setScreenMode] = useState<ScreenMode>('selector');
  const [selectedReceptorId, setSelectedReceptorId] = useState<string>('trop2');
  const [selectedLigandId, setSelectedLigandId] = useState<string>('anxa2');

  // Initialize state from URL params or localStorage
  useEffect(() => {
    let receptor = 'trop2';
    let scaffold = 'anxa2';
    let view: ScreenMode = 'selector';

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('receptor')) receptor = urlParams.get('receptor') || 'trop2';
      if (urlParams.has('scaffold')) scaffold = urlParams.get('scaffold') || 'anxa2';
      if (urlParams.has('view')) {
        const v = urlParams.get('view');
        if (v === 'analysis') view = 'analysis';
      }
    } catch (e) {
      console.warn('URL reading error:', e);
    }

    // Also check localStorage
    try {
      const stored = localStorage.getItem('vesicon_selected_pair');
      if (stored && !window.location.search) {
        const parsed = JSON.parse(stored);
        if (parsed.receptor) receptor = parsed.receptor;
        if (parsed.scaffold) scaffold = parsed.scaffold;
      }
    } catch (e) {}

    // Verify receptor exists
    const receptorMatch = RECEPTOR_DATASET.find((r) => r.id.toLowerCase() === receptor.toLowerCase());
    if (receptorMatch) {
      setSelectedReceptorId(receptorMatch.id);
      // Verify scaffold is in receptor's groupA
      const inGroupA = receptorMatch.groupA.some((g) => g.toLowerCase() === scaffold.toLowerCase());
      if (inGroupA) {
        setSelectedLigandId(scaffold.toLowerCase());
      } else {
        setSelectedLigandId(receptorMatch.groupA[0].toLowerCase());
      }
    }

    setScreenMode(view);
  }, []);

  // Sync selection changes to URL query and localStorage
  const updateStateAndUrl = (rec: string, lig: string, view: ScreenMode) => {
    setSelectedReceptorId(rec);
    setSelectedLigandId(lig);
    setScreenMode(view);

    try {
      localStorage.setItem('vesicon_selected_pair', JSON.stringify({ receptor: rec, scaffold: lig }));
      const newUrl = `?receptor=${encodeURIComponent(rec)}&scaffold=${encodeURIComponent(lig)}${view === 'analysis' ? '&view=analysis' : ''}`;
      window.history.replaceState({}, '', newUrl);
    } catch (e) {}
  };

  const handleSelectReceptor = (newReceptorId: string) => {
    const recRecord = RECEPTOR_DATASET.find((r) => r.id.toLowerCase() === newReceptorId.toLowerCase());
    if (!recRecord) return;

    // Check if current ligand is in new receptor's Group A
    const currentLigandValid = recRecord.groupA.some(
      (sym) => sym.toLowerCase() === selectedLigandId.toLowerCase()
    );

    const nextLigandId = currentLigandValid
      ? selectedLigandId.toLowerCase()
      : recRecord.groupA[0].toLowerCase();

    updateStateAndUrl(recRecord.id, nextLigandId, screenMode);
  };

  const handleSelectLigand = (newLigandId: string) => {
    updateStateAndUrl(selectedReceptorId, newLigandId.toLowerCase(), screenMode);
  };

  const handleInspectAnalysis = () => {
    updateStateAndUrl(selectedReceptorId, selectedLigandId, 'analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSelector = () => {
    updateStateAndUrl(selectedReceptorId, selectedLigandId, 'selector');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentReceptor = RECEPTOR_DATASET.find((r) => r.id === selectedReceptorId) || RECEPTOR_DATASET[0];
  const currentLigand = LIGANDS_DATABASE[selectedLigandId] || LIGANDS_DATABASE['anxa2'];

  return (
    <div
      className="min-h-screen flex flex-col justify-between selection:bg-sage/20 selection:text-deep-forest relative overflow-x-hidden"
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
          perspective={perspective}
          onPerspectiveChange={setPerspective}
          selectedReceptorId={selectedReceptorId}
          selectedLigandId={selectedLigandId}
          onBackToSelector={handleBackToSelector}
          onSelectLigand={handleSelectLigand}
          onSelectReceptor={handleSelectReceptor}
        />
      )}
    </div>
  );
}
