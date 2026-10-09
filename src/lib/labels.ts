import type { CertificationKind } from "@/lib/validation/certification";
import type { EmploymentType } from "@/lib/validation/experience";

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  freelance: "Freelance",
  contract: "Contract",
  volunteer: "Volunteer",
};

export const CERTIFICATION_LABELS: Record<CertificationKind, string> = {
  certification: "Certification",
  award: "Award",
  achievement: "Achievement",
};
