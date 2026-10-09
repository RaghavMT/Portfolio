import { z } from "zod";
import {
  endNotBeforeStart,
  markdown,
  monthDate,
  optionalHttpsUrl,
  optionalMonthDate,
  optionalText,
  requiredText,
  tagList,
  textList,
} from "./common";

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "internship",
  "freelance",
  "contract",
  "volunteer",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const experienceSchema = z
  .object({
    company: requiredText(100),
    companyUrl: optionalHttpsUrl,
    title: requiredText(100),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    location: optionalText(80),
    startOn: monthDate,
    /** Null = "Present". */
    endOn: optionalMonthDate,
    summaryMd: markdown(1500),
    highlights: textList(8, 200),
    tech: tagList(15, 30),
    visible: z.boolean().default(true),
  })
  .superRefine(endNotBeforeStart("startOn", "endOn"));

export type ExperienceValues = z.output<typeof experienceSchema>;
