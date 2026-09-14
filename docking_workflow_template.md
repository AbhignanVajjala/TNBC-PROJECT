# **VESICON: Trop-2 Docking Region Definition Template**

## 🧭 Project Overview
**Goal**: Screen 100 candidate proteins against Trop-2 (TACSTD2) using AutoDock Vina.  
**Current Phase**: Define the docking region on Trop-2 for the first test (Trop-2 + CD63).

---

## 🧰 Step-by-Step Workflow

### 🛠️ Step 1: Understand the Vina Docking Box
**Purpose**: Define a 3D search region for ligand-receptor interaction.  
**Why it’s necessary**:  
- Focuses computational resources on biologically relevant areas.  
- Reduces false positives by avoiding irrelevant surface regions.  

---

### 🧪 Step 2: Determine the Docking Region
#### 🔍 Available Information
- Trop-2 structure from AlphaFold (AF-P09758-F1).  
- No experimental binding site data.  

#### ✅ Exploratory Approach
1. **Use PyMOL to inspect the Trop-2 surface**.  
2. **Identify a plausible interaction region** (e.g., surface-exposed loops, domain interfaces).  

---

### 🧠 Step 3: Tools and Commands
#### 🛠️ 1. Load Trop-2 in PyMOL
```bash
# Open PyMOL and load the Trop-2 PDB
pymol "Target_Receptor\TACSTD2_Trop2_P09758.pdb"
```

#### 🛠️ 2. Visual Inspection in PyMOL
- **Commands in PyMOL**:  
  ```python
  as surface  # View the protein surface
  show cartoon  # Highlight secondary structure
  ```
- **Look for**: Surface-exposed regions (e.g., grooves, loops, or domain interfaces).  

#### 🛠️ 3. Extract Coordinates for the Docking Box
- **Manually note coordinates** (e.g., center_x/y/z and size_x/y/z).  
  Example:  
  ```text
  center_x = 10.0, center_y = 20.0, center_z = 30.0  
  size_x = 20.0, size_y = 20.0, size_z = 20.0
  ```

#### 🛠️ 4. Use Meeko to Write a Vina Box (Optional)
If a specific region is identified:  
```bash
python "$env:CONDA_PREFIX\Scripts\mk_prepare_receptor.py" \
  --read_pdb "Target_Receptor\TACSTD2_Trop2_P09758.pdb" \
  -o "Trop2_docking_box" \
  -v  # Writes Vina box coordinates to Trop2_docking_box_vina_box.pdb
```
- **Inspect the output file** for box coordinates.  

---

### ⚠️ Step 4: Scientific Considerations
- **Protein-Protein Docking Limitations**:  
  - Vina treats the receptor as **rigid** (no conformational changes).  
  - Scoring function is optimized for **small molecules**, not large proteins.  
  - Use results as **qualitative estimates**, not precise ΔG values.  

- **Blind Docking**: Not recommended for protein-protein interactions due to computational and methodological challenges.  

---

### 📋 Step 5: Record Your Findings
**Output**: Fill in the table below with your selected docking box parameters.  

| Parameter       | Value          |
|----------------|----------------|
| `center_x`     | [Your value]    |
| `center_y`     | [Your value]    |
| `center_z`     | [Your value]    |
| `size_x`       | [Your value]    |
| `size_y`       | [Your value]    |
| `size_z`       | [Your value]    |

---

### 🚀 Next Steps
1. **Validate the docking box** by docking CD63 (ligand) against Trop-2.  
2. **Create a Vina configuration file** for the test.  
3. **Analyze the results** to ensure the workflow is scientifically sound.  

---

## 🧾 Notes
- **Do not proceed to 100 docking runs** until the single test is validated.  
- **Send me the table above** to proceed.  
- **Scientific Terminology Reminder**: Vina outputs a **predicted docking affinity score (kcal/mol)**, not exact ΔG.