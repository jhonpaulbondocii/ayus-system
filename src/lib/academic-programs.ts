export const DEPARTMENTS = [
  "College of Education",
  "College of Business Studies",
  "College of Hospitality & Tourism Management",
  "College of Computing Studies",
  "College of Industrial Technology",
];

export const COURSES_BY_DEPARTMENT: Record<string, string[]> = {
  "College of Education": [
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education Major in Filipino",
    "Bachelor of Secondary Education Major in Mathematics",
    "Bachelor of Secondary Education Major in Science",
    "Bachelor of Secondary Education Major in Social Studies",
    "Bachelor of Secondary Education Major in Physical Education",
  ],
  "College of Business Studies": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Business Administration",
  ],
  "College of Hospitality & Tourism Management": [
    "Bachelor of Science in Hospitality Management",
  ],
  "College of Computing Studies": [
    "Bachelor of Science in Information Technology",
  ],
  "College of Industrial Technology": [
    "Bachelor of Industrial Technology Major in Automotive Technology",
  ],
};

// Maikling code para sa PDF (maliit lang ang box doon)
export const COURSE_ABBREVIATIONS: Record<string, string> = {
  "Bachelor of Elementary Education": "BEEd",
  "Bachelor of Secondary Education Major in Filipino": "BSEd-Filipino",
  "Bachelor of Secondary Education Major in Mathematics": "BSEd-Math",
  "Bachelor of Secondary Education Major in Science": "BSEd-Science",
  "Bachelor of Secondary Education Major in Social Studies": "BSEd-Soc. Studies",
  "Bachelor of Secondary Education Major in Physical Education": "BSEd-PE",
  "Bachelor of Science in Accountancy": "BSA",
  "Bachelor of Science in Business Administration": "BSBA",
  "Bachelor of Science in Hospitality Management": "BSHM",
  "Bachelor of Science in Information Technology": "BSIT",
  "Bachelor of Industrial Technology Major in Automotive Technology": "BIT-Automotive",
};

export function abbreviateCourse(course: string | null | undefined): string | null {
  if (!course) return null;
  return COURSE_ABBREVIATIONS[course] ?? course;
}

export function departmentOfCourse(course: string | null | undefined): string | null {
  if (!course) return null;
  for (const [dept, list] of Object.entries(COURSES_BY_DEPARTMENT)) {
    if (list.includes(course)) return dept;
  }
  return null;
}