import { z } from "zod";
import {
  optionalHttpsUrl,
  optionalMonthDate,
  optionalText,
  requiredText,
} from "./common";

export const CERTIFICATION_KINDS = [
  "certification",
  "award",
  "achievement",
] as const;
export type CertificationKind = (typeof CERTIFICATION_KINDS)[number];

export const certificationSchema = z.object({
  kind: z.enum(CERTIFICATION_KINDS),
  title: requiredText(140),
  issuer: optionalText(100),
  issuedOn: optionalMonthDate,
  credentialUrl: optionalHttpsUrl,
  description: optionalText(300),
  visible: z.boolean().default(true),
});

export type CertificationValues = z.output<typeof certificationSchema>;
