import { z } from "zod";
import { emailAddress, optionalText, requiredText } from "./common";

/** Visitor-facing contact form fields (SPEC §11.1). Honeypot and timing fields are added in Phase 6. */
export const messageSchema = z.object({
  name: requiredText(100),
  email: emailAddress,
  company: optionalText(120),
  subject: optionalText(150),
  body: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters")
    .max(5000, "Keep it under 5,001 characters"),
});

export type MessageValues = z.output<typeof messageSchema>;
