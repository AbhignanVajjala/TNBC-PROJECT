import evidence from "./evidence.json";
import type { ExoRankInteraction } from "../services/api";
import { ReceptorItem, LigandItem, PairScoreData } from '../types';
import { displayEvidenceText } from '../lib/text';

export const RECEPTOR_DATASET: ReceptorItem[] = [
  {
    id: "trop2",
    no: 1,
    target: "TROP2 / TACSTD2",
    uniprot: "P09758",
    groupA: ["ANXA2", "LGALS3BP", "SDCBP", "FN1", "MFGE8"],
    groupB: ["GAPDH", "LDHA", "PGK1", "ALDOA", "ENO1"],
    primer: {
      what: "A cellular surface protein frequently over-copied on cancer cell membranes.",
      whyTNBC: "Present in over 85% of triple-negative breast tumors, acting like a cellular flare for drug delivery while being scarce on most healthy tissues.",
      mechanism: "Accelerates cell migration and tumor invasion by mobilizing intracellular calcium signaling networks."
    },
    deep: {
      topology: "Type I transmembrane (Ectodomain residues 27–274 with EGF-like and thyroglobulin type-1 repeats).",
      glycosylation: "4 N-linked sites (Asn33, Asn120, Asn168, Asn208) modulating steric epitope access.",
      pathway: "Clathrin-mediated endocytosis followed by lysosomal trafficking.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "egfr",
    no: 2,
    target: "EGFR",
    uniprot: "P00533",
    groupA: ["ANXA2", "LGALS3BP", "FN1", "MFGE8", "SDCBP"],
    groupB: ["GAPDH", "LDHA", "PKM", "TPI1", "PGK1"],
    primer: {
      what: "The growth antenna receptor of epithelial cells.",
      whyTNBC: "Over-expressed in ~70% of TNBC patients, driving aggressive tumor replication where standard hormone therapies fail.",
      mechanism: "When switched on, it floods cancer cells with signals commanding rapid division and survival."
    },
    deep: {
      topology: "Type I RTK (Domains I–IV extracellular 25–645; tethered inactive conformation vs active extended dimer).",
      glycosylation: "11 recognized extracellular N-glycosylation sites influencing cetuximab/panitumumab epitopes.",
      pathway: "Dynamin-dependent clathrin-mediated endocytosis with rapid recycling loop.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "epcam",
    no: 3,
    target: "EpCAM / EPCAM",
    uniprot: "P16422",
    groupA: ["ANXA2", "LGALS3BP", "SDCBP", "FN1", "CD44"],
    groupB: ["GAPDH", "ALDOA", "ENO1", "EEF1A1", "PKM"],
    primer: {
      what: "An adhesion molecule acting like molecular velcro on epithelial cells.",
      whyTNBC: "Abundantly displayed on circulating tumor cells and aggressive primary TNBC clusters.",
      mechanism: "Promotes tumor cluster adhesion and sheds an internal fragment that enters the nucleus to spur proliferation."
    },
    deep: {
      topology: "Type I single-pass membrane glycoprotein (Ectodomain 24–265 containing TY and N-terminal domains).",
      glycosylation: "3 functional N-glycosylation sites (Asn74, Asn111, Asn198).",
      pathway: "Regulated intramembrane proteolysis (RIP) triggered by ADAM17/gamma-secretase cleavage.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "tf",
    no: 4,
    target: "Tissue Factor / F3",
    uniprot: "P13726",
    groupA: ["FN1", "THBS1", "ANXA2", "MFGE8", "LGALS3BP"],
    groupB: ["GAPDH", "LDHA", "PGK1", "TPI1", "ALDOA"],
    primer: {
      what: "A transmembrane procoagulant protein that sparks clotting.",
      whyTNBC: "Abnormally presented on aggressive TNBC cells, fueling tumor angiogenesis and metastatic vascular spread.",
      mechanism: "Binds Factor VIIa to spark intracellular signaling cascades that assist metastatic invasion."
    },
    deep: {
      topology: "Type I membrane protein with fibronectin type-III-like tandem beta-sandwich domains.",
      glycosylation: "Asn11, Asn124, Asn137 N-glycosylation sites near the canonical FVIIa binding cleft.",
      pathway: "Caveolae-mediated and lipid raft-associated internalization.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "icam1",
    no: 5,
    target: "ICAM1 / CD54",
    uniprot: "P05362",
    groupA: ["ITGB1", "ITGA6", "FN1", "MFGE8", "THBS1"],
    groupB: ["GAPDH", "LDHA", "ENO1", "PKM", "TKT"],
    primer: {
      what: "An immune docking station on cell surfaces.",
      whyTNBC: "Strongly elevated in inflammatory TNBC, creating binding sites for homing delivery vesicles.",
      mechanism: "Enables cells to tether and migrate through vessel walls into secondary metastatic sites."
    },
    deep: {
      topology: "Type I glycoprotein containing 5 immunoglobulin-like C2-type extracellular domains (residues 28–480).",
      glycosylation: "Extensively sialylated and N-glycosylated (up to 8 functional sites across Ig domains D1–D4).",
      pathway: "Macropinocytosis and caveolar engulfment.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "avb3",
    no: 6,
    target: "αvβ3 integrin / ITGAV–ITGB3",
    uniprot: "P06756 / P05106",
    groupA: ["FN1", "MFGE8", "THBS1", "ITGB1", "ITGA6"],
    groupB: ["GAPDH", "PGK1", "ALDOA", "LDHA", "ENO1"],
    primer: {
      what: "A cellular anchor receptor that binds extracellular matrix proteins.",
      whyTNBC: "Crucial driver of cancer invasion into blood vessels and bone marrow metastasis.",
      mechanism: "Detects RGD chemical motifs, allowing cancer cells to crawl along collagen and fibrin highways."
    },
    deep: {
      topology: "Heterodimeric transmembrane receptor complex with high/low affinity bent-to-extended conformational shifts.",
      glycosylation: "Multiple high-mannose and complex oligosaccharide chains on the beta-propeller headpiece.",
      pathway: "Rab21/Rab11 recycling machinery and clathrin-independent endocytic carriers.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "muc1",
    no: 7,
    target: "MUC1",
    uniprot: "P15941",
    groupA: ["LGALS3BP", "ANXA2", "FN1", "MFGE8", "THBS1"],
    groupB: ["GAPDH", "PKM", "TPI1", "PGK1", "EEF1A1"],
    primer: {
      what: "A protective molecular coat that becomes aberrantly short and exposed on tumors.",
      whyTNBC: "Cancer cells lose normal sugars on MUC1, revealing unique tumor-specific epitopes not found on healthy tissue.",
      mechanism: "Blocks immune cell recognition and binds growth factor receptors to stimulate survival."
    },
    deep: {
      topology: "Heterodimeric mucin with Variable Number Tandem Repeat (VNTR) domain; 20-aa repeating sequence.",
      glycosylation: "Truncated O-glycans (Tn and sialyl-Tn antigens) exposing the bare protein backbone (APDTRP).",
      pathway: "Macropinocytic bulk uptake and retrograde endosomal-to-Golgi transport.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "glut5",
    no: 8,
    target: "GLUT5 / SLC2A5",
    uniprot: "P22732",
    groupA: ["SLC3A2", "BSG", "ANXA2", "LGALS3BP", "SDCBP"],
    groupB: ["GAPDH", "LDHA", "ALDOA", "PGK1", "ENO1"],
    primer: {
      what: "A specialized fructose transporter heavily utilized by metabolic-reprogrammed breast cancer.",
      whyTNBC: "TNBC cells adaptively switch to fructose metabolism under glucose deprivation, overexpressing GLUT5.",
      mechanism: "Fuels aggressive pentose phosphate pathway synthesis to power rapid tumor division."
    },
    deep: {
      topology: "12-transmembrane alpha-helical major facilitator superfamily (MFS) with extracellular loop 1 (ECL1).",
      glycosylation: "Functional N-glycosylation at Asn45 in ECL1 loop facing extracellular space.",
      pathway: "Clathrin-independent carrier-mediated endocytosis.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "tem8",
    no: 9,
    target: "TEM8 / ANTXR1",
    uniprot: "Q9H6X2",
    groupA: ["FN1", "ITGB1", "MFGE8", "THBS1", "ANXA2"],
    groupB: ["GAPDH", "LDHA", "PKM", "TPI1", "ALDOA"],
    primer: {
      what: "Tumor endothelial marker 8, elevated in tumor vasculature and invasive TNBC stroma.",
      whyTNBC: "Promotes tumor angiogenesis and extracellular matrix remodeling in aggressive triple-negative tumors.",
      mechanism: "Interacts with collagen VI and alpha3 subunit of collagen alpha chains to drive metastatic invasion."
    },
    deep: {
      topology: "Type I cell surface receptor with extracellular von Willebrand factor type A (vWA) domain.",
      glycosylation: "Extracellular N-linked sites at Asn72, Asn144.",
      pathway: "Dynamin-dependent clathrin-mediated endocytic entry.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "cd44v6",
    no: 10,
    target: "GPNMB",
    uniprot: "Q14956",
    groupA: ["LGALS3BP", "FN1", "THBS1", "MFGE8", "ANXA2"],
    groupB: ["GAPDH", "PGK1", "ALDOA", "ENO1", "TKT"],
    primer: {
      what: "GPNMB: receptor listed in the authoritative TNBC candidate panel.",
      whyTNBC: "Included in the project receptor panel for computational prioritization; experimental selectivity is not established.",
      mechanism: "Metadata unavailable"
    },
    deep: {
      topology: "Metadata unavailable",
      glycosylation: "Metadata unavailable",
      pathway: "Metadata unavailable",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "folr1",
    no: 11,
    target: "LIV-1 / SLC39A6",
    uniprot: "Q13433",
    groupA: ["SLC3A2", "BSG", "ANXA2", "LGALS3BP", "SDCBP"],
    groupB: ["GAPDH", "LDHA", "PGK1", "ALDOA", "PKM"],
    primer: {
      what: "LIV-1 / SLC39A6: receptor listed in the authoritative TNBC candidate panel.",
      whyTNBC: "Included in the project receptor panel for computational prioritization; experimental selectivity is not established.",
      mechanism: "Metadata unavailable"
    },
    deep: {
      topology: "Metadata unavailable",
      glycosylation: "Metadata unavailable",
      pathway: "Metadata unavailable",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "gpnmb",
    no: 12,
    target: "PD-L1 / CD274",
    uniprot: "Q9NZQ7",
    groupA: ["LGALS3BP", "ANXA2", "SDCBP", "FN1", "MFGE8"],
    groupB: ["GAPDH", "ENO1", "LDHA", "PGK1", "TPI1"],
    primer: {
      what: "PD-L1 / CD274: receptor listed in the authoritative TNBC candidate panel.",
      whyTNBC: "Included in the project receptor panel for computational prioritization; experimental selectivity is not established.",
      mechanism: "Metadata unavailable"
    },
    deep: {
      topology: "Metadata unavailable",
      glycosylation: "Metadata unavailable",
      pathway: "Metadata unavailable",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "enpp1",
    no: 13,
    target: "CD44",
    uniprot: "P16070",
    groupA: ["FN1", "ITGB1", "MFGE8", "THBS1", "LGALS3BP"],
    groupB: ["GAPDH", "LDHA", "ALDOA", "ENO1", "PKM"],
    primer: {
      what: "CD44: receptor listed in the authoritative TNBC candidate panel.",
      whyTNBC: "Included in the project receptor panel for computational prioritization; experimental selectivity is not established.",
      mechanism: "Metadata unavailable"
    },
    deep: {
      topology: "Metadata unavailable",
      glycosylation: "Metadata unavailable",
      pathway: "Metadata unavailable",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "axl",
    no: 14,
    target: "AXL",
    uniprot: "P30530",
    groupA: ["FN1", "ITGB1", "ANXA2", "MFGE8", "LGALS3BP"],
    groupB: ["GAPDH", "PGK1", "LDHA", "TPI1", "ALDOA"],
    primer: {
      what: "A survival receptor triggered during epithelial-to-mesenchymal transition (EMT) in aggressive tumors.",
      whyTNBC: "Hyperactivated in chemotherapy-resistant TNBC, promoting multi-drug resistance and metastatic dissemination.",
      mechanism: "Binds Gas6 to trigger PI3K-AKT and MAPK anti-apoptotic cascades."
    },
    deep: {
      topology: "Type I RTK ectodomain composed of 2 Ig-like domains (Ig1, Ig2) and 2 fibronectin type III repeats (FN1, FN2).",
      glycosylation: "Multiple extracellular N-glycosylation sites modulating Gas6 homodimer pairing.",
      pathway: "Clathrin-mediated endocytosis with lysosomal degradation.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "met",
    no: 15,
    target: "MET / c-MET",
    uniprot: "P08581",
    groupA: ["FN1", "ITGB1", "ANXA2", "LGALS3BP", "HSP90AA1"],
    groupB: ["GAPDH", "LDHA", "PGK1", "ALDOA", "ENO1"],
    primer: {
      what: "A master receptor driving invasive tumor growth and metastatic branching.",
      whyTNBC: "High MET expression correlates with high tumor grade and early distant metastasis in TNBC patients.",
      mechanism: "Triggers 'invasive growth' program, activating cell motility and matrix detachment."
    },
    deep: {
      topology: "Heterodimeric receptor with extracellular Sema domain, PSI domain, and 4 IPT (Ig-like) repeats.",
      glycosylation: "Extensively N-glycosylated (11 sites) in Sema beta-propeller.",
      pathway: "Dynamin-dependent clathrin uptake and rapid sorting to recycling endosomes.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "ptk7",
    no: 16,
    target: "ROR1",
    uniprot: "Q01973",
    groupA: ["FN1", "ITGB1", "ANXA2", "LGALS3BP", "MFGE8"],
    groupB: ["GAPDH", "LDHA", "PKM", "PGK1", "TPI1"],
    primer: {
      what: "ROR1: receptor listed in the authoritative TNBC candidate panel.",
      whyTNBC: "Included in the project receptor panel for computational prioritization; experimental selectivity is not established.",
      mechanism: "Metadata unavailable"
    },
    deep: {
      topology: "Metadata unavailable",
      glycosylation: "Metadata unavailable",
      pathway: "Metadata unavailable",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "ron",
    no: 17,
    target: "RON / MST1R",
    uniprot: "Q04912",
    groupA: ["FN1", "ITGB1", "ANXA2", "MFGE8", "THBS1"],
    groupB: ["GAPDH", "ALDOA", "LDHA", "ENO1", "TKT"],
    primer: {
      what: "A macrophage-stimulating protein receptor closely related to MET that accelerates breast tumor invasiveness.",
      whyTNBC: "Expressed in approximately 50% of triple-negative tumors, driving drug resistance and EMT phenotypes.",
      mechanism: "Stimulates beta-catenin nuclear translocation and downstream migratory oncogene transcription."
    },
    deep: {
      topology: "Disulfide-linked alpha/beta heterodimer with extracellular Sema, PSI, and IPT domains.",
      glycosylation: "N-linked carbohydrate chains on Sema domain modulate ligand binding accessibility.",
      pathway: "Clathrin-mediated endocytic entry followed by Rab7-directed degradation.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "cspg4",
    no: 18,
    target: "CSPG4",
    uniprot: "Q6UVK1",
    groupA: ["FN1", "THBS1", "MFGE8", "ITGB1", "LGALS3BP"],
    groupB: ["GAPDH", "LDHA", "PGK1", "PKM", "ALDOA"],
    primer: {
      what: "A large cell surface proteoglycan involved in tumor microenvironment adhesion and motility.",
      whyTNBC: "Consistently identified on triple-negative breast cancer stem cells with very limited distribution in normal adult tissues.",
      mechanism: "Cross-talks with integrins and receptor tyrosine kinases to activate FAK and ERK survival pathways."
    },
    deep: {
      topology: "Large Type I single-pass membrane proteoglycan (ectodomain 2,221 amino acids with laminin G-like and D3 domains).",
      glycosylation: "Covalently modified with chondroitin sulfate glycosaminoglycan chains.",
      pathway: "Macropinocytic uptake and caveolae-associated internalization.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "igf1r",
    no: 19,
    target: "IGF1R",
    uniprot: "P08069",
    groupA: ["FN1", "ITGB1", "ANXA2", "MFGE8", "LGALS3BP"],
    groupB: ["GAPDH", "ENO1", "LDHA", "PGK1", "TPI1"],
    primer: {
      what: "A prominent receptor transmitting growth and anti-death commands inside cancer cells.",
      whyTNBC: "Acts as a primary survival escape valve when triple-negative tumors are challenged with chemotherapy.",
      mechanism: "Suppresses apoptosis through persistent AKT activation and facilitates metastatic homing."
    },
    deep: {
      topology: "Heterotetrameric complex (alpha2-beta2) with extracellular L1, CR, and L2 domains.",
      glycosylation: "16 functional N-glycosylation sites distributed along the extracellular alpha-subunits.",
      pathway: "Clathrin-mediated endocytosis regulated by beta-arrestin ubiquitination.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  {
    id: "cxcr4",
    no: 20,
    target: "CXCR4",
    uniprot: "P61073",
    groupA: ["FN1", "LGALS3BP", "ANXA2", "MFGE8", "ITGB1"],
    groupB: ["GAPDH", "LDHA", "PKM", "ALDOA", "ENO1"],
    primer: {
      what: "A chemokine homing receptor that directs breast cancer cells toward metastatic niches.",
      whyTNBC: "Mediates homing of triple-negative breast cancer cells toward lungs, liver, and bone where CXCL12 is secreted.",
      mechanism: "Promotes directed chemotaxis, cytoskeleton rearrangement, and extravasation into vital organs."
    },
    deep: {
      topology: "7-transmembrane G-protein coupled receptor (GPCR) with extracellular N-terminus and 3 ECL loops.",
      glycosylation: "Functional N-glycosylation at Asn11 in the extracellular N-terminus.",
      pathway: "Agonist-induced beta-arrestin recruitment and rapid clathrin-dependent endocytosis.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  }
];

export const LIGANDS_DATABASE: Record<string, LigandItem> = {
  anxa2: {
    id: "anxa2",
    name: "Annexin A2 (ANXA2)",
    uniprot: "P07355",
    primer: {
      what: "A flexible membrane-binding protein that coats the outside of extracellular vesicles.",
      howEV: "Binds tightly to phospholipid vesicle membranes in the presence of calcium, forming an outward-facing delivery scaffold.",
      metaphor: "Acts as a cellular grappling hook that helps vesicles touch and merge with target cancer membranes."
    },
    deep: {
      scaffoldType: "Peripheral membrane protein via conserved four-domain annexin repeat core.",
      topology: "Presents accessible N-terminus (residues 1–33) and C-terminal calcium/phospholipid coordination loops.",
      exosomeDensity: "Enriched in small extracellular vesicles (sEVs, 50–140 nm); >450 copies per EV particle.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  lgals3bp: {
    id: "lgals3bp",
    name: "Galectin-3-Binding Protein (LGALS3BP)",
    uniprot: "Q08380",
    primer: {
      what: "A large ring-shaped secretable glycoprotein enriched on vesicle envelopes.",
      howEV: "Forms stable ring-like oligomers on the exosome outer shell, providing multi-point docking clusters.",
      metaphor: "Serves like a multi-pronged molecular hub that firmly latches onto cancer receptor complexes."
    },
    deep: {
      scaffoldType: "Secreted multidomain EV surface-associated scaffold (SRCR, BTB/POZ, and IVR domains).",
      topology: "Assembles into large dome- or ring-shaped decamers/dodecamers presenting multiple binding valencies.",
      exosomeDensity: "Abundantly recovered in exosome proteomic screens across human biological fluids.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  sdcbp: {
    id: "sdcbp",
    name: "Syntenin-1 (SDCBP)",
    uniprot: "O00560",
    primer: {
      what: "A master conductor of exosome assembly that can be engineered to display surface binders.",
      howEV: "Coordinates directly with the ALIX and ESCRT machinery to package engineered cargo directly onto vesicle membranes.",
      metaphor: "A molecular backstage manager organizing the exact placement of outward-facing receptor hooks."
    },
    deep: {
      scaffoldType: "Tandem PDZ-domain intracellular/transmembrane adaptor protein.",
      topology: "Dual PDZ domains (PDZ1 & PDZ2) coupled with N-terminal ESCRT-binding motifs.",
      exosomeDensity: "Canonical exosome biogenesis biomarker; drives syndecan-syntenin-ALIX budding cascade.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  fn1: {
    id: "fn1",
    name: "Fibronectin (FN1)",
    uniprot: "P02751",
    primer: {
      what: "A master adhesion protein that weaves vesicles into cancer extracellular matrices.",
      howEV: "Covers the exosomal perimeter, naturally seeking out integrin receptors abundant on invasive tumors.",
      metaphor: "Acts as high-affinity bio-adhesive tape that pins the vesicle against tumor cell membranes."
    },
    deep: {
      scaffoldType: "High molecular weight multidomain glycoprotein dimer linked by antiparallel C-terminal disulfides.",
      topology: "Contains Type I, II, and III repeats including the canonical RGD-containing III-10 module.",
      exosomeDensity: "Constitutively tethered to exosomal integrin complexes during biogenesis.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  mfge8: {
    id: "mfge8",
    name: "Lactadherin / MFGE8",
    uniprot: "Q08431",
    primer: {
      what: "A specialized milk-fat vesicle protein with an instinctive affinity for membrane surfaces.",
      howEV: "Its C-terminal discoidin domains insert into vesicle lipids while its EGF domain points outward to capture tumors.",
      metaphor: "Functions like a double-sided suction cup: anchoring onto the vesicle while seizing the target cell."
    },
    deep: {
      scaffoldType: "Peripheral EV membrane protein with tandem C1/C2 discoidin-type phospholipid-binding domains.",
      topology: "N-terminal EGF-like domain harboring an active RGD motif coupled to membrane-inserting C2 domain.",
      exosomeDensity: "High stereospecific affinity for phosphatidylserine (PS) outer-leaflet microdomains.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  cd44: {
    id: "cd44",
    name: "CD44",
    uniprot: "P16070",
    primer: {
      what: "A versatile cell-adhesion and hyaluronan-binding glycoprotein naturally sorted into EV membranes.",
      howEV: "Inserts via single transmembrane span with outward-projecting link domain and mucin-like stalk.",
      metaphor: "A targeted molecular beacon that naturally docks onto tumor extracellular hyaluronic matrix."
    },
    deep: {
      scaffoldType: "Type I single-pass transmembrane adhesion glycoprotein.",
      topology: "N-terminal link module (residues 21–120) with flexible heavily glycosylated stem region.",
      exosomeDensity: "Constitutive marker on aggressive cancer-derived extracellular vesicles.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  bsg: {
    id: "bsg",
    name: "Basigin / CD147 (BSG)",
    uniprot: "P35613",
    primer: {
      what: "A multifunctional transmembrane glycoprotein highly enriched on exosomal membranes.",
      howEV: "Forms stable complexes with monocarboxylate transporters on the exosome bilayer.",
      metaphor: "A molecular wedge that facilitates vesicle association with metabolic receptors on tumors."
    },
    deep: {
      scaffoldType: "Type I single-pass transmembrane glycoprotein with 2 Ig-like domains.",
      topology: "Extracellular Ig0 and Ig1 domains presenting solvent-exposed binding surfaces.",
      exosomeDensity: "Abundantly sorted into microvesicles and exosomes; copurifies with tetraspanin-enriched domains.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  thbs1: {
    id: "thbs1",
    name: "Thrombospondin-1 (THBS1)",
    uniprot: "P07996",
    primer: {
      what: "A large adhesive homotrimeric glycoprotein that binds diverse cancer receptor families.",
      howEV: "Coats extracellular vesicles, providing multiple interaction valencies for surface docking.",
      metaphor: "A three-armed docking claw capturing multiple tumor surface targets simultaneously."
    },
    deep: {
      scaffoldType: "Disulfide-linked homotrimeric multidomain EV surface-associated adhesive protein.",
      topology: "TSR type 1 repeats, EGF-like type 2 repeats, and calcium-binding type 3 repeats.",
      exosomeDensity: "Frequently detected in exosome secretomes of activated stromal and vascular cells.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  itgb1: {
    id: "itgb1",
    name: "Integrin beta-1 / CD29 (ITGB1)",
    uniprot: "P05556",
    primer: {
      what: "A prominent adhesion heterodimer partner essential for exosome tropism to metastatic sites.",
      howEV: "Embedded across the vesicle lipid bilayer, determining organ-specific delivery homing.",
      metaphor: "A navigation antenna steering vesicles directly toward receptor-dense tumor microenvironments."
    },
    deep: {
      topology: "Transmembrane beta subunit with vWFA-like MIDAS headpiece domain.",
      scaffoldType: "Transmembrane integrin complex scaffold.",
      exosomeDensity: "Core component of the exosomal integrin repertoire governing organotropic homing.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  itga6: {
    id: "itga6",
    name: "Integrin alpha-6 / CD49f (ITGA6)",
    uniprot: "P23229",
    primer: {
      what: "A transmembrane laminin receptor that pairs with beta integrins to home vesicles toward metastatic seeds.",
      howEV: "Anchored in vesicle bilayers, directing exosome uptake by tumor cells.",
      metaphor: "A targeting GPS locked onto laminin and oncogenic extracellular matrix proteins."
    },
    deep: {
      topology: "Cleaved heavy/light chain heterodimer with 7-bladed beta-propeller headpiece.",
      scaffoldType: "Type I transmembrane integrin alpha subunit.",
      exosomeDensity: "Documented driver of exosome lung and brain organotropism.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  slc3a2: {
    id: "slc3a2",
    name: "CD98hc / SLC3A2",
    uniprot: "P08195",
    primer: {
      what: "A heavy-chain chaperone glycoprotein that pairs with amino acid transporters on exosome membranes.",
      howEV: "Spans vesicle membranes while displaying a large extracellular catalytic-like domain.",
      metaphor: "A sturdy loading dock displaying functional targeting motifs safely outside the exosome shell."
    },
    deep: {
      topology: "Type II transmembrane glycoprotein with large extracellular alpha-amylase-like domain (residues 206–630).",
      scaffoldType: "Type II transmembrane scaffold.",
      exosomeDensity: "Constitutively enriched in exosome proteomic preparations.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  hsp90aa1: {
    id: "hsp90aa1",
    name: "Hsp90-alpha (HSP90AA1)",
    uniprot: "P07900",
    primer: {
      what: "A molecular chaperone that is actively secreted onto vesicle surfaces in stressful tumor conditions.",
      howEV: "Tethers to the vesicle outer surface, stabilizing client surface proteins and binding target complexes.",
      metaphor: "A protective molecular armor that stabilizes exosome targeting complexes during delivery."
    },
    deep: {
      topology: "Multidomain homodimeric molecular chaperone consisting of N-terminal ATP-binding, middle, and C-terminal domains.",
      scaffoldType: "Surface-associated molecular chaperone.",
      exosomeDensity: "Markedly enriched on exosome membranes shed by aggressive cancer cells.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  cd9: {
    id: "cd9",
    name: "CD9 Tetraspanin",
    uniprot: "P21926",
    primer: {
      what: "The quintessential exosome surface marker protein that forms dense clusters across vesicle membranes.",
      howEV: "Spans the lipid bilayer four times, projecting a large extracellular loop (EC2) that serves as an outward receptor docking pad.",
      metaphor: "The signature exterior insignia of natural exosomes, organizing surface binders into stable clusters."
    },
    deep: {
      scaffoldType: "Tetraspanin four-transmembrane domain integral membrane scaffold.",
      topology: "4 transmembrane domains with Small Extracellular Loop (EC1) and Large Extracellular Loop (EC2, residues 112–195).",
      exosomeDensity: "Highest copy-number marker in human exosome proteomes (>120 copies per vesicle).",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  cd63: {
    id: "cd63",
    name: "CD63 Tetraspanin / LAMP-3",
    uniprot: "P08962",
    primer: {
      what: "A canonical exosomal tetraspanin that directs vesicle intracellular sorting and cell-surface docking.",
      howEV: "Concentrated into tetraspanin-enriched microdomains (TEMs) on exosome membranes, ideal for surface presentation.",
      metaphor: "A specialized membrane anchor that directs vesicles straight into cellular endosomal pathways."
    },
    deep: {
      scaffoldType: "Four-pass transmembrane tetraspanin integral scaffold.",
      topology: "Extracellular EC2 loop (residues 103–203) with 3 conserved N-glycosylation sites.",
      exosomeDensity: "Enriched specifically in endosome-derived exosomes; hallmark of endolysosomal secretion.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  },
  cd81: {
    id: "cd81",
    name: "CD81 Tetraspanin / TAPA-1",
    uniprot: "P60033",
    primer: {
      what: "A key organizer of exosome surface protein complexes that facilitates cellular entry and docking.",
      howEV: "Forms the structural core of exosomal protein clusters, projecting an adaptable EC2 binding loop.",
      metaphor: "A master socket on the exosome shell that plugs neatly into tumor receptor clusters."
    },
    deep: {
      scaffoldType: "Tetraspanin transmembrane organizer scaffold.",
      topology: "4 transmembrane alpha-helices with disulfide-stabilized EC2 loop (residues 113–201).",
      exosomeDensity: "Core tetraspanin universally required for exosome biogenesis and viral-like entry dynamics.",
      docking: "Pair-specific predictions appear in the analysis view with source provenance."
    }
  }
};

// Known high-fidelity docking benchmark statistics
// Values are copied from the locked backend records, without re-scoring.
export const EVIDENCE = evidence.interactions as unknown as Record<string, ExoRankInteraction>;
export const EVIDENCE_SOURCES = evidence.sources;
export function getPairEvidence(receptorId: string, ligandId: string): ExoRankInteraction | null {
  const receptor = RECEPTOR_DATASET.find(r => r.id.toLowerCase() === receptorId.toLowerCase());
  return receptor ? EVIDENCE[`T${receptor.no}_${ligandId.toUpperCase()}`] || null : null;
}
export function getLigand(id: string): LigandItem {
  const key = id.toLowerCase();
  if (LIGANDS_DATABASE[key]) return LIGANDS_DATABASE[key];
  const item = Object.values(EVIDENCE).find(r => r.candidate_protein.toLowerCase() === key);
  const missing = 'Metadata unavailable';
  return {id:key, name:id.toUpperCase(), uniprot:item?.biology.uniprot_id || missing,
    primer:{what:displayEvidenceText(item?.biology.reason || missing), howEV:item?.biology.localization || missing, metaphor:missing},
    deep:{scaffoldType:item?.biology.surface_feasibility || missing, topology:item?.biology.localization || missing,
      exosomeDensity:missing, docking:missing}};
}
export function getPairScore(receptorId: string, ligandId: string): PairScoreData {
  const r = getPairEvidence(receptorId, ligandId);
  return {score:r?.final.TPS ?? null, tier:r ? (r.final.preferred ? 'Prioritized for validation' : 'Outside preferred shortlist') : 'Not calculated',
    deltaG:r?.prodigy.delta_G ?? null, kd:r?.prodigy.Kd == null ? null : r.prodigy.Kd * 1e9,
    interfaceArea:null, ipTM:r?.alphafold.ipTM ?? null, pae:r?.alphafold.interface_PAE ?? null,
    scores:{structural:r?.alphafold.AFS ?? null, affinity:r?.prodigy.PS ?? null, specificity:null, density:null, evidence:r?.string.SS ?? null}, hotspots:[]};
}
