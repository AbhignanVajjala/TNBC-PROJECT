\# TNBC EXOSOME TARGETING PROJECT — COMPLETE CONTEXT



\## 1. PROJECT OVERVIEW



This project is a computational screening and prioritization framework for identifying promising exosomal proteins that could potentially be used to target triple-negative breast cancer (TNBC) cells.



The overall concept is:



\*\*TNBC surface receptors → candidate exosomal proteins → structural interaction prediction → affinity estimation → external interaction evidence → biological prioritization\*\*



The goal is NOT to experimentally prove that any candidate protein binds a receptor.



The goal is to build a computational decision-support/prioritization system that answers:



> "Among the candidate exosomal proteins tested against TNBC-relevant surface receptors, which interactions should be experimentally validated first?"



This is being developed primarily for an ideathon/competition, so the project should be presented as a practical computational screening platform rather than as a clinically validated prediction system.



\---



\# 2. CORE BIOLOGICAL PROBLEM



Triple-negative breast cancer lacks ER, PR, and HER2 expression, which limits some conventional targeted therapeutic approaches.



The project explores an alternative targeting concept:



\*\*Use exosomes/extracellular vesicles as delivery vehicles and identify exosomal proteins that could potentially mediate recognition of TNBC-associated cell-surface receptors.\*\*



The computational problem is therefore:



> Identify and prioritize plausible exosomal-protein/receptor interaction pairs for future experimental validation.



\---



\# 3. IMPORTANT TERMINOLOGY



Do NOT call the candidate exosomal proteins "known ligands" unless independent evidence specifically establishes that relationship.



Correct terminology:



\* "candidate exosomal targeting protein"

\* "candidate interaction"

\* "candidate receptor–protein pair"

\* "computationally prioritized interaction"

\* "predicted interaction"

\* "candidate for experimental validation"



Incorrect/overclaiming terminology:



\* "confirmed ligand"

\* "proven binding partner"

\* "validated interaction"

\* "this protein definitely targets this receptor"



Computational prediction is not experimental validation.



\---



\# 4. ORIGINAL CANDIDATE STRATEGY



The initial idea was to start with the top 100 proteins from ExoCarta.



However, an important conceptual issue was recognized:



\*\*High abundance in exosomes does not necessarily mean high targeting efficiency.\*\*



Therefore, the candidate selection was expanded beyond simply taking the most abundant exosomal proteins.



Candidate selection instead considers biological plausibility, including:



\* extracellular localization

\* extracellular/ECM relevance

\* adhesion-related biology

\* accessibility

\* receptor accessibility

\* potential recognition/interaction relevance

\* plausibility of association with extracellular vesicles/exosomes



This is a biologically informed screening funnel rather than a purely abundance-based ranking.



\---



\# 5. TNBC RECEPTORS



A panel of approximately 20 TNBC-relevant cell-surface targets/receptors was assembled.



The purpose of this receptor panel is to represent potentially targetable extracellular proteins associated with TNBC biology.



Some receptor sequences are not modeled in their entirety.



For membrane receptors, the relevant extracellular domain may be used instead of the full-length protein because the exosomal protein would interact with the extracellularly accessible portion.



Example:



\*\*TROP2 / TACSTD2\*\*



\* UniProt: P09758

\* extracellular domain approximately residues 27–274



Other receptor sequences/domains were handled according to their biological accessibility.



For secreted proteins or proteins where the full sequence is biologically relevant, the whole sequence may be used.



\---



\# 6. CANDIDATE GROUP DESIGN



For each receptor, candidate exosomal proteins were divided into two conceptual groups.



\## GROUP A — BIOLOGICALLY SELECTED CANDIDATES



These are the primary candidate exosomal proteins.



They were selected because they have biologically plausible characteristics relevant to:



\* extracellular biology

\* ECM/adhesion

\* cell recognition

\* extracellular interactions

\* possible exosomal association

\* receptor accessibility



Group A is therefore a biologically informed candidate set.



It is NOT a set of experimentally proven ligands.



\---



\## GROUP B — BACKGROUND / CONTEXTUAL CONTROLS



Group B consists of related/background proteins selected to provide a comparison baseline.



They should NOT be described as:



\* random proteins

\* deliberately bad proteins

\* negative ligands

\* proteins known not to bind



Instead describe them as:



> "related background/control proteins used to determine whether the computational signals observed in Group A are enriched among biologically selected candidates rather than being generic properties of the protein set."



This is important because simply screening only Group A could introduce selection bias.



Group B provides a contextual comparison.



\---



\# 7. NUMBER OF INTERACTIONS



The current screening design contains approximately:



\*\*20 receptors × 10 candidate proteins = 200 receptor–protein interaction pairs\*\*



Each interaction is one row in the master spreadsheet.



The current dataset therefore represents a computational screening matrix of roughly 200 pairs.



The number 5 for Group A and 5 for Group B is primarily a practical initial screening design.



It is not being claimed that five is biologically optimal.



The framework should be described as scalable.



\---



\# 8. FINAL DATA STRUCTURE



The master spreadsheet uses:



\*\*ONE INTERACTION PAIR PER ROW\*\*



Columns are conceptually:



1\. Target No.

2\. Receptor

3\. Group

4\. Protein

5\. STRING Info

6\. PRODIGY Info

7\. AlphaFold metrics



Do NOT redesign the dataset into a "Candidate 1 / Candidate 2" structure.



Each row represents exactly one:



\*\*Receptor × Protein\*\*



pair.



\---



\# 9. SEQUENCE SOURCE



Protein sequences were obtained from UniProt.



Sequences/domains were manually checked and prepared before structural prediction.



For receptors with extracellular domains, the biologically relevant extracellular sequence/domain may be used rather than the full receptor.



This is important because the project is concerned with extracellular recognition between exosomal proteins and cell-surface receptors.



\---



\# 10. STRUCTURAL PREDICTION



AlphaFold/ColabFold is being used to predict the structure of receptor–candidate protein complexes.



Approximately 200 interaction pairs are being evaluated.



The project deliberately does NOT require building a complicated automated ColabFold batch pipeline.



The interactions have been/will be run manually because GPU availability and reliability make a fully automated workflow unnecessarily fragile for this project.



The objective is to collect consistent confidence metrics from the resulting models.



\---



\# 11. ALPHAFOLD DATA EXTRACTION



For the common AlphaFold feature set, the following metrics are retained:



\### 1. Mean pLDDT



Higher is generally better.



pLDDT represents local structural confidence.



Important:



pLDDT is NOT a direct measure of binding confidence.



\---



\### 2. Mean PAE



Lower is generally better.



PAE = Predicted Aligned Error.



Mean PAE provides an overall measure of positional uncertainty.



\---



\### 3. Median PAE



Lower is generally better.



Median PAE represents the typical positional uncertainty and is less sensitive to extreme values than the mean.



\---



\### 4. PAE Range



Calculated as:



\*\*maximum PAE − minimum PAE\*\*



Initially treated as a measure of the spread/consistency of positional uncertainty.



Lower values can be treated as more consistent for the initial scoring framework, but this interpretation should be treated cautiously because PAE range is not inherently a direct measure of binding quality.



\---



\### 5. pTM



Higher is better.



pTM represents confidence in the global structural/topological arrangement.



\---



\### 6. ipTM



Higher is better.



ipTM is particularly important because it is related to confidence in the relative arrangement/interface between interacting chains.



It should receive greater importance than pLDDT when constructing an interaction-prioritization score.



\---



\# 12. METRICS THAT WERE DROPPED FROM THE COMMON FEATURE SET



Some AlphaFold/ColabFold outputs included:



\* ipSAE

\* pDockQ

\* pDockQ2



However, AlphaFold3 outputs do not consistently provide the same set of metrics.



Therefore, to maintain a common feature set across AF2/ColabFold and AF3:



\*\*Do not force ipSAE, pDockQ, or pDockQ2 into the common scoring model.\*\*



The common AlphaFold feature set is:



\* mean pLDDT

\* mean PAE

\* median PAE

\* PAE range

\* pTM

\* ipTM



\---



\# 13. ALPHAFOLD JSON EXTRACTION



For AF2/ColabFold rank-1 JSON files, values are extracted from the rank-1 prediction.



Relevant values include:



\* pLDDT array → calculate mean pLDDT

\* PAE matrix → calculate mean PAE

\* PAE matrix → calculate median PAE

\* PAE matrix → calculate minimum and maximum PAE, then range

\* pTM

\* ipTM



Do not unnecessarily recalculate values already directly provided by the JSON.



For AlphaFold3, the available common metrics include:



\* pLDDT

\* PAE

\* pTM

\* ipTM



Therefore, the common feature set above is intentionally limited to metrics available consistently enough for the project.



\---



\# 14. INTERPRETATION OF ALPHAFOLD METRICS



General direction:



| Metric     | Preferred direction | Meaning                               |

| ---------- | ------------------- | ------------------------------------- |

| ipTM       | Higher              | Interface/relative chain confidence   |

| pTM        | Higher              | Global structural/topology confidence |

| pLDDT      | Higher              | Local structural confidence           |

| Mean PAE   | Lower               | Lower positional uncertainty          |

| Median PAE | Lower               | Lower typical positional uncertainty  |

| PAE range  | Initially lower     | More consistent PAE spread            |



Important:



A high AlphaFold confidence score does NOT prove biological binding.



AlphaFold can produce highly confident but biologically incorrect complexes.



Therefore AlphaFold is one evidence layer, not the final answer.



\---



\# 15. ALPHAFOLD SCORE



A composite AlphaFold Score (AFS) is being considered.



The mathematical structure is:



AFS = weighted combination of normalized AlphaFold features.



Conceptually:



AFS =

w1(ipTM\_normalized)



\* w2(pTM\_normalized)

\* w3(pLDDT\_normalized)

\* w4(mean\_PAE\_normalized)

\* w5(median\_PAE\_normalized)

\* w6(PAE\_range\_normalized)



with:



w1 + w2 + w3 + w4 + w5 + w6 = 1



For PAE metrics, because lower is generally better, the normalized values must be inverted.



Example:



PAE\_score = 1 − normalized\_PAE



Do NOT add raw metrics directly because their scales differ.



\---



\# 16. CRITICAL ISSUE: COEFFICIENTS



The coefficients are NOT experimentally validated coefficients.



Do not claim that a particular weighting formula has been biologically validated.



The coefficient-selection strategy should instead be:



1\. Literature/domain rationale

2\. Normalize features

3\. Examine correlations between features

4\. Identify redundant features

5\. Choose an initial interpretable weighting scheme

6\. Perform sensitivity analysis

7\. Evaluate whether rankings are robust to reasonable changes in weights

8\. Report the final weights transparently



The project should NOT pretend that the coefficients were "learned" from experimental binding data because such labels do not currently exist.



PCA may be used to understand variance/redundancy, but PCA loadings should NOT automatically be interpreted as biological importance.



\---



\# 17. LITERATURE BASIS FOR ALPHAFOLD METRICS



The project has identified research supporting the use of AlphaFold confidence metrics as indicators of structural/interface prediction quality.



Important distinction:



Research supports the usefulness of individual metrics such as ipTM/pTM/PAE/pLDDT.



It does NOT validate the project's custom TNBC-specific weighted AlphaFold Score.



Therefore:



\*\*Literature validates the underlying metrics, not our custom coefficient formula.\*\*



A useful precedent is the AlphaFold-Multimer ranking confidence formulation:



\*\*0.8 × ipTM + 0.2 × pTM\*\*



This provides literature/algorithmic precedent for assigning greater weight to ipTM than pTM.



However, this should only be treated as a starting point/rationale and not copied blindly as the final project score.



\---



\# 18. PRODIGY



PRODIGY is used as an independent computational affinity/evidence layer.



The collected information includes:



\* ΔG

\* Kd

\* intermolecular contacts

\* % apolar NIS residues

\* % charged NIS residues

\* charged–charged contacts

\* charged–polar contacts

\* charged–apolar contacts

\* polar–polar contacts

\* apolar–polar contacts

\* apolar–apolar contacts



The six contact categories sum to the total number of intermolecular contacts.



\---



\# 19. IMPORTANT PRODIGY FEATURE ENGINEERING ISSUE



Do not blindly treat every PRODIGY output as an independent machine-learning feature.



Important redundancy:



\### ΔG and Kd



They are mathematically related.



Therefore including both at full independent weight can double-count affinity information.



\### Contact categories and total contacts



The six contact categories sum to total intermolecular contacts.



Therefore including all six contact categories PLUS total contacts can also create redundancy.



This should be considered during later feature selection/scoring.



\---



\# 20. STRING



STRING is used as an external biological interaction/evidence layer.



Collected STRING information includes:



\* co-expression

\* experimental/biochemical data

\* association in curated databases

\* co-mentioned in PubMed/text mining

\* combined score



STRING is NOT a direct binding-energy predictor.



It provides biological/network evidence and context.



A high STRING combined score means STRING has substantial evidence supporting association between the proteins.



It does not necessarily mean direct physical binding.



\---



\# 21. STRING EVIDENCE PROVENANCE



The individual STRING evidence channels should be retained where possible.



For example:



A candidate with a high combined score driven mainly by experimental/biochemical evidence is more informative than one where the evidence is mostly text mining.



Therefore the final framework should preserve:



\*\*Combined Score + evidence provenance\*\*



rather than treating the combined score as if it were an experimental binding affinity.



\---



\# 22. STRING ABSENCE OF EVIDENCE



If no STRING evidence is found:



\*\*Do NOT enter 0.\*\*



Use:



\*\*NA / No STRING evidence found\*\*



Reason:



Absence of STRING evidence does not mean that the interaction does not exist.



This distinction is especially important because a computationally strong interaction with no previous STRING evidence could potentially represent a novel candidate.



Therefore:



\### Strong computational evidence + strong STRING evidence



→ evidence-supported candidate



\### Strong computational evidence + no STRING evidence



→ potentially novel candidate requiring validation



\### Weak computational evidence + STRING evidence



→ biologically associated but structurally less convincing candidate



This creates a useful distinction between:



\*\*evidence-supported candidates\*\* and \*\*potentially novel candidates\*\*.



\---



\# 23. INTEGRIN αvβ3 SPECIAL CASE



For αvβ3 integrin:



The receptor consists of:



\* ITGAV

\* ITGB3



STRING does not directly provide a single "candidate–αvβ3 heterodimer score" in the same way.



Therefore query:



\*\*candidate → ITGAV\*\*



and



\*\*candidate → ITGB3\*\*



separately.



If a single derived feature is required, the current simple approach is:



\*\*STRING Best Subunit Score = max(candidate–ITGAV, candidate–ITGB3)\*\*



But retain both raw subunit scores in the underlying data.



Do NOT pretend the max score is a direct αvβ3-specific STRING score.



\---



\# 24. CURRENT DATA-COLLECTION PHILOSOPHY



The raw STRING and PRODIGY outputs are being stored directly inside spreadsheet cells.



This is intentional.



Separate text files are not required.



Later Python scripts can parse these cells and convert the raw information into structured numerical columns.



The master dataset should preserve the raw information before transformation.



This provides reproducibility and allows feature extraction to be modified later without repeating the computational experiments.



\---



\# 25. OVERALL COMPUTATIONAL PIPELINE



The complete pipeline is:



\## STEP 1 — TNBC target selection



Identify biologically relevant TNBC-associated cell-surface receptors.



↓



\## STEP 2 — Accessibility filtering



Focus on extracellularly accessible receptor regions/domains.



↓



\## STEP 3 — Candidate exosomal protein selection



Select biologically plausible candidate exosomal proteins.



↓



\## STEP 4 — Group A / Group B construction



Group A:

biologically selected candidates.



Group B:

related/background contextual controls.



↓



\## STEP 5 — Complex prediction



Run AlphaFold/ColabFold for receptor–candidate pairs.



↓



\## STEP 6 — AlphaFold feature extraction



Extract:



\* mean pLDDT

\* mean PAE

\* median PAE

\* PAE range

\* pTM

\* ipTM



↓



\## STEP 7 — Affinity estimation



Run PRODIGY.



Extract:



\* ΔG

\* Kd

\* intermolecular contacts

\* NIS properties

\* contact composition



↓



\## STEP 8 — External biological evidence



Query STRING.



Extract:



\* combined score

\* evidence channels

\* relevant interaction evidence



↓



\## STEP 9 — Feature normalization



Convert metrics with different scales into comparable 0–1 scores.



↓



\## STEP 10 — Feature redundancy analysis



Check correlations and identify features that are mathematically/biologically redundant.



↓



\## STEP 11 — AlphaFold Score



Create a transparent weighted structural-confidence score.



↓



\## STEP 12 — PRODIGY score



Create a normalized affinity-related score while avoiding double counting.



↓



\## STEP 13 — STRING evidence score



Create an evidence/context score while distinguishing absence of evidence from negative evidence.



↓



\## STEP 14 — Biological compatibility score



Potentially include biological features such as:



\* exosomal association

\* extracellular localization

\* accessibility

\* biological plausibility

\* receptor relevance



↓



\## STEP 15 — Integrated Targeting Priority Score



Combine the evidence layers.



Conceptually:



TPS =

wAF × AFS

\+

wPRODIGY × PS

\+

wSTRING × SS

\+

wBIO × BS



where the weights sum to 1.



↓



\## STEP 16 — Rank all receptor–protein pairs



Generate a prioritized list.



↓



\## STEP 17 — Visualize



Potential visualizations:



\* receptor × candidate heatmap

\* AlphaFold score heatmap

\* PRODIGY affinity heatmap

\* integrated priority heatmap

\* Group A vs Group B comparison

\* top candidate ranking



\---



\# 26. THE FINAL PRODUCT CONCEPT



The project should ultimately be presented as a computational prioritization platform.



Possible working name:



\*\*EXO-RANK\*\*



Possible description:



> A multi-layer computational screening and prioritization platform for identifying candidate exosomal proteins for targeted delivery to TNBC-associated receptors.



Alternative names considered:



\* EXO-TARGET

\* ExoPRISM

\* EXO-SCAN



Do not call the system "AI-driven" unless an actual machine-learning component is implemented.



The current core workflow is computational biology, not necessarily AI.



If ML is added later, describe it as:



\*\*AI-assisted prioritization\*\*



rather than claiming that AI proves protein binding.



\---



\# 27. POTENTIAL ML COMPONENT



A machine-learning layer may eventually be added.



However, there are no experimentally labeled positive/negative interaction outcomes for the 200 pairs.



Therefore conventional supervised classification is not currently justified.



One-Class SVM or other unsupervised/anomaly-detection methods could potentially be explored, but:



\*\*an outlier is not automatically a good interaction.\*\*



An unsupervised model should therefore not be the main biological decision-maker.



If used, it should function as an additional pattern/novelty layer.



The interpretable evidence-based score remains central.



\---



\# 28. MAJOR SCIENTIFIC LIMITATIONS



The project must explicitly recognize:



1\. AlphaFold predictions are not experimental evidence of binding.

2\. High ipTM does not guarantee biological interaction.

3\. PRODIGY estimates affinity computationally; it does not experimentally measure affinity.

4\. STRING association does not necessarily mean direct physical binding.

5\. Absence from STRING does not mean absence of interaction.

6\. Candidate preselection can introduce selection bias.

7\. Group B reduces but does not completely eliminate selection bias.

8\. The custom scoring coefficients are not experimentally validated.

9\. PAE range is an indirect feature and should not be overinterpreted.

10\. Full-length/domain choice can affect AlphaFold predictions.

11\. The current dataset size is suitable for an initial computational screen but not sufficient to establish biological truth.

12\. Experimental validation is required for confirmation.



\---



\# 29. HOW TO DESCRIBE THE PROJECT'S CLAIM



The strongest claim is:



> "The platform prioritizes candidate exosomal protein–TNBC receptor pairs for experimental validation by integrating structural confidence, predicted interaction affinity, external biological evidence, and biological compatibility."



Avoid:



> "The platform identifies which exosomal proteins bind TNBC receptors."



The first is defensible.



The second overclaims.



\---



\# 30. IMPORTANT EXAMPLE: EGFR–ANXA2



One notable candidate interaction is:



\*\*EGFR – ANXA2\*\*



STRING provided strong interaction/network evidence, with a combined score around:



\*\*0.958\*\*



PRODIGY produced approximately:



\* ΔG = \*\*−17.8 kcal/mol\*\*

\* Kd ≈ \*\*8.8 × 10⁻¹⁴ M\*\*

\* intermolecular contacts ≈ \*\*187\*\*



This is an example of a computationally interesting candidate.



However, it should still be described as:



> "EGFR–ANXA2 is a computationally prioritized candidate interaction"



rather than:



> "ANXA2 is a confirmed EGFR ligand."



The result illustrates how multiple evidence layers can converge on a candidate.



\---



\# 31. WHAT THE 200 PAIRS REPRESENT



The 200 interactions are not the final scientific conclusion.



They represent the \*\*screening funnel\*\*:



TNBC-relevant receptors



→ extracellularly accessible targets



→ biologically plausible exosomal proteins



→ Group A and Group B comparison



→ structural screening



→ affinity estimation



→ external evidence



→ integrated prioritization



→ experimental validation candidates



This funnel is a central part of the project's novelty and should be preserved.



\---



\# 32. WHAT NEEDS TO HAPPEN NEXT



The raw data collection phase is essentially complete.



The next major task is \*\*data processing and scoring\*\*.



Priority order:



\### Phase 1 — Parse the raw spreadsheet



Convert raw STRING and PRODIGY text into structured numerical columns.



Extract AlphaFold values into standardized columns.



Do not alter the raw data.



\---



\### Phase 2 — Data quality control



Check:



\* missing values

\* malformed values

\* duplicate pairs

\* inconsistent names

\* inconsistent receptor identifiers

\* impossible numerical values

\* AF2 vs AF3 availability differences



Do not automatically convert missing STRING evidence into zero.



\---



\### Phase 3 — Exploratory analysis



Calculate:



\* feature distributions

\* correlations

\* redundancy

\* Group A vs Group B distributions



Visualize the data.



\---



\### Phase 4 — AlphaFold Score development



Normalize the six common AlphaFold features.



Determine reasonable coefficient structure based on:



\* biological meaning

\* literature precedent

\* feature redundancy

\* sensitivity analysis



Do not fabricate experimental validation.



\---



\### Phase 5 — PRODIGY Score



Normalize affinity-related variables while avoiding mathematical double counting.



\---



\### Phase 6 — STRING Score



Construct a transparent evidence score.



Preserve raw evidence channels.



Treat missing STRING evidence as NA rather than zero.



\---



\### Phase 7 — Integrated score



Combine the evidence layers into a Targeting Priority Score.



\---



\### Phase 8 — Ranking and visualization



Produce:



\* ranked receptor–protein pairs

\* receptor-specific top candidates

\* Group A vs Group B comparison

\* heatmaps

\* candidate profiles



\---



\# 33. CODING PRINCIPLES FOR CLAUDE CODE



When writing code for this project:



1\. NEVER overwrite the raw spreadsheet.

2\. Always create a processed copy/dataframe.

3\. Preserve raw STRING/PRODIGY text.

4\. Keep raw AlphaFold values.

5\. Keep transformed/normalized values in separate columns.

6\. Make every scoring formula explicit.

7\. Store coefficients in one clearly defined configuration section.

8\. Do not hard-code unexplained biological assumptions.

9\. Handle NA values explicitly.

10\. Never replace missing STRING evidence with 0 without explicit justification.

11\. Keep receptor and protein identifiers consistent.

12\. Make scripts reproducible.

13\. Produce intermediate CSV files so every stage can be inspected.

14\. Generate plots programmatically.

15\. Keep the analysis explainable enough for an ideathon presentation.

16\. Do not introduce machine learning merely for the sake of calling the project AI.

17\. Do not claim experimental validation where only computational evidence exists.



\---



\# 34. FINAL OBJECTIVE



The final output should answer four questions:



\### 1. Which receptor–protein pairs look most promising?



Ranked candidate list.



\### 2. Why were they prioritized?



Explain using:



\* AlphaFold structural confidence

\* predicted affinity

\* STRING evidence

\* biological compatibility



\### 3. Are the results robust?



Use:



\* feature correlation analysis

\* sensitivity analysis

\* Group A vs Group B comparison



\### 4. What should be experimentally tested first?



Produce a short list of top candidates for experimental validation.



\---



\# 35. CENTRAL PROJECT PHILOSOPHY



The platform is not intended to replace laboratory experiments.



It is intended to reduce the search space.



Instead of experimentally testing hundreds of possible exosomal protein–receptor combinations blindly:



\*\*Computational screening → prioritize a smaller set → experimental validation\*\*



The core value proposition is:



> \*\*EXO-RANK does not replace experimental validation — it tells researchers which candidates are worth validating first.\*\*



\---



\# 36. CURRENT STATUS



\### Completed / substantially completed



\* TNBC receptor panel

\* candidate exosomal protein selection

\* Group A / Group B design

\* approximately 200 receptor–protein pairs

\* UniProt sequence collection

\* extracellular-domain sequence preparation where appropriate

\* AlphaFold/ColabFold predictions

\* AlphaFold3 predictions where required

\* AlphaFold raw confidence data collection

\* PRODIGY analysis

\* STRING analysis

\* master spreadsheet/raw data collection



\### Current task



\*\*Turn the collected raw data into a reproducible scoring and prioritization system.\*\*



The immediate next step is NOT to blindly choose coefficients.



First:



\*\*parse → clean → normalize → analyze correlations → reduce redundancy → establish interpretable initial weights → sensitivity analysis → finalize scoring.\*\*



Only after this should the final AlphaFold Score and integrated Targeting Priority Score be locked.



\---



\# 37. INSTRUCTIONS TO CLAUDE CODE



Treat everything above as the established project context.



Do not redesign the biological strategy unless explicitly asked.



Do not add unnecessary computational complexity.



Do not invent experimental validation.



Do not treat AlphaFold confidence as proof of binding.



Do not treat STRING score as binding affinity.



Do not treat missing STRING evidence as negative evidence.



Do not invent coefficient values and present them as validated.



The immediate goal is to help transform the existing \~200-pair raw dataset into a transparent, reproducible, statistically defensible prioritization pipeline.



When proposing changes, clearly distinguish:



\* \*\*existing project decisions\*\*

\* \*\*new recommendations\*\*

\* \*\*optional improvements\*\*



The project is being optimized for both scientific defensibility and an ideathon presentation.



Prioritize interpretability, reproducibility, biological reasoning, and practical implementation over unnecessary complexity.



