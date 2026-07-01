// src/lib/age.ts

export function calculateAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasNotHadBirthdayYet =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (hasNotHadBirthdayYet) age--;
  return age;
}

export function resolveStudentAge(student: {
  birthDate?: Date | string | null;
  age?: number | null;
}): number | null {
  return calculateAge(student.birthDate ?? null) ?? student.age ?? null;
}