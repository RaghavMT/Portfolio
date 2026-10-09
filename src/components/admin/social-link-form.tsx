"use client";

import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/social";
import {
  SOCIAL_PLATFORMS,
  socialLinkSchema,
  type SocialLinkValues,
} from "@/lib/validation/social-link";
import {
  createSocialLink,
  updateSocialLink,
} from "@/server/actions/admin/social-links";
import { Field, useEntityForm } from "./entity-form";

type Props = {
  /** Present when editing; absent when creating. */
  link?: { id: string } & Partial<SocialLinkValues>;
  onDone: () => void;
};

export function SocialLinkForm({ link, onDone }: Props) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: socialLinkSchema,
    defaultValues: {
      platform: link?.platform ?? "github",
      label: link?.label ?? "",
      url: link?.url ?? "",
      visible: link?.visible ?? true,
    },
    submit: (values) =>
      link ? updateSocialLink(link.id, values) : createSocialLink(values),
    onSaved: onDone,
  });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const platform = watch("platform");

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field id="sl-platform" label="Platform" required>
        <Controller
          control={control}
          name="platform"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="sl-platform" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOCIAL_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {SOCIAL_PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        id="sl-label"
        label="Label"
        required={platform === "other"}
        help="Only needed for “Link”: the text visitors see, e.g. Blog."
        error={errors.label?.message as string | undefined}
        count={String(watch("label") ?? "").length}
        max={40}
      >
        <Input
          id="sl-label"
          aria-invalid={!!errors.label}
          aria-describedby="sl-label-help"
          {...register("label")}
        />
      </Field>

      <Field
        id="sl-url"
        label="Link"
        required
        help={
          platform === "email"
            ? "Use mailto:you@example.com"
            : "A full https:// address, e.g. https://github.com/RaghavMT"
        }
        error={errors.url?.message as string | undefined}
      >
        <Input
          id="sl-url"
          inputMode="url"
          autoComplete="off"
          aria-invalid={!!errors.url}
          aria-describedby="sl-url-help"
          {...register("url")}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <label htmlFor="sl-visible" className="text-sm">
          Show on my site
        </label>
        <Controller
          control={control}
          name="visible"
          render={({ field }) => (
            <Switch
              id="sl-visible"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : link ? "Save changes" : "Add link"}
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
