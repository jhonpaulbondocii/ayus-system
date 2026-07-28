// src/lib/medical-cases-config.ts
//
// Single source of truth for the 18 fixed Body Systems (from the DHVSU/PSU
// "Summary of Medical Cases" template) and the 7 college columns used in
// both the on-screen summary table and the Excel export.

export interface FixedBodySystemDef {
  letter:      string; // "A." .. "R."
  name:        string; // e.g. "ALIMENTARY SYSTEM"
  description: string; // parenthetical examples, e.g. "(Nausea, Vomiting, ...)"
  order:       number; // 0-based, matches row order in the template
}

export const FIXED_BODY_SYSTEMS: FixedBodySystemDef[] = [
  { letter: "A.",  order: 0,  name: "ALIMENTARY SYSTEM",
    description: "Nausea, Vomiting, Hyperacidity, Heartburn, Dyspepsia, Infectious Diarrhea, Constipation" },
  { letter: "B.",  order: 1,  name: "RESPIRATORY SYSTEM",
    description: "Cough, Colds, Fever, Bronchial Asthma, Difficulty of Breathing, Pneumonia" },
  { letter: "C.",  order: 2,  name: "MUSCULO-SKELETAL SYSTEM",
    description: "Osteoarthritis, Osteochondritis, Muscle and Joint Spasm, Sprain, Strain, Fracture, Dislocation" },
  { letter: "D.",  order: 3,  name: "INTEGUMENTARY SYSTEM",
    description: "Burns, Cuts, Abrasion, Laceration, Bruise, Puncture, Minor Surgery, Skin Diseases, Allergies, Infected Wound, Animal Bite" },
  { letter: "E.",  order: 4,  name: "URINARY SYSTEM",
    description: "UTI" },
  { letter: "F.",  order: 5,  name: "METABOLIC ENDOCRINE SYSTEM",
    description: "Diabetes, Hyperthyroidism, Hypothyroidism, Dyslipidemia" },
  { letter: "G.",  order: 6,  name: "CARDIOVASCULAR SYSTEM",
    description: "Chest pain, Hypertension, Hypotension, Arrhythmias, Bradycardia, Tachycardia" },
  { letter: "H.",  order: 7,  name: "EYES, EARS, NOSE & THROAT DISORDERS",
    description: "Sty, Fungal or Bacterial Infection, Foreign body, Vertigo, Otitis Media/Externa, Sinusitis, Epistaxis, Pharyngitis, Laryngitis, Tonsillitis, Rhinitis" },
  { letter: "I.",  order: 8,  name: "COMMUNICABLE DISEASES",
    description: "Conjunctivitis, Boils, Measles, Chicken Pox, Mumps, Hepatitis, Tuberculosis, Leptospirosis, COVID Suspect, Viral Exanthem" },
  { letter: "J.",  order: 9,  name: "BLOOD DISORDERS",
    description: "Anemia, Pallor" },
  { letter: "K.",  order: 10, name: "NEUROLOGICAL DISORDERS",
    description: "Hyperventilation, Anxiety attack, Panic Attack, Headache, Migraine, Syncope, Dizziness, Epilepsy, Seizure, Insomnia" },
  { letter: "L.",  order: 11, name: "OB-GYNE CASES",
    description: "Dysmenorrhea, Pregnancy, Polycystic Ovarian Syndrome, Menstrual Disorders" },
  { letter: "M.",  order: 12, name: "DENTAL CASES",
    description: "" },
  { letter: "N.",  order: 13, name: "PHYSICAL EXAMINATIONS",
    description: "Medical Certificate/Clearance Issued" },
  { letter: "O.",  order: 14, name: "REFERRALS",
    description: "Laboratory and Diagnostic Test Request, Specialist" },
  { letter: "P.",  order: 15, name: "FOLLOW-UP CHECK-UP",
    description: "" },
  { letter: "Q.",  order: 16, name: "OTHERS",
    description: "Height, Weight, Blood Pressure Monitoring, Prescription" },
  { letter: "R.",  order: 17, name: "Heat related cases",
    description: "" },
];

// ── College / department columns (exact order matters — matches template columns C..I) ──
export const COLLEGE_CODES = ["COE", "CBS", "CHTM", "CCS", "CIT", "FACULTY", "NASA"] as const;
export type CollegeCode = typeof COLLEGE_CODES[number];

export const COLLEGE_LABELS: Record<CollegeCode, string> = {
  COE:     "College of Education (COE)",
  CBS:     "College of Business Studies (CBS)",
  CHTM:    "College of Hospitality & Tourism Management (CHTM)",
  CCS:     "College of Computing Studies (CCS)",
  CIT:     "College of Industrial Technology (CIT)",
  FACULTY: "FACULTY",
  NASA:    "NASA",
};

// Maps Student.course (from the fixed COURSES list in the Students admin page)
// to the college bucket used in the summary / export. Courses not found here
// are simply excluded from the department breakdown (but still count toward
// each condition's own total).
export const COURSE_TO_COLLEGE: Record<string, CollegeCode> = {
  "Bachelor of Secondary Education (BSEd)":                     "COE",
  "Bachelor of Science in Accountancy (BSA)":                   "CBS",
  "Bachelor of Science in Business Administration (BSBA)":      "CBS",
  "Bachelor of Science in Hospitality Management (BSHM)":       "CHTM",
  "Bachelor of Science in Information Technology (BSIT)":       "CCS",
  "Bachelor of Science in Industrial Technology (BSIT-Ind)":    "CIT",
  // FACULTY / NASA have no corresponding Student.course value today —
  // there is no non-student patient type in the schema yet, so these two
  // columns will always compute to 0 until that's added.
};

// ── Excel template layout (public/template/PMC-Medical-Cases.xlsx) ──
export const MEDICAL_CASES_TEMPLATE_PATH = "public/template/PMC-Medical-Cases.xlsx";

export const MONTH_SHEET_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const CONSOLIDATED_SHEET_NAME = "CONSOLIDATED-DO NOT EDIT ";

// Column indices (1-based, exceljs convention) inside each sheet
export const TEMPLATE_COLS = {
  letter:   1, // A
  category: 2, // B
  // C..I -> 7 college columns, in COLLEGE_CODES order
  firstCollege: 3,
  total: 10, // J
};

// Row offsets differ by 1 between monthly sheets and the consolidated sheet
export const TEMPLATE_ROWS = {
  monthly:      { firstCategoryRow: 10, totalRow: 28, periodLabelRow: 7 },
  consolidated: { firstCategoryRow: 11, totalRow: 29, periodLabelRow: 8 },
};