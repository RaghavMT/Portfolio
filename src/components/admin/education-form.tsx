"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { educationSchema } from "@/lib/validation/education";
import {
  createEducation,
  updateEducation,
} from "@/server/actions/admin/education";
import type { AdminEducation } from "@/server/admin/queries";
import { Field, useEntityForm } from "./entity-form";
import { FormActions, SwitchRow } from "./form-parts";
import { MarkdownField } from "./markdown-field";

const text = (v: string | null | undefined) => v ?? "";

export function EducationForm({
  item,
  onDone,
}: {
  item?: AdminEducation;
  onDone: () => void;
}) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: educationSchema,
    defaultValues: {
      institution: text(item?.institution),
      degree: text(item?.degree),
      field: text(item?.field),
      startOn: text(item?.startOn.slice(0, 7)),
      endOn: text(item?.endOn?.slice(0, 7)),
      isExpected: item?.isExpected ?? false,
      grade: text(item?.grade),
      detailsMd: text(item?.detailsMd),
      visible: item?.visible ?? true,
    },
    submit: (values) =>
      item ? updateEducation(item.id, values) : createEducation(values),
    onSaved: onDone,
  });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const err = (name: keyof typeof errors) =>
    errors[name]?.message as string | undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="edu-institution"
        label="Institution"
        required
        error={err("institution")}
      >
        <Input
          id="edu-institution"
          aria-invalid={!!errors.institution}
          {...register("institution")}
        />
      </Field>

      <Field id="edu-degree" label="Degree" required error={err("degree")}>
        <Input
          id="edu-degree"
          aria-invalid={!!errors.degree}
          {...register("degree")}
        />
      </Field>

      <Field
        id="edu-field"
        label="Field of study"
        help="e.g. Computer Science"
        error={err("field")}
      >
        <Input
          id="edu-field"
          aria-invalid={!!errors.field}
          aria-describedby="edu-field-help"
          {...register("field")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="edu-start" label="Started" required error={err("startOn")}>
          <Input
            id="edu-start"
            type="month"
            aria-invalid={!!errors.startOn}
            {...register("startOn")}
          />
        </Field>
        <Field
          id="edu-end"
          label="Ended / expected"
          help="Leave blank if ongoing."
          error={err("endOn")}
        >
          <Input
            id="edu-end"
            type="month"
            aria-invalid={!!errors.endOn}
            aria-describedby="edu-end-help"
            {...register("endOn")}
          />
        </Field>
      </div>

      <Controller
        control={control}
        name="isExpected"
        render={({ field }) => (
          <SwitchRow
            id="edu-expected"
            label="Not graduated yet"
            help="Shows “Expected” before the end month."
            checked={field.value ?? false}
            onChange={field.onChange}
          />
        )}
      />

      <Field
        id="edu-grade"
        label="Grade"
        help="e.g. 8.4 CGPA — only if it helps you."
        error={err("grade")}
      >
        <Input
          id="edu-grade"
          aria-invalid={!!errors.grade}
          aria-describedby="edu-grade-help"
          {...register("grade")}
        />
      </Field>

      <Field
        id="edu-details"
        label="Details"
        help="Relevant coursework, societies or honours. Markdown works."
        error={err("detailsMd")}
        count={String(watch("detailsMd") ?? "").length}
        max={1000}
      >
        <Controller
          control={control}
          name="detailsMd"
          render={({ field }) => (
            <MarkdownField
              id="edu-details"
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={4}
              invalid={!!errors.detailsMd}
              describedBy="edu-details-help"
            />
          )}
        />
      </Field>

      <Controller
        control={control}
        name="visible"
        render={({ field }) => (
          <SwitchRow
            id="edu-visible"
            label="Show on my site"
            checked={field.value ?? true}
            onChange={field.onChange}
          />
        )}
      />

      <FormActions
        pending={pending}
        submitLabel={item ? "Save changes" : "Add education"}
        onCancel={onDone}
      />
    </form>
  );
}
