import { z } from "zod";
import {
  endNotBeforeStart,
  markdown,
  monthDate,
  optionalMonthDate,
  optionalText,
  requiredText,
} from "./common";

export const educationSchema = z
  .object({
    institution: requiredText(120),
    degree: requiredText(100),
    field: optionalText(100),
    startOn: monthDate,
    endOn: optionalMonthDate,
    /** Shows "Expected {Mon YYYY}" using endOn. */
    isExpected: z.boolean().default(false),
    grade: optionalText(40),
    detailsMd: markdown(1000),
    visible: z.boolean().default(true),
  })
  .superRefine((education, ctx) => {
    endNotBeforeStart("startOn", "endOn")(education, ctx);
    if (education.isExpected && !education.endOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endOn"],
        message: "Add the expected graduation month",
      });
    }
  });

export type EducationValues = z.output<typeof educationSchema>;
