import React from 'react';
import { ArrowRight, Sparkles, ChevronDown } from 'lucide-react';
import { PerspectiveMode, ReceptorItem, LigandItem } from '../types';
import { RECEPTOR_DATASET, LIGANDS_DATABASE, getPairScore } from '../data/dataset';

interface TargetSelectorViewProps {
  perspective: PerspectiveMode;
  selectedReceptorId: string;
  selectedLigandId: string;
  onSelectReceptor: (id: string) => void;
  onSelectLigand: (id: string) => void;
  onInspectAnalysis: () => void;
}

export const TargetSelectorView: React.FC<TargetSelectorViewProps> = ({
  perspective,
  selectedReceptorId,
  selectedLigandId,
  onSelectReceptor,
  onSelectLigand,
  onInspectAnalysis,
}) => {
  const selectedReceptor: ReceptorItem =
    RECEPTOR_DATASET.find((r) => r.id.toLowerCase() === selectedReceptorId.toLowerCase()) ||
    RECEPTOR_DATASET[0];

  const selectedLigand: LigandItem =
    LIGANDS_DATABASE[selectedLigandId.toLowerCase()] ||
    LIGANDS_DATABASE['anxa2'];

  const pairScoreData = getPairScore(selectedReceptor.id, selectedLigand.id);

  // Group A (curated) + Group B (background control) candidates, each tagged with its group
  const candidateOptions = [
    ...selectedReceptor.groupA.map((sym) => ({ sym, group: 'A' as const })),
    ...selectedReceptor.groupB.map((sym) => ({ sym, group: 'B' as const })),
  ];

  const handleScrollToDetails = () => {
    const el = document.getElementById('target-protein-details');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-16 flex flex-col">
      {/* 2. COMPACT HERO SECTION */}
      <div className="text-center max-w-3xl mx-auto mb-3 sm:mb-4">
        <p className="text-[10px] sm:text-[11px] uppercase font-semibold tracking-wider text-forest/75 mb-0.5 font-sans">
          {perspective === 'primer'
            ? 'Foundational Guide & Concept Primer'
            : 'In Silico Biophysical Screening Pipeline'}
        </p>
        <h1 className="font-editorial text-2xl sm:text-3xl lg:text-[2.2rem] text-deep-forest font-light leading-tight tracking-tight mb-1">
          Prioritize the candidates <span className="italic font-normal">worth testing.</span>
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed font-light font-sans max-w-2xl mx-auto">
          {perspective === 'primer'
            ? 'Discover how smart exosome delivery vehicles seek out and attach to hard-to-treat triple-negative breast cancer cells.'
            : 'Explore computationally prioritized extracellular-vesicle proteins for TNBC receptor targeting using AlphaFold-Multimer docking and binding free energy.'}
        </p>
      </div>

      {/* 3. MAIN SELECTOR CARD (COMPACT & COMPLETE WITH CTA ABOVE THE FOLD) */}
      <section className="bg-white/95 border border-forest/15 rounded-xl shadow-[0_4px_25px_rgba(44,58,45,0.05)] p-4 sm:p-5 mb-6 backdrop-blur-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3 pb-2.5 border-b border-forest/10">
          <div>
            <h2 className="font-editorial text-lg sm:text-xl text-deep-forest font-medium tracking-tight">
              Select Target Pair
            </h2>
            <p className="text-[11px] sm:text-xs text-ink-muted font-sans">
              {perspective === 'primer'
                ? 'Pair a tumor surface antigen with an exosome delivery scaffold to evaluate compatibility.'
                : 'Pair a TNBC ectodomain with an engineered EV ligand scaffold for computational binding analysis.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cream-secondary border border-forest/10 text-[10px] sm:text-[11px] font-sans font-medium text-forest self-start sm:self-auto flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
            <span>
              {perspective === 'primer' ? 'Foundations & Primer Active' : 'Biocomputation Active'}
            </span>
          </div>
        </div>

        {/* SELECTOR DROPDOWNS: RECEPTOR ON LEFT, EV LIGAND ON RIGHT */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-3 mb-3">
          {/* LEFT: TNBC Receptor */}
          <div className="bg-cream-secondary/60 hover:bg-cream-secondary/90 border border-forest/15 rounded-lg p-2.5 sm:p-3 transition-colors focus-within:border-forest/50 focus-within:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-1">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider text-forest font-sans flex items-center gap-1.5"
                htmlFor="receptorSelect"
              >
                <span className="w-2 h-2 rounded-full bg-terracotta"></span>
                TNBC Receptor Target
              </label>
              <span className="text-[10px] font-mono text-ink-subtle bg-white/80 px-1.5 py-0.5 rounded border border-forest/10">
                UniProt: {selectedReceptor.uniprot}
              </span>
            </div>
            <div className="relative">
              <select
                id="receptorSelect"
                value={selectedReceptor.id}
                onChange={(e) => onSelectReceptor(e.target.value)}
                className="w-full bg-white border border-forest/20 text-deep-forest font-medium text-xs sm:text-sm rounded px-3 py-2 appearance-none cursor-pointer hover:border-forest/40 transition-colors pr-8 font-sans shadow-sm"
              >
                {RECEPTOR_DATASET.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.target}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-forest/70">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Center Interstitial Interaction Symbol */}
          <div className="flex items-center justify-center my-1 md:my-0 md:mt-5">
            <div
              className="w-8 h-8 rounded-full bg-cream border border-forest/25 flex items-center justify-center text-forest/90 font-editorial text-base italic shadow-sm select-none"
              title="Computational Interaction Pair"
            >
              ×
            </div>
          </div>

          {/* RIGHT: EV / Exosomal Protein (Restricted to Group A of active receptor) */}
          <div className="bg-cream-secondary/60 hover:bg-cream-secondary/90 border border-forest/15 rounded-lg p-2.5 sm:p-3 transition-colors focus-within:border-forest/50 focus-within:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-1">
              <label
                className="text-[11px] font-semibold uppercase tracking-wider text-forest font-sans flex items-center gap-1.5"
                htmlFor="ligandSelect"
              >
                <span className="w-2 h-2 rounded-full bg-forest"></span>
                EV / Exosomal Scaffold (Group A + B)
              </label>
              <span className="text-[10px] font-mono text-ink-subtle bg-white/80 px-1.5 py-0.5 rounded border border-forest/10">
                UniProt: {selectedLigand.uniprot}
              </span>
            </div>
            <div className="relative">
              <select
                id="ligandSelect"
                value={selectedLigand.id}
                onChange={(e) => onSelectLigand(e.target.value)}
                className="w-full bg-white border border-forest/20 text-deep-forest font-medium text-xs sm:text-sm rounded px-3 py-2 appearance-none cursor-pointer hover:border-forest/40 transition-colors pr-8 font-sans shadow-sm"
              >
                {candidateOptions.map(({ sym, group }) => {
                  const lKey = sym.toLowerCase();
                  const ligandMeta = LIGANDS_DATABASE[lKey];
                  const label = ligandMeta ? ligandMeta.name : sym;
                  return (
                    <option key={`${group}-${lKey}`} value={lKey}>
                      Group {group}: {label}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-forest/70">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* IMMEDIATE CTA & CANDIDATE ACTION BAR (ABOVE THE FOLD) */}
        <div className="rounded-lg bg-cream-secondary/50 border border-forest/20 p-3 sm:p-3.5 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Left: Active Pair info & score */}
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-forest bg-forest/10 border border-forest/20 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest mr-1"></span>
                  Configured Pair
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-terracotta bg-terracotta/10 border border-terracotta/20 rounded font-mono">
                  Score: {pairScoreData.score} / 100 · {pairScoreData.tier}
                </span>
              </div>
              <h3 className="font-editorial text-lg sm:text-xl text-deep-forest font-medium tracking-tight">
                {selectedReceptor.target} × {selectedLigand.name}
              </h3>
              <p className="text-[11px] text-ink-muted font-sans leading-snug">
                {perspective === 'primer'
                  ? 'Predicted binding feasibility, 3D molecular dock simulations, and clinical relevance.'
                  : 'AlphaFold-Multimer interface confidence (ipTM), binding affinity (ΔG), and interactive 3D structures.'}
              </p>
            </div>

            {/* Right: The Primary Action Button */}
            <div className="w-full sm:w-auto flex flex-col sm:items-end flex-shrink-0">
              <button
                id="inspect-priority-btn"
                onClick={onInspectAnalysis}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-xs sm:text-sm font-semibold tracking-wide text-white bg-terracotta hover:bg-[#8E4430] active:bg-[#7D3E2C] rounded shadow-[0_2px_8px_rgba(166,84,61,0.25)] transition-all font-sans group text-center cursor-pointer"
              >
                <span>Inspect Computational Priority & Full Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </button>
              <span className="text-[10px] text-ink-subtle font-sans mt-1 text-center sm:text-right">
                {perspective === 'primer'
                  ? 'Opens 3D model, binding story & interactive docking'
                  : 'Opens 3D PDB viewer, docking metrics & contact map'}
              </span>
            </div>
          </div>

          {/* Quick link prompt to scroll down to details */}
          <div className="flex flex-wrap items-center justify-between pt-2.5 mt-2.5 border-t border-forest/10 text-[11px] text-ink-subtle gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              Pair ready for deep biophysical investigation
            </span>
            <button
              type="button"
              onClick={handleScrollToDetails}
              className="inline-flex items-center gap-1 text-forest hover:text-deep-forest font-medium text-[11px] underline underline-offset-4 cursor-pointer transition-colors"
            >
              <span>Scroll down to see receptor & protein details</span>
              <ChevronDown className="w-3 h-3 animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. RECEPTOR & PROTEIN TARGET DETAILS (ACCESSIBLE VIA SCROLLING) */}
      <section id="target-protein-details" className="scroll-mt-14 mb-12">
        <div className="pb-2.5 mb-4 border-b border-forest/15">
          <span className="text-[10px] uppercase font-bold tracking-widest text-forest bg-forest/10 px-2.5 py-0.5 rounded inline-block mb-1">
            Target Profiles Dossier
          </span>
          <h3 className="font-editorial text-xl sm:text-2xl text-deep-forest font-medium">
            Receptor & Protein Target Details
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Review molecular topology, oncogenic rationale, and vesicle membrane characteristics for {selectedReceptor.target} and {selectedLigand.name}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* RECEPTOR INFO CARD */}
          <div className="bg-white/80 border border-forest/15 rounded-xl p-5 sm:p-6 shadow-sm transition-all">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-forest/10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta bg-terracotta/10 px-2 py-0.5 rounded">
                  Receptor Profile
                </span>
                <h4 className="text-base font-semibold text-deep-forest font-sans">
                  {selectedReceptor.target}
                </h4>
              </div>
              <span className="text-xs font-mono text-ink-subtle bg-cream px-2 py-0.5 rounded border border-forest/10">
                UniProt: {selectedReceptor.uniprot}
              </span>
            </div>

            {perspective === 'primer' ? (
              <div className="space-y-2.5 text-xs text-ink leading-relaxed">
                <p>
                  <span className="font-semibold text-deep-forest">What is it:</span>{' '}
                  {selectedReceptor.primer.what}
                </p>
                <p>
                  <span className="font-semibold text-deep-forest">Why in TNBC:</span>{' '}
                  {selectedReceptor.primer.whyTNBC}
                </p>
                <p>
                  <span className="font-semibold text-deep-forest">Cancer role:</span>{' '}
                  {selectedReceptor.primer.mechanism}
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                <p className="font-sans text-xs mb-1.5">
                  <span className="font-semibold text-deep-forest">Domain Topology:</span>{' '}
                  {selectedReceptor.deep.topology}
                </p>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10 space-y-1.5">
                  <p>
                    <span className="text-forest font-semibold">Glycosylation:</span>{' '}
                    {selectedReceptor.deep.glycosylation}
                  </p>
                  <p>
                    <span className="text-forest font-semibold">Internalization:</span>{' '}
                    {selectedReceptor.deep.pathway}
                  </p>
                  <p>
                    <span className="text-forest font-semibold">Docking Note:</span>{' '}
                    {selectedReceptor.deep.docking}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* LIGAND INFO CARD */}
          <div className="bg-white/80 border border-forest/15 rounded-xl p-5 sm:p-6 shadow-sm transition-all">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-forest/10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-forest bg-forest/10 px-2 py-0.5 rounded">
                  Scaffold Profile
                </span>
                <h4 className="text-base font-semibold text-deep-forest font-sans">
                  {selectedLigand.name}
                </h4>
              </div>
              <span className="text-xs font-mono text-ink-subtle bg-cream px-2 py-0.5 rounded border border-forest/10">
                UniProt: {selectedLigand.uniprot}
              </span>
            </div>

            {perspective === 'primer' ? (
              <div className="space-y-2.5 text-xs text-ink leading-relaxed">
                <p>
                  <span className="font-semibold text-deep-forest">What is it:</span>{' '}
                  {selectedLigand.primer.what}
                </p>
                <p>
                  <span className="font-semibold text-deep-forest">How vesicles use it:</span>{' '}
                  {selectedLigand.primer.howEV}
                </p>
                <p>
                  <span className="font-semibold text-deep-forest">Analogy:</span>{' '}
                  {selectedLigand.primer.metaphor}
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                <p className="font-sans text-xs mb-1.5">
                  <span className="font-semibold text-deep-forest">Scaffold Classification:</span>{' '}
                  {selectedLigand.deep.scaffoldType}
                </p>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10 space-y-1.5">
                  <p>
                    <span className="text-forest font-semibold">Structural Topology:</span>{' '}
                    {selectedLigand.deep.topology}
                  </p>
                  <p>
                    <span className="text-forest font-semibold">EV Abundance:</span>{' '}
                    {selectedLigand.deep.exosomeDensity}
                  </p>
                  <p>
                    <span className="text-forest font-semibold">Computational Fit:</span>{' '}
                    {selectedLigand.deep.docking}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>



      {/* 5. RICH SCIENTIFIC EDITORIAL PANELS */}
      <section className="mb-14">
        <div className="text-center mb-8">
          <span className="text-xs uppercase font-medium tracking-widest text-sage mb-1 block font-sans">
            {perspective === 'primer'
              ? 'Biological & Clinical Understanding'
              : 'Structural Proteomics & Biophysics'}
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl text-deep-forest font-medium tracking-tight">
            {perspective === 'primer'
              ? 'How Nano-Vehicles Recognize Breast Cancer'
              : 'The Molecular Interface Landscape'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* PANEL 1: TNBC Receptor Landscape */}
          <article className="bg-white/70 border border-forest/15 rounded-xl p-7 lg:p-8 flex flex-col justify-between backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-terracotta bg-terracotta/10 px-2.5 py-1 rounded">
                  Target Antigens
                </span>
                <span className="text-xs text-ink-subtle font-sans">Host Oncogenic Surface</span>
              </div>
              <h3 className="font-editorial text-xl sm:text-2xl text-deep-forest font-medium tracking-tight mb-3">
                TNBC Receptor Landscape
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed font-sans mb-4">
                Triple-negative breast cancer (TNBC) represents one of the most therapeutically
                recalcitrant breast cancer subtypes due to the complete lack of estrogen receptor (ER),
                progesterone receptor (PR), and human epidermal growth factor receptor 2 (HER2)
                amplification. Conventional targeted endocrine and HER2 therapies are ineffective,
                necessitating precise cell-surface receptor mapping.
              </p>
              <div className="space-y-3 pt-3 border-t border-forest/10 text-xs font-sans">
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    Epidermal Growth Factor Receptor (EGFR & mutant variants):
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Overexpressed in up to 70% of TNBC tumors; mutant conformations and truncated
                    variants (such as EGFRvIII) present tumor-specific extracellular neo-epitopes with
                    minimized on-target, off-tumor toxicity.
                  </span>
                </div>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    Trophoblast Cell-Surface Antigen 2 (Trop-2):
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Heavily upregulated transmembrane glycoprotein associated with cell proliferation
                    and invasive phenotypes across high-grade basal-like TNBC lesions.
                  </span>
                </div>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    Integrin Heterodimers (αvβ3 / α5β1):
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Key modulators of metastatic homing, neo-angiogenesis, and extracellular matrix
                    adherence in basal-like TNBC microenvironments.
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-forest/10 text-[11px] text-ink-subtle flex items-center justify-between">
              <span>Primary Focus: Surface accessible extracellular domains</span>
              <span className="text-forest font-medium">Domain I–IV mapping</span>
            </div>
          </article>

          {/* PANEL 2: Engineered EV Ligand Scaffolds */}
          <article className="bg-white/70 border border-forest/15 rounded-xl p-7 lg:p-8 flex flex-col justify-between backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-forest bg-forest/10 px-2.5 py-1 rounded">
                  Exosome Engineering
                </span>
                <span className="text-xs text-ink-subtle font-sans">Vesicle Display Scaffolds</span>
              </div>
              <h3 className="font-editorial text-xl sm:text-2xl text-deep-forest font-medium tracking-tight mb-3">
                Engineered EV / Exosomal Scaffolds
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed font-sans mb-4">
                Extracellular vesicles (EVs) and exosomes naturally bypass physiological hurdles,
                including low immunogenicity and endogenous membrane fusion. Computational display
                engineering grafts high-affinity targeting motifs onto vesicle membrane proteins
                without compromising vesicle biogenesis or membrane structural stability.
              </p>
              <div className="space-y-3 pt-3 border-t border-forest/10 text-xs font-sans">
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    Tetraspanin EC2 Display (CD9, CD63, CD81):
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Integration of peptide binders or single-domain antibodies into the large
                    extracellular loop (EC2) provides rigid outward projection and exceptionally high copy
                    numbers per vesicle.
                  </span>
                </div>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    LAMP2B N-Terminal Engineering:
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Lysosome-associated membrane protein 2B with flexible linkers and glycosylation shields
                    (GNSTM) protects targeting ligands from proteolytic cleavage during exosome biogenesis.
                  </span>
                </div>
                <div className="bg-cream-secondary/50 p-3 rounded border border-forest/10">
                  <span className="font-semibold text-deep-forest block mb-0.5">
                    Alix & Syntenin-1 ESCRT Adaptor Display:
                  </span>
                  <span className="text-ink-muted leading-normal">
                    Direct luminally coupled and trans-membrane topologies utilizing ESCRT-interacting
                    motifs to regulate dense surface valency without altering vesicular diameter.
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-forest/10 text-[11px] text-ink-subtle flex items-center justify-between">
              <span>Primary Focus: Spatial steric fit & binding affinity</span>
              <span className="text-forest font-medium">In silico validated</span>
            </div>
          </article>
        </div>
      </section>

      {/* 6. WORKFLOW INDICATOR */}
      <div className="max-w-xl mx-auto mb-10 text-center">
        <div className="inline-flex items-center space-x-2 sm:space-x-4 text-xs font-sans font-medium text-ink-subtle bg-cream-secondary/50 border border-forest/10 px-5 py-2.5 rounded-full shadow-sm">
          <span className="text-forest font-semibold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-forest mr-1.5"></span>
            Select pair
          </span>
          <span className="text-forest/30">→</span>
          <button
            onClick={onInspectAnalysis}
            className="hover:text-forest transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            Analyze structure & score
          </button>
          <span className="text-forest/30">→</span>
          <span className="text-ink-subtle">Prioritize candidates</span>
        </div>
      </div>

      {/* 7. SCIENTIFIC DISCLAIMER */}
      <footer className="text-center pt-6 border-t border-forest/10 max-w-2xl mx-auto">
        <p className="text-xs text-ink-subtle font-sans leading-normal">
          Prototype computational framework using placeholder research data. Computational interaction
          models and priority scores do not establish confirmed in vivo binding or therapeutic efficacy
          without wet-lab assay validation.
        </p>
      </footer>
    </div>
  );
};
