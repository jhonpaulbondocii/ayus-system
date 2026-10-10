// Source: DHVSU Student Manual 2019 Revision, Sec. 78.1 (General Rules on Conduct and Discipline)
// Sanctions: Sec. 78.4 (Jug, Warning/Reprimand, Benching) and Sec. 80 (Penalties).
// NOTE: The manual only fixes a sanction for the "a" group (dropping/exclusion on first offense).
// For minor / serious / very serious, the sanction is decided by the Disciplinary Council,
// so defaultSanction is null there and the OSA head picks it per case.

export type OffenseCategory = "EXCLUSION" | "MINOR" | "SERIOUS" | "VERY_SERIOUS";

export type OffenseSeed = {
  code: string; // manual reference, e.g. "78.1-b.3"
  category: OffenseCategory;
  name: string;
  defaultSanction: string | null;
};

const EXCL = "Dropping and exclusion from the university (first offense)";

export const OFFENSE_SEED: OffenseSeed[] = [
  // a. Punishable by dropping and exclusion even on first offense
  { code: "78.1-a.1", category: "EXCLUSION", name: "Selling, trading or possession of narcotics or dangerous drugs and/or paraphernalia (RA 9165)", defaultSanction: EXCL },
  { code: "78.1-a.2", category: "EXCLUSION", name: "Fraternity affiliation and any acts associated with it", defaultSanction: EXCL },
  { code: "78.1-a.3", category: "EXCLUSION", name: "Obscene publication/s and indecent shows", defaultSanction: EXCL },
  { code: "78.1-a.4", category: "EXCLUSION", name: "Violations of RA 10627 (Anti-Bullying Act of 2013)", defaultSanction: EXCL },
  { code: "78.1-a.5", category: "EXCLUSION", name: "Use of narcotics or dangerous drugs and/or paraphernalia", defaultSanction: EXCL },

  // b. Minor offenses
  { code: "78.1-b.1", category: "MINOR", name: "Excessive teasing", defaultSanction: null },
  { code: "78.1-b.2", category: "MINOR", name: "Improper decorum during line formation (JHS & SHS)", defaultSanction: null },
  { code: "78.1-b.3", category: "MINOR", name: "Littering", defaultSanction: null },
  { code: "78.1-b.4", category: "MINOR", name: "Not following waste segregation", defaultSanction: null },
  { code: "78.1-b.5", category: "MINOR", name: "Loitering", defaultSanction: null },
  { code: "78.1-b.6", category: "MINOR", name: "Six (6) accumulated unexcused tardiness", defaultSanction: null },
  { code: "78.1-b.7", category: "MINOR", name: "Not following rules in the use of Auditorium, Conference Hall, Multi-Purpose Hall, Library, Laboratories and Gymnasium", defaultSanction: null },
  { code: "78.1-b.8", category: "MINOR", name: "Misbehavior in class", defaultSanction: null },
  { code: "78.1-b.9", category: "MINOR", name: "Not following any of the rules of Classroom Discipline", defaultSanction: null },
  { code: "78.1-b.10", category: "MINOR", name: "Non-wearing or improper wearing of school uniform", defaultSanction: null },
  { code: "78.1-b.11", category: "MINOR", name: "Petty quarrels", defaultSanction: null },
  { code: "78.1-b.12", category: "MINOR", name: "Spitting through the window or floor", defaultSanction: null },
  { code: "78.1-b.13", category: "MINOR", name: "Violation on proper grooming and dress code", defaultSanction: null },
  { code: "78.1-b.14", category: "MINOR", name: "Using cellular phone while class is going on", defaultSanction: null },
  // the PDF prints this as "b. 5" (typo); it is the 15th item
  { code: "78.1-b.15", category: "MINOR", name: "Wearing cap, bonnet and the likes while inside the offices and building premises", defaultSanction: null },

  // c. Serious offenses
  { code: "78.1-c.1", category: "SERIOUS", name: "Falsely accusing another student", defaultSanction: null },
  { code: "78.1-c.2", category: "SERIOUS", name: "Instigating or causing a fight in school", defaultSanction: null },
  { code: "78.1-c.3", category: "SERIOUS", name: "Possession and/or use of cigarettes, matches or lighter and any smoking paraphernalia", defaultSanction: null },
  { code: "78.1-c.4", category: "SERIOUS", name: "Possession and/or use of gambling paraphernalia", defaultSanction: null },
  { code: "78.1-c.5", category: "SERIOUS", name: "Tampering of School ID and the likes", defaultSanction: null },
  { code: "78.1-c.6", category: "SERIOUS", name: "Cutting classes", defaultSanction: null },
  { code: "78.1-c.7", category: "SERIOUS", name: "Writing unnecessary comments on school records (attendance sheet, textbooks, quiz paper and test paper)", defaultSanction: null },
  { code: "78.1-c.8", category: "SERIOUS", name: "Desecration of religious places", defaultSanction: null },
  { code: "78.1-c.9", category: "SERIOUS", name: "Third violation of the same minor offense", defaultSanction: null },

  // d. Very serious offenses
  { code: "78.1-d.1", category: "VERY_SERIOUS", name: "Any form of misconduct that would affect the good name and/or reputation of the College", defaultSanction: null },
  { code: "78.1-d.2", category: "VERY_SERIOUS", name: "Forgery", defaultSanction: null },
  { code: "78.1-d.3", category: "VERY_SERIOUS", name: "Academic dishonesty (cheating, plagiarism, tampering of school records, involvement in examination leakage)", defaultSanction: null },
  { code: "78.1-d.4", category: "VERY_SERIOUS", name: "Assaulting physically or orally a fellow student or school personnel", defaultSanction: null },
  { code: "78.1-d.5", category: "VERY_SERIOUS", name: "Possession of deadly weapon in school", defaultSanction: null },
  { code: "78.1-d.6", category: "VERY_SERIOUS", name: "Committing acts leading to public scandal and unbecoming a Honorian", defaultSanction: null },
  { code: "78.1-d.7", category: "VERY_SERIOUS", name: "Disrupting classes and barricading the school entrance", defaultSanction: null },
  { code: "78.1-d.8", category: "VERY_SERIOUS", name: "Entering school premises under the influence of alcohol", defaultSanction: null },
  { code: "78.1-d.9", category: "VERY_SERIOUS", name: "Drug dependency, possession, selling and/or using prohibited drugs", defaultSanction: null },
  { code: "78.1-d.10", category: "VERY_SERIOUS", name: "Involvement in a serious fight publicly", defaultSanction: null },
  { code: "78.1-d.11", category: "VERY_SERIOUS", name: "Fight or violence resulting to physical injuries", defaultSanction: null },
  { code: "78.1-d.12", category: "VERY_SERIOUS", name: "Gross misconduct or disrespect to persons in authority, to fellow students and to other members of the community", defaultSanction: null },
  { code: "78.1-d.13", category: "VERY_SERIOUS", name: "Hazing", defaultSanction: null },
  { code: "78.1-d.14", category: "VERY_SERIOUS", name: "Immorality and acts of lasciviousness", defaultSanction: null },
  { code: "78.1-d.15", category: "VERY_SERIOUS", name: "Violent or rowdy behavior", defaultSanction: null },
  { code: "78.1-d.16", category: "VERY_SERIOUS", name: "Instigating or leading strikes or similar activities that lead to the stoppage of classes", defaultSanction: null },
  { code: "78.1-d.17", category: "VERY_SERIOUS", name: "Joining and/or forming illegal organizations contrary to the beliefs of the school", defaultSanction: null },
  { code: "78.1-d.18", category: "VERY_SERIOUS", name: "Any acts of perjury", defaultSanction: null },
  { code: "78.1-d.19", category: "VERY_SERIOUS", name: "Vandalism: willful and deliberate destruction of school properties, including defacing furniture", defaultSanction: null },
  { code: "78.1-d.20", category: "VERY_SERIOUS", name: "Preventing or threatening any student or school personnel from entering the school premises or discharging their duties", defaultSanction: null },
  { code: "78.1-d.21", category: "VERY_SERIOUS", name: "Refusing to identify a student who has violated school regulations when personal knowledge has been clearly manifested", defaultSanction: null },
  { code: "78.1-d.22", category: "VERY_SERIOUS", name: "Selling of examination paper", defaultSanction: null },
  { code: "78.1-d.23", category: "VERY_SERIOUS", name: "Theft and robbery", defaultSanction: null },
  { code: "78.1-d.24", category: "VERY_SERIOUS", name: "Using the name of the school, written or oral, without permission for solicitations or deception", defaultSanction: null },
  { code: "78.1-d.25", category: "VERY_SERIOUS", name: "Climbing or jumping over the boundary fence of DHVSU", defaultSanction: null },
  { code: "78.1-d.26", category: "VERY_SERIOUS", name: "Third violation of the same serious offense", defaultSanction: null },
  { code: "78.1-d.27", category: "VERY_SERIOUS", name: "Commission of any offense within the campus punishable under the Revised Penal Code", defaultSanction: null },
];

// Sanctions list from Sec. 78.4 and Sec. 80 (for the sanction dropdown in the Disciplinary Log)
export const SANCTIONS = [
  "Jug",
  "Warning",
  "Reprimand",
  "Written apology",
  "Summon with parents/guardian",
  "Disciplinary probation",
  "Benching / extra school work",
  "Suspension from class",
  "Suspension from school (2 days up to 2 semesters / 1 academic year)",
  "Dropping from subject",
  "Dropping from the university",
  "Dismissal / exclusion",
  "Expulsion",
] as const;

// ---- Mapping to the ViolationType model (prisma/schema.prisma) ----
export type ViolationTypeRow = {
  code: string;
  name: string;
  severity: "MINOR" | "SERIOUS" | "VERY_SERIOUS";
  dismissalOnFirst: boolean;
  defaultSanction: string | null;
  maxSanction: string | null;
  escalationCount: number;
  escalatesTo: "SERIOUS" | "VERY_SERIOUS" | null;
  manualRef: string;
  order: number;
};

export function toViolationTypeRow(o: OffenseSeed, index: number): ViolationTypeRow {
  const excl = o.category === "EXCLUSION";
  const severity: ViolationTypeRow["severity"] = o.category === "EXCLUSION" ? "VERY_SERIOUS" : o.category;
  return {
    code: o.code,
    name: o.name,
    severity,
    dismissalOnFirst: excl,
    defaultSanction: o.defaultSanction,
    maxSanction: excl ? "DISMISSAL" : null,
    // Manual: 3rd violation of same minor = serious (c.9); 3rd of same serious = very serious (d.26)
    escalationCount: 3,
    escalatesTo: severity === "MINOR" ? "SERIOUS" : severity === "SERIOUS" ? "VERY_SERIOUS" : null,
    manualRef: "Sec. " + o.code.replace("-", " "),
    order: index,
  };
}

export const VIOLATION_TYPE_ROWS: ViolationTypeRow[] = OFFENSE_SEED.map(toViolationTypeRow);