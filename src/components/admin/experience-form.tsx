"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_LABELS } from "@/lib/labels";
import {
  EMPLOYMENT_TYPES,
  experienceSchema,
} from "@/lib/validation/experience";
import {
  createExperience,
  updateExperience,
} from "@/server/actions/admin/experience";
import type { AdminExperience } from "@/server/admin/queries";
import { Field, useEntityForm } from "./entity-form";
import { FormActions, SwitchRow } from "./form-parts";
import { ListEditor } from "./list-editor";
import { MarkdownField } from "./markdown-field";
import { TagInput } from "./tag-input";

const text = (v: string | null | undefined) => v ?? "";

export function ExperienceForm({
  item,
  tagSuggestions,
  onDone,
}: {
  item?: AdminExperience;
  tagSuggestions: string[];
  onDone: () => void;
}) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: experienceSchema,
    defaultValues: {
      company: text(item?.company),
      companyUrl: text(item?.companyUrl),
      title: text(item?.title),
      employmentType: item?.employmentType ?? "full_time",
      location: text(item?.location),
      startOn: text(item?.startOn.slice(0, 7)),
      endOn: text(item?.endOn?.slice(0, 7)),
      summaryMd: text(item?.summaryMd),
      highlights: item?.highlights ?? [],
      tech: item?.tech ?? [],
      visible: item?.visible ?? true,
    },
    submit: (values) =>
      item ? updateExperience(item.id, values) : createExperience(values),
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
      <Field id="exp-title" label="Job title" required error={err("title")}>
        <Input
          id="exp-title"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
      </Field>

      <Field id="exp-company" label="Company" required error={err("company")}>
        <Input
          id="exp-company"
          aria-invalid={!!errors.company}
          {...register("company")}
        />
      </Field>

      <Field
        id="exp-company-url"
        label="Company website"
        help="Optional. Makes the company name a link (https://…)."
        error={err("companyUrl")}
      >
        <Input
          id="exp-company-url"
          inputMode="url"
          aria-invalid={!!errors.companyUrl}
          aria-describedby="exp-company-url-help"
          {...register("companyUrl")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="exp-type" label="Type" required>
          <Controller
            control={control}
            name="employmentType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="exp-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EMPLOYMENT_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="exp-location" label="Location" error={err("location")}>
          <Input
            id="exp-location"
            aria-invalid={!!errors.location}
            {...register("location")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="exp-start" label="Started" required error={err("startOn")}>
          <Input
            id="exp-start"
            type="month"
            aria-invalid={!!errors.startOn}
            {...register("startOn")}
          />
        </Field>
        <Field
          id="exp-end"
          label="Ended"
          help="Leave blank if you still work here."
          error={err("endOn")}
        >
          <Input
            id="exp-end"
            type="month"
            aria-invalid={!!errors.endOn}
            aria-describedby="exp-end-help"
            {...register("endOn")}
          />
        </Field>
      </div>

      <Field
        id="exp-summary"
        label="Summary"
        help="One or two lines on the team and what you owned. Markdown works."
        error={err("summaryMd")}
        count={String(watch("summaryMd") ?? "").length}
        max={1500}
      >
        <Controller
          control={control}
          name="summaryMd"
          render={({ field }) => (
            <MarkdownField
              id="exp-summary"
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={4}
              invalid={!!errors.summaryMd}
              describedBy="exp-summary-help"
            />
          )}
        />
      </Field>

      <Field
        id="exp-highlights"
        label="Highlights"
        help="Start with a verb and include a number: “Cut API latency 40% by caching hot queries.” Up to 8."
        error={errors.highlights?.message as string | undefined}
      >
        <Controller
          control={control}
          name="highlights"
          render={({ field }) => (
            <ListEditor
              id="exp-highlights"
              value={field.value ?? []}
              onChange={field.onChange}
              max={8}
              maxLength={200}
              noun="highlight"
              placeholder="Built …, which …"
            />
          )}
        />
      </Field>

      <Field
        id="exp-tech"
        label="Technologies"
        help="Type a tool and press Enter. Up to 15."
        error={errors.tech?.message as string | undefined}
      >
        <Controller
          control={control}
          name="tech"
          render={({ field }) => (
            <TagInput
              id="exp-tech"
              value={field.value ?? []}
              onChange={field.onChange}
              max={15}
              maxLength={30}
              suggestions={tagSuggestions}
              describedBy="exp-tech-help"
            />
          )}
        />
      </Field>

      <Controller
        control={control}
        name="visible"
        render={({ field }) => (
          <SwitchRow
            id="exp-visible"
            label="Show on my site"
            checked={field.value ?? true}
            onChange={field.onChange}
          />
        )}
      />

      <FormActions
        pending={pending}
        submitLabel={item ? "Save changes" : "Add experience"}
        onCancel={onDone}
      />
    </form>
  );
}
