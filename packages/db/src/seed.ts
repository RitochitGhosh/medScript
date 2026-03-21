/**
 * Seed script for medical knowledge base
 * Run: npx tsx src/seed.ts
 */

import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../../../apps/web/.env.local") });

import { connectToDatabase } from "./client";
import { z } from "zod";

const seedEnv = z.object({ OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required") }).parse(process.env);

const medicalKnowledgeChunks = [
  // Common Indian Diseases
  {
    content:
      "Tuberculosis (TB) in India: TB is caused by Mycobacterium tuberculosis. Symptoms include persistent cough >2 weeks, hemoptysis, night sweats, weight loss, fever, and fatigue. First-line treatment: RNTCP DOTS regimen - Isoniazid, Rifampicin, Pyrazinamide, Ethambutol (2 months) followed by Isoniazid and Rifampicin (4 months). Drug-resistant TB (MDR-TB) requires second-line drugs.",
    metadata: {
      category: "diagnosis" as const,
      source: "RNTCP Guidelines 2024",
      tags: ["tuberculosis", "TB", "respiratory", "infectious", "India"],
    },
  },
  {
    content:
      "Dengue Fever: Caused by dengue virus (DENV 1-4) transmitted by Aedes mosquitoes. Symptoms: sudden high fever (104°F), severe headache, pain behind eyes, joint/muscle pain, rash, mild bleeding. Warning signs: severe abdominal pain, persistent vomiting, rapid breathing, bleeding gums, fatigue, restlessness, blood in vomit. Treatment is supportive - IV fluids, paracetamol (avoid NSAIDs/aspirin), platelet monitoring.",
    metadata: {
      category: "diagnosis" as const,
      source: "WHO Dengue Guidelines",
      tags: ["dengue", "fever", "mosquito-borne", "viral", "India"],
    },
  },
  {
    content:
      "Malaria in India: Plasmodium falciparum and P. vivax are most common. Symptoms: cyclic fever with chills and rigors, headache, muscle pain, nausea. Diagnosis: Rapid Diagnostic Test (RDT) or microscopy. Treatment - P. vivax: Chloroquine + Primaquine; P. falciparum: Artemisinin-based combination therapy (ACT) - Artemether-Lumefantrine. Severe malaria: IV Artesunate.",
    metadata: {
      category: "diagnosis" as const,
      source: "NVBDCP Malaria Guidelines",
      tags: ["malaria", "fever", "plasmodium", "parasitic", "India"],
    },
  },
  {
    content:
      "Typhoid Fever: Caused by Salmonella typhi. Symptoms: step-ladder fever, headache, abdominal pain, constipation or diarrhea, rose spots on trunk, hepatosplenomegaly. Complications: intestinal perforation, encephalopathy. Diagnosis: Widal test, blood culture (gold standard). Treatment: Azithromycin (uncomplicated), Ceftriaxone (severe/complicated). Avoid fluoroquinolones due to resistance.",
    metadata: {
      category: "diagnosis" as const,
      source: "IAP Guidelines",
      tags: ["typhoid", "fever", "salmonella", "enteric fever", "India"],
    },
  },
  {
    content:
      "Type 2 Diabetes in India: India has 77 million diabetics. HbA1c target <7% for most patients. First-line: Metformin 500mg BD, titrate to 1000mg BD. Add-on therapy: Sulfonylureas (Glimepiride 1-4mg), DPP-4 inhibitors (Sitagliptin 100mg OD), SGLT2 inhibitors (Dapagliflozin 10mg), GLP-1 agonists. Monitor: FBS, PPBS, HbA1c q3months, kidney function, eye exams annually.",
    metadata: {
      category: "treatment" as const,
      source: "RSSDI Guidelines 2023",
      tags: ["diabetes", "T2DM", "glucose", "insulin", "metformin", "India"],
    },
  },
  {
    content:
      "Hypertension Management in India: Target BP <130/80 mmHg. First-line: ACE inhibitors (Enalapril 5-20mg), ARBs (Losartan 50-100mg), CCBs (Amlodipine 2.5-10mg), Thiazide diuretics (Hydrochlorothiazide 12.5-25mg). Combination preferred for BP >160/100. Lifestyle: salt restriction <5g/day, exercise, weight loss. Monitor: BP, renal function, electrolytes.",
    metadata: {
      category: "treatment" as const,
      source: "CSI Hypertension Guidelines 2023",
      tags: ["hypertension", "blood pressure", "cardiovascular", "amlodipine", "India"],
    },
  },
  // WHO Essential Medicines
  {
    content:
      "Amoxicillin: Broad-spectrum penicillin antibiotic. Indications: respiratory tract infections, UTI, skin infections, H. pylori. Adult dose: 500mg TDS (three times daily) x 7-10 days. Pediatric: 25mg/kg/day in 3 divided doses. Side effects: diarrhea, rash, allergic reactions. Contraindicated in penicillin allergy. Available as 250mg, 500mg capsules and 125mg/5mL, 250mg/5mL suspension.",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["amoxicillin", "antibiotic", "penicillin", "infection", "essential"],
    },
  },
  {
    content:
      "Metformin: Biguanide antidiabetic. First-line for Type 2 DM. Mechanism: reduces hepatic glucose production, improves insulin sensitivity. Dose: 500mg BD with meals, max 2000mg/day. India brands: Glycomet, Glucophage, Obimet. Price: Rs 30-50/month (500mg x 60 tabs). Side effects: GI upset, lactic acidosis (rare). Contraindicated: eGFR <30, contrast dye use.",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["metformin", "diabetes", "antidiabetic", "essential", "India price"],
    },
  },
  {
    content:
      "Paracetamol (Acetaminophen): Analgesic/antipyretic. Indications: fever, mild-moderate pain. Adult: 500-1000mg q4-6h, max 4g/day. Pediatric: 10-15mg/kg q4-6h. India brands: Crocin, Calpol, Dolo. Price: Rs 10-30/strip. Safe in pregnancy. Caution: liver disease, alcohol use. Overdose causes hepatotoxicity - treatment with N-acetylcysteine.",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["paracetamol", "acetaminophen", "fever", "pain", "essential", "India"],
    },
  },
  {
    content:
      "Atorvastatin: HMG-CoA reductase inhibitor (statin). Indications: hyperlipidemia, cardiovascular risk reduction. Dose: 10-80mg OD at night. India brands: Atorva, Lipitor, Tonact. Price: Rs 40-120/month. Reduces LDL by 30-50%. Side effects: myopathy, liver enzyme elevation. Monitor: LFTs at baseline, lipid profile q6months. Drug interactions: macrolides, azole antifungals, fibrates.",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["atorvastatin", "statin", "cholesterol", "cardiovascular", "India"],
    },
  },
  {
    content:
      "Amlodipine: Calcium channel blocker. Indications: hypertension, angina. Dose: 2.5-10mg OD. India brands: Amlip, Amlogard, Norvasc. Price: Rs 30-80/month. Long-acting (t½ 35-50 hours). Side effects: ankle edema, flushing, headache. Safe in elderly, renal impairment. Drug interaction: simvastatin (max 20mg with amlodipine).",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["amlodipine", "calcium channel blocker", "hypertension", "CCB", "India"],
    },
  },
  {
    content:
      "Omeprazole: Proton pump inhibitor (PPI). Indications: GERD, peptic ulcer, H. pylori eradication (triple therapy). Dose: 20-40mg OD before meals. India brands: Omez, Prilosec, Omepep. Price: Rs 40-80/month. Side effects: headache, diarrhea, hypomagnesemia (long-term). Reduce dose in liver disease. B12 deficiency with long-term use.",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["omeprazole", "PPI", "GERD", "ulcer", "gastric", "India"],
    },
  },
  {
    content:
      "Azithromycin: Macrolide antibiotic. Indications: community-acquired pneumonia, typhoid, STIs, skin infections. Z-pack: 500mg day 1, then 250mg days 2-5. Typhoid: 1g/day x 5 days. India brands: Azithral, Zithromax, Azee. Price: Rs 70-150/course. Side effects: GI upset, QT prolongation. Drug interactions: warfarin, digoxin, antacids (separate by 2 hours).",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["azithromycin", "macrolide", "antibiotic", "typhoid", "pneumonia", "India"],
    },
  },
  {
    content:
      "Cetirizine: Second-generation antihistamine. Indications: allergic rhinitis, urticaria, pruritus. Dose: 10mg OD. Pediatric: 5mg OD (6-11 years). India brands: Cetzine, Zyrtec, Alerid. Price: Rs 15-30/strip. Less sedating than first-generation. Renal dose adjustment needed. Side effects: mild sedation, dry mouth. Safe in pregnancy (Category B).",
    metadata: {
      category: "drug" as const,
      source: "WHO EML 2023",
      tags: ["cetirizine", "antihistamine", "allergy", "urticaria", "India"],
    },
  },
  {
    content:
      "Chloroquine Phosphate: Antimalarial. Indications: P. vivax malaria, prophylaxis in chloroquine-sensitive areas. Dose: 600mg base loading, then 300mg at 6h, 24h, 48h. Prophylaxis: 300mg weekly. India brands: Lariago, Resochin. Price: Rs 20-50/course. Side effects: nausea, pruritus, retinal toxicity (long-term). Resistance widespread for P. falciparum in India.",
    metadata: {
      category: "drug" as const,
      source: "NVBDCP Guidelines",
      tags: ["chloroquine", "antimalarial", "malaria", "vivax", "India"],
    },
  },
  {
    content:
      "Artemether-Lumefantrine (Coartem): First-line ACT for uncomplicated P. falciparum malaria. Dose: weight-based, typically 4 tabs (20mg/120mg) BD x 3 days with fatty food. India brands: Coartem, Lumartem. Price: Rs 200-400/course. Side effects: headache, dizziness, palpitations. Take with food (improves absorption). QT prolongation - avoid with other QT-prolonging drugs.",
    metadata: {
      category: "drug" as const,
      source: "WHO/NVBDCP Guidelines",
      tags: ["artemether", "lumefantrine", "ACT", "antimalarial", "falciparum"],
    },
  },
  // Drug Interactions
  {
    content:
      "DANGEROUS DRUG INTERACTION: Metformin + IV Contrast Dye. Metformin must be withheld 48 hours before and after IV contrast administration to prevent contrast-induced nephropathy leading to lactic acidosis. This is a SEVERE interaction. Monitor renal function. Resume metformin only if creatinine returns to baseline. This applies to all imaging with IV contrast (CT, angiography).",
    metadata: {
      category: "interaction" as const,
      source: "FDA Drug Safety Communications",
      tags: ["metformin", "contrast", "lactic acidosis", "drug interaction", "severe"],
    },
  },
  {
    content:
      "DRUG INTERACTION: Warfarin + Azithromycin/Metronidazole. Both azithromycin and metronidazole significantly increase warfarin anticoagulant effect, risking bleeding. Mechanism: inhibit warfarin metabolism via CYP2C9. Management: increase INR monitoring frequency (check in 3-5 days), consider 25-50% warfarin dose reduction, monitor for bleeding signs. Alternative antibiotics may be preferable.",
    metadata: {
      category: "interaction" as const,
      source: "Clinical Pharmacology Database",
      tags: ["warfarin", "azithromycin", "metronidazole", "drug interaction", "bleeding"],
    },
  },
  {
    content:
      "DRUG INTERACTION: ACE Inhibitors + Potassium-sparing Diuretics/Potassium Supplements. Combining ACE inhibitors (enalapril, lisinopril, ramipril) with potassium-sparing diuretics (spironolactone, amiloride) or K+ supplements risks HYPERKALEMIA. Monitor serum potassium closely. Avoid combination in CKD patients. Risk increases with renal impairment, diabetes, elderly patients.",
    metadata: {
      category: "interaction" as const,
      source: "British National Formulary",
      tags: ["ACE inhibitor", "spironolactone", "hyperkalemia", "drug interaction", "potassium"],
    },
  },
  {
    content:
      "DRUG INTERACTION: Statins (Simvastatin/Lovastatin) + CYP3A4 Inhibitors. Azithromycin, clarithromycin, itraconazole, ketoconazole inhibit CYP3A4, markedly increasing statin levels. Risk: rhabdomyolysis, severe myopathy. Management: avoid combination or temporarily withhold statin during antibiotic course. Atorvastatin and rosuvastatin are safer alternatives as they are less CYP3A4 dependent.",
    metadata: {
      category: "interaction" as const,
      source: "FDA Drug Safety Advisory",
      tags: ["statin", "simvastatin", "CYP3A4", "macrolide", "rhabdomyolysis", "drug interaction"],
    },
  },
  {
    content:
      "DRUG INTERACTION: NSAIDs + Antihypertensives. NSAIDs (ibuprofen, diclofenac, naproxen) blunt the effects of ACE inhibitors, ARBs, and diuretics, potentially causing blood pressure elevation and acute kidney injury. Avoid regular NSAID use in hypertensive patients on these medications. Use paracetamol as alternative analgesic. If NSAIDs necessary, monitor BP and renal function closely.",
    metadata: {
      category: "interaction" as const,
      source: "European Heart Journal Guidelines",
      tags: ["NSAIDs", "antihypertensive", "ACE inhibitor", "blood pressure", "drug interaction"],
    },
  },
  // ICD-10 Codes
  {
    content:
      "ICD-10 Codes - Respiratory Conditions: J00 Acute nasopharyngitis (common cold), J06.9 Acute upper respiratory infection unspecified, J18.9 Pneumonia unspecified, J45 Asthma, J22 Unspecified acute lower respiratory infection, A15 Respiratory tuberculosis, J40 Bronchitis not specified as acute or chronic, J44 Chronic obstructive pulmonary disease. Use specific codes when possible for proper documentation.",
    metadata: {
      category: "icd10" as const,
      source: "WHO ICD-10 2023",
      tags: ["ICD-10", "respiratory", "pneumonia", "asthma", "TB", "coding"],
    },
  },
  {
    content:
      "ICD-10 Codes - Infectious Diseases: A01.0 Typhoid fever, A09 Other gastroenteritis and colitis of infectious and unspecified origin, A90 Dengue fever (classical), A91 Dengue hemorrhagic fever, B50 Plasmodium falciparum malaria, B51 Plasmodium vivax malaria, A15-A19 Tuberculosis codes. Use additional codes for complications and comorbidities.",
    metadata: {
      category: "icd10" as const,
      source: "WHO ICD-10 2023",
      tags: ["ICD-10", "dengue", "typhoid", "malaria", "tuberculosis", "infectious", "coding"],
    },
  },
  {
    content:
      "ICD-10 Codes - Metabolic/Cardiovascular: E11 Type 2 diabetes mellitus, E11.9 Type 2 diabetes without complications, E11.4 Type 2 diabetes with diabetic neuropathy, E11.3 Type 2 diabetes with ophthalmic complications, I10 Essential hypertension, I25 Chronic ischemic heart disease, E78.5 Hyperlipidemia unspecified, E66 Obesity. Use combination codes for diabetes with complications.",
    metadata: {
      category: "icd10" as const,
      source: "WHO ICD-10 2023",
      tags: ["ICD-10", "diabetes", "hypertension", "cardiovascular", "metabolic", "coding"],
    },
  },
  {
    content:
      "LEPTOSPIROSIS in India: Bacterial zoonosis caused by Leptospira interrogans. Common in monsoon season, rural India (farmers, agricultural workers). Symptoms: sudden fever, severe headache, myalgia (calf pain), jaundice, conjunctival suffusion, renal failure (Weil's disease). Diagnosis: MAT test, PCR, ELISA. Treatment: Benzylpenicillin IV (severe), Doxycycline 100mg BD x 7 days (mild). Prophylaxis: Doxycycline 200mg weekly in endemic areas.",
    metadata: {
      category: "diagnosis" as const,
      source: "ICMR Guidelines",
      tags: ["leptospirosis", "monsoon", "zoonosis", "jaundice", "India", "rural"],
    },
  },
  {
    content:
      "CHIKUNGUNYA: Arboviral disease transmitted by Aedes mosquitoes. Symptoms: acute fever, severe polyarthralgia (bilateral, symmetrical joints), myalgia, rash, conjunctivitis. Arthralgia can persist months to years. Diagnosis: PCR (acute), serology (IgM ELISA). Treatment: supportive - paracetamol, NSAIDs for joint pain, chloroquine may help chronic arthritis. No specific antiviral treatment available.",
    metadata: {
      category: "diagnosis" as const,
      source: "WHO/NVBDCP Guidelines",
      tags: ["chikungunya", "arthralgia", "viral fever", "mosquito-borne", "India"],
    },
  },
  {
    content:
      "ANEMIA IN INDIA: Iron deficiency anemia most common (Hb <12g/dL women, <13g/dL men). Symptoms: fatigue, pallor, dyspnea on exertion, palpitations, angular stomatitis. Investigations: CBC, peripheral smear, serum iron, TIBC, ferritin. Treatment: Ferrous sulfate 200mg TDS (elemental iron 65mg), with Vitamin C to enhance absorption. Duration: 3-6 months after Hb normalizes. Rule out: thalassemia, G6PD deficiency, chronic disease.",
    metadata: {
      category: "diagnosis" as const,
      source: "FOGSI/AIIMS Guidelines",
      tags: ["anemia", "iron deficiency", "hemoglobin", "ferritin", "India"],
    },
  },
  {
    content:
      "DIARRHEAL DISEASES: Most common cause of child mortality in India. Acute watery diarrhea: oral rehydration therapy (ORS) - WHO formula. ZINC: 20mg/day x 14 days in children reduces duration. Antibiotics NOT routine. Bloody diarrhea (dysentery): Ciprofloxacin 500mg BD x 3 days or Azithromycin 500mg OD x 3 days. Cholera: IV fluids (Ringer's lactate), Doxycycline 300mg single dose. Prevention: hand hygiene, safe water, sanitation.",
    metadata: {
      category: "treatment" as const,
      source: "WHO/IAP Guidelines",
      tags: ["diarrhea", "ORS", "cholera", "dysentery", "pediatric", "India"],
    },
  },
  {
    content:
      "VITAMIN B12 DEFICIENCY: Common in India due to vegetarian diet. Symptoms: megaloblastic anemia, peripheral neuropathy (tingling/numbness hands/feet), subacute combined degeneration of spinal cord, glossitis, neuropsychiatric manifestations. Lab: low serum B12 (<200 pg/mL), elevated MCV, elevated homocysteine. Treatment: Methylcobalamin 500mcg IM daily x 7 days, then monthly. Oral 1000-2000mcg daily (if compliance issue). Vegetarians need lifelong supplementation.",
    metadata: {
      category: "diagnosis" as const,
      source: "API/ICMR Guidelines",
      tags: ["vitamin B12", "megaloblastic anemia", "neuropathy", "vegetarian", "India"],
    },
  },
  {
    content:
      "PEDIATRIC VACCINE SCHEDULE INDIA (NIS 2023): At birth: BCG, OPV-0, Hep B-1. 6 weeks: OPV-1, Penta-1, IPV-1, RVV-1, PCV-1. 10 weeks: OPV-2, Penta-2, RVV-2. 14 weeks: OPV-3, Penta-3, IPV-2, PCV-2, RVV-3. 6 months: OPV booster, Hep B-2. 9 months: MR-1, JE-1. 12 months: Hep A-1. 15 months: MMR, Varicella, PCV booster. 16-24 months: DPT booster 1, OPV booster, Hep A-2, JE-2. 5-6 years: DPT booster 2. 10 and 16 years: Td.",
    metadata: {
      category: "treatment" as const,
      source: "MoHFW India NIS 2023",
      tags: ["vaccine", "immunization", "pediatric", "NIS", "India", "schedule"],
    },
  },
  {
    content:
      "ACUTE CORONARY SYNDROME (ACS) MANAGEMENT: STEMI: Primary PCI preferred within 90 min. If PCI not available: thrombolysis (Streptokinase 1.5 MU over 60 min or Tenecteplase weight-based). Medications: Aspirin 325mg loading + 75mg OD, Clopidogrel 300mg loading + 75mg OD, LMWH (Enoxaparin), Statin high-intensity (Atorvastatin 80mg), Beta-blocker, ACE inhibitor. NSTEMI/UA: Antiplatelet therapy, anticoagulation, early invasive strategy.",
    metadata: {
      category: "treatment" as const,
      source: "CSI ACS Guidelines 2023",
      tags: ["ACS", "heart attack", "STEMI", "thrombolysis", "cardiology", "India"],
    },
  },
  {
    content:
      "ASTHMA MANAGEMENT INDIA: GINA step therapy. Step 1 (mild intermittent): SABA (Salbutamol inhaler) PRN only. Step 2: Low-dose ICS (Budesonide 200-400mcg/day or Beclomethasone). Step 3: Low-dose ICS + LABA (Formoterol or Salmeterol). Step 4: Medium/high ICS + LABA. Step 5: Add tiotropium or biologics. Acute exacerbation: Nebulized salbutamol, ipratropium, systemic steroids, oxygen. Action plan essential for all patients.",
    metadata: {
      category: "treatment" as const,
      source: "GINA/NAAC Guidelines",
      tags: ["asthma", "inhaler", "ICS", "salbutamol", "budesonide", "respiratory"],
    },
  },
  {
    content:
      "COVID-19 MANAGEMENT POST-PANDEMIC (2024): Most infections mild/moderate. Treatment: Symptomatic - paracetamol, adequate hydration. Severe (SpO2 <94%): Oxygen therapy, Dexamethasone 6mg OD x 10 days, Remdesivir (if hospitalized <7 days symptoms, oxygen needed). Anticoagulation: prophylactic LMWH in hospitalized patients. Long COVID: fatigue, dyspnea, cognitive symptoms - multidisciplinary management. Vaccination: Updated vaccines recommended annually.",
    metadata: {
      category: "treatment" as const,
      source: "MoHFW/WHO COVID Guidelines 2024",
      tags: ["COVID-19", "coronavirus", "oxygen", "dexamethasone", "pandemic", "India"],
    },
  },
  {
    content:
      "REFERRAL CRITERIA INDIA: Refer to tertiary care: (1) Septic shock or multi-organ failure, (2) Acute MI requiring PCI, (3) Stroke requiring thrombolysis/thrombectomy within window period, (4) Surgical emergencies (acute abdomen, ectopic pregnancy), (5) Status epilepticus, (6) Severe pre-eclampsia/eclampsia, (7) Neonatal emergencies, (8) Severe burns >20% BSA, (9) MDR-TB or extensively drug resistant TB, (10) Malignancy requiring oncology evaluation. Document reason for referral clearly.",
    metadata: {
      category: "treatment" as const,
      source: "NHM Referral Guidelines",
      tags: ["referral", "tertiary care", "emergency", "transfer", "India"],
    },
  },
  {
    content:
      "ESSENTIAL MEDICINES PRICING INDIA: Under DPCO 2013/2022, prices of essential medicines are regulated. Key prices (approximate): Amoxicillin 500mg x 10: Rs 35-60, Metformin 500mg x 60: Rs 30-50, Amlodipine 5mg x 30: Rs 20-40, Atorvastatin 10mg x 30: Rs 40-80, Azithromycin 500mg x 3: Rs 70-100, Paracetamol 500mg x 15: Rs 15-25, Omeprazole 20mg x 30: Rs 25-50, Cetirizine 10mg x 10: Rs 15-20. Generic versions (Jan Aushadhi) available at 50-80% lower cost.",
    metadata: {
      category: "drug" as const,
      source: "NPPA/DPCO 2023",
      tags: ["drug price", "essential medicine", "DPCO", "Jan Aushadhi", "generic", "India"],
    },
  },
  {
    content:
      "CHRONIC KIDNEY DISEASE (CKD): Stages 1-5 by eGFR. Stage 3 (eGFR 30-59): nephrology referral, avoid nephrotoxins (NSAIDs, aminoglycosides, contrast), restrict protein 0.6-0.8g/kg. Anemia: Erythropoietin + iron supplementation. Stage 4-5: Hemodialysis or peritoneal dialysis preparation. Renal replacement therapy (RRT) centers in India: AIIMS Delhi, CMC Vellore, PGIMER Chandigarh, private centers in metro cities. Transplantation: cadaveric wait list or living donor.",
    metadata: {
      category: "treatment" as const,
      source: "ISN/API Guidelines",
      tags: ["CKD", "kidney disease", "dialysis", "eGFR", "renal", "India"],
    },
  },
  {
    content:
      "MENTAL HEALTH IN INDIA (NMHP): Common disorders: Depression (56 million affected), anxiety disorders, alcohol use disorder. PHQ-9 for depression screening. Management: Counseling/psychotherapy first-line for mild-moderate. SSRIs (Sertraline 50-200mg, Fluoxetine 20-40mg, Escitalopram 10-20mg) for moderate-severe depression. Benzodiazepines: short-term only. iCall, Vandrevala Foundation helplines available. NIMHANS, CIP Ranchi for tertiary psychiatric care.",
    metadata: {
      category: "diagnosis" as const,
      source: "NIMHANS/WHO MHGAP",
      tags: ["mental health", "depression", "anxiety", "SSRI", "psychiatry", "India"],
    },
  },
  {
    content:
      "NEONATAL CARE - DANGER SIGNS: Refer immediately if: fast breathing (>60/min), grunting, severe chest indrawing, cyanosis, convulsions, bulging fontanelle, temperature <35.5°C or >37.5°C, not feeding well, umbilical infection spreading, jaundice within 24 hours of birth or involving palms/soles, no urine in first 24 hours. Kangaroo mother care for preterm/LBW infants. EBF for first 6 months.",
    metadata: {
      category: "diagnosis" as const,
      source: "NNF/ICMR Neonatal Guidelines",
      tags: ["neonatal", "newborn", "danger signs", "pediatric", "emergency", "India"],
    },
  },
  {
    content:
      "SNAKE BITE MANAGEMENT INDIA: Common snakes: Big Four (Russell's viper, cobra, krait, saw-scaled viper). Polyvalent Anti-Snake Venom (ASV) is ONLY treatment - available at district hospitals. Dose: 10 vials IV initially, repeat if signs persist. DO NOT: tourniquet, incision, suction, electric shock. DO: immobilize limb, carry to hospital immediately. Neurotoxicity (krait/cobra): respiratory failure, neostigmine + atropine may help. Hemotoxicity (viper): coagulopathy, bleeding - monitor 20 WBCT.",
    metadata: {
      category: "treatment" as const,
      source: "NCPCR/WHO Snake Bite Guidelines",
      tags: ["snake bite", "anti-venom", "emergency", "toxicology", "India", "rural"],
    },
  },
];

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${seedEnv.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
      dimensions: 1536,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0]?.embedding ?? [];
}

async function seed() {
  console.log("Starting medical knowledge seed...");
  const { db } = await connectToDatabase();
  const collection = db.collection("medical_knowledge");

  // Clear existing data
  await collection.deleteMany({});
  console.log("Cleared existing medical knowledge");

  let processed = 0;
  for (const chunk of medicalKnowledgeChunks) {
    try {
      console.log(
        `[${processed + 1}/${medicalKnowledgeChunks.length}] Embedding: ${chunk.content.substring(0, 60)}...`
      );

      const embedding = await generateEmbedding(chunk.content);
      await collection.insertOne({
        content: chunk.content,
        embedding,
        metadata: chunk.metadata,
      });

      processed++;
      // Rate limit: 10 requests/min for free tier
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to process chunk ${processed + 1}:`, error);
    }
  }

  console.log(`\nSeed complete! Processed ${processed}/${medicalKnowledgeChunks.length} chunks`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
