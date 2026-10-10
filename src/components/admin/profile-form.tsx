"use client";

import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema } from "@/lib/validation/site-settings";
import { updateProfile } from "@/server/actions/admin/profile";
import type { AdminSettings } from "@/server/admin/queries";
import { Field, useEntityForm } from "./entity-form";
import { ImageField } from "./image-field";
import { SwitchRow } from "./form-parts";
import { MarkdownField } from "./markdown-field";

const text = (v: string | null | undefined) => v ?? "";

export function ProfileForm({ settings }: { settings: AdminSettings }) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: profileSchema,
    defaultValues: {
      fullName: settings.fullName,
      headline: settings.headline,
      tagline: text(settings.tagline),
      location: text(settings.location),
      openToWork: settings.openToWork,
      openToWorkText: text(settings.openToWorkText),
      aboutMd: settings.aboutMd,
      avatarUrl: text(settings.avatarUrl),
      avatarAlt: text(settings.avatarAlt),
      contactEmail: settings.contactEmail,
    },
    submit: updateProfile,
  });
  const {
    register,
    control,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = form;
  const err = (name: keyof typeof errors) =>
    errors[name]?.message as string | undefined;
  const len = (name: "fullName" | "headline" | "tagline" | "location") =>
    String(watch(name) ?? "").length;

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5" noValidate>
      <Field
        id="pf-name"
        label="Full name"
        required
        error={err("fullName")}
        count={len("fullName")}
        max={80}
      >
        <Input
          id="pf-name"
          autoComplete="name"
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
      </Field>

      <Field
        id="pf-headline"
        label="Headline"
        required
        help="Role and focus in one line, e.g. “Software Engineer · Full-stack & Data”."
        error={err("headline")}
        count={len("headline")}
        max={120}
      >
        <Input
          id="pf-headline"
          aria-invalid={!!errors.headline}
          aria-describedby="pf-headline-help"
          {...register("headline")}
        />
      </Field>

      <Field
        id="pf-tagline"
        label="Tagline"
        help="Optional one-liner under the headline: what you build and for whom."
        error={err("tagline")}
        count={len("tagline")}
        max={240}
      >
        <Input
          id="pf-tagline"
          aria-invalid={!!errors.tagline}
          aria-describedby="pf-tagline-help"
          {...register("tagline")}
        />
      </Field>

      <Field
        id="pf-location"
        label="Location"
        error={err("location")}
        count={len("location")}
        max={80}
      >
        <Input
          id="pf-location"
          autoComplete="address-level2"
          aria-invalid={!!errors.location}
          {...register("location")}
        />
      </Field>

      <Controller
        control={control}
        name="openToWork"
        render={({ field }) => (
          <SwitchRow
            id="pf-open"
            label="Open to opportunities"
            help="Shows a badge in your hero section."
            checked={field.value ?? true}
            onChange={field.onChange}
          />
        )}
      />

      <Field
        id="pf-open-text"
        label="Open-to-work text"
        help="Optional, e.g. “Open to SDE-1 roles from Jan 2027”. Replaces the default badge text."
        error={err("openToWorkText")}
      >
        <Input
          id="pf-open-text"
          aria-invalid={!!errors.openToWorkText}
          aria-describedby="pf-open-text-help"
          {...register("openToWorkText")}
        />
      </Field>

      <Field
        id="pf-about"
        label="About"
        help="Who you are, what you build and what you want next. Markdown works."
        error={err("aboutMd")}
        count={String(watch("aboutMd") ?? "").length}
        max={4000}
      >
        <Controller
          control={control}
          name="aboutMd"
          render={({ field }) => (
            <MarkdownField
              id="pf-about"
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              rows={8}
              invalid={!!errors.aboutMd}
              describedBy="pf-about-help"
            />
          )}
        />
      </Field>

      <Field
        id="pf-email"
        label="Contact email"
        required
        help="Shown as a mail link and used as the destination for contact-form messages."
        error={err("contactEmail")}
      >
        <Input
          id="pf-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.contactEmail}
          aria-describedby="pf-email-help"
          {...register("contactEmail")}
        />
      </Field>

      <ImageField
        id="pf-avatar"
        label="Photo"
        kind="image"
        aspect="aspect-square"
        url={(watch("avatarUrl") as string) || null}
        alt={(watch("avatarAlt") as string) || null}
        help="A clear, friendly head-and-shoulders photo, shown next to your name. Optional."
        urlError={err("avatarUrl")}
        altError={err("avatarAlt")}
        onChange={({ url, alt }) => {
          setValue("avatarUrl", url ?? "", { shouldDirty: true });
          setValue("avatarAlt", alt ?? "", { shouldDirty: true });
          clearErrors(["avatarUrl", "avatarAlt"]);
        }}
      />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
