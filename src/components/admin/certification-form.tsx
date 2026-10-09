"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CERTIFICATION_LABELS } from "@/lib/labels";
import {
  CERTIFICATION_KINDS,
  certificationSchema,
} from "@/lib/validation/certification";
import {
  createCertification,
  updateCertification,
} from "@/server/actions/admin/certifications";
import type { AdminCertification } from "@/server/admin/queries";
import { Field, useEntityForm } from "./entity-form";
import { FormActions, SwitchRow } from "./form-parts";

const text = (v: string | null | undefined) => v ?? "";

export function CertificationForm({
  item,
  onDone,
}: {
  item?: AdminCertification;
  onDone: () => void;
}) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: certificationSchema,
    defaultValues: {
      kind: item?.kind ?? "certification",
      title: text(item?.title),
      issuer: text(item?.issuer),
      issuedOn: text(item?.issuedOn?.slice(0, 7)),
      credentialUrl: text(item?.credentialUrl),
      description: text(item?.description),
      visible: item?.visible ?? true,
    },
    submit: (values) =>
      item ? updateCertification(item.id, values) : createCertification(values),
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
      <Field id="cert-kind" label="Type" required>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="cert-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATION_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CERTIFICATION_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        id="cert-title"
        label="Title"
        required
        error={err("title")}
        count={String(watch("title") ?? "").length}
        max={140}
      >
        <Input
          id="cert-title"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
      </Field>

      <Field id="cert-issuer" label="Issuer" error={err("issuer")}>
        <Input
          id="cert-issuer"
          aria-invalid={!!errors.issuer}
          {...register("issuer")}
        />
      </Field>

      <Field id="cert-issued" label="Date issued" error={err("issuedOn")}>
        <Input
          id="cert-issued"
          type="month"
          aria-invalid={!!errors.issuedOn}
          {...register("issuedOn")}
        />
      </Field>

      <Field
        id="cert-url"
        label="Credential link"
        help="A link recruiters can use to verify it (https://…)."
        error={err("credentialUrl")}
      >
        <Input
          id="cert-url"
          inputMode="url"
          aria-invalid={!!errors.credentialUrl}
          aria-describedby="cert-url-help"
          {...register("credentialUrl")}
        />
      </Field>

      <Field
        id="cert-desc"
        label="Description"
        help="One line on what it covers or why it matters."
        error={err("description")}
        count={String(watch("description") ?? "").length}
        max={300}
      >
        <Textarea
          id="cert-desc"
          rows={3}
          aria-invalid={!!errors.description}
          aria-describedby="cert-desc-help"
          {...register("description")}
        />
      </Field>

      <Controller
        control={control}
        name="visible"
        render={({ field }) => (
          <SwitchRow
            id="cert-visible"
            label="Show on my site"
            checked={field.value ?? true}
            onChange={field.onChange}
          />
        )}
      />

      <FormActions
        pending={pending}
        submitLabel={item ? "Save changes" : "Add certification"}
        onCancel={onDone}
      />
    </form>
  );
}
