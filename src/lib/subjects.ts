import type { CSSProperties } from "react";

const palette: Record<string, number> = {
  Registration: 220,
  Mathematics: 218,
  English: 14,
  Business: 38,
  Biology: 145,
  Chemistry: 174,
  Physics: 265,
  Geography: 195,
  "Design & Technology": 25,
  Sport: 345,
  Assembly: 280,
  Study: 228,
  PSHE: 96,
  Music: 315,
  Art: 335,
};

const mutedSubjects = new Set(["Registration", "Study", "PSHE"]);

export function subjectHue(subject: string): number {
  const known = palette[subject];
  if (known !== undefined) return known;
  let hash = 0;
  for (let i = 0; i < subject.length; i += 1) hash = (hash * 31 + subject.charCodeAt(i)) % 360;
  return 15 + (hash % 330);
}

export function subjectStyle(subject: string): CSSProperties {
  const saturation = mutedSubjects.has(subject) ? 18 : 48;
  return {
    "--h": String(subjectHue(subject)),
    "--s": `${saturation}%`,
  } as CSSProperties;
}

export function subjectAbbreviation(subject: string): string {
  if (subject === "Registration") return "Reg";
  if (subject === "Mathematics") return "Maths";
  if (subject === "Design & Technology") return "D&T";
  if (subject === "Business") return "Bus";
  if (subject === "Geography") return "Geog";
  if (subject === "Chemistry") return "Chem";
  if (subject === "Physics") return "Phys";
  if (subject === "Biology") return "Bio";
  if (subject === "English") return "Eng";
  return subject.slice(0, 3);
}
