"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ACCENT_HEX } from "@/lib/accent-colors";
import {
  ACCENTS,
  seoSchema,
  type Accent,
} from "@/lib/validation/site-settings";
import {
  logoutAllDevices,
  setContactForm,
  updateAppearance,
  updateSeo,
} from "@/server/actions/admin/settings";
import type { AdminSettings } from "@/server/admin/queries";
import { ConfirmDialog } from "./confirm-dialog";
import { Field, useEntityForm } from "./entity-form";
import { SwitchRow } from "./form-parts";

const ACCENT_LABELS: Record<Accent, string> = {
  indigo: "Indigo",
  blue: "Blue",
  teal: "Teal",
  emerald: "Emerald",
  amber: "Amber",
  rose: "Rose",
  violet: "Violet",
  slate: "Slate",
};

/** Accent preset picker with a live swatch (SPEC §9.9, D7: fixed presets, no free colour). */
export function AppearanceForm({ accent }: { accent: Accent }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Accent>(accent);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const result = await updateAppearance({ accent: selected });
      if (result.ok) {
        toast.success("Saved — live on your site");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Accent colour</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((a) => (
            <label
              key={a}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-checked:border-foreground has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="accent"
                value={a}
                checked={selected === a}
                onChange={() => setSelected(a)}
                className="sr-only"
              />
              <span
                aria-hidden
                className="size-4 rounded-full"
                style={{ backgroundColor: ACCENT_HEX[a] }}
              />
              {ACCENT_LABELS[a]}
            </label>
          ))}
        </div>
      </fieldset>
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        aria-live="polite"
        data-testid="accent-preview"
      >
        <span
          aria-hidden
          className="size-10 rounded-md"
          style={{ backgroundColor: ACCENT_HEX[selected] }}
        />
        <span
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: ACCENT_HEX[selected] }}
        >
          Preview: {ACCENT_LABELS[selected]}
        </span>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={save}
        disabled={pending || selected === accent}
      >
        {pending ? "Saving…" : "Save accent"}
      </Button>
    </div>
  );
}

export function SeoForm({ settings }: { settings: AdminSettings }) {
  const { form, onSubmit, pending } = useEntityForm({
    schema: seoSchema,
    defaultValues: {
      seoTitle: settings.seoTitle ?? "",
      seoDescription: settings.seoDescription,
    },
    submit: updateSeo,
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field
        id="seo-title"
        label="SEO title"
        help={`Shown in search results and browser tabs. Leave blank to use “${settings.fullName} — ${settings.headline}”.`}
        error={errors.seoTitle?.message as string | undefined}
        count={String(watch("seoTitle") ?? "").length}
        max={70}
      >
        <Input
          id="seo-title"
          aria-invalid={!!errors.seoTitle}
          aria-describedby="seo-title-help"
          {...register("seoTitle")}
        />
      </Field>
      <Field
        id="seo-description"
        label="SEO description"
        required
        help="One or two sentences for search results and link previews."
        error={errors.seoDescription?.message as string | undefined}
        count={String(watch("seoDescription") ?? "").length}
        max={160}
      >
        <Textarea
          id="seo-description"
          rows={3}
          aria-invalid={!!errors.seoDescription}
          aria-describedby="seo-description-help"
          {...register("seoDescription")}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save SEO"}
      </Button>
    </form>
  );
}

/** Saves immediately, like the eye toggles; rolls back with a toast on failure. */
export function ContactFormToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(enabled);

  function change(next: boolean) {
    start(async () => {
      setShown(next);
      const result = await setContactForm({ contactFormEnabled: next });
      if (result.ok) {
        toast.success("Saved — live on your site");
      } else {
        toast.error(result.error);
      }
      router.refresh();
    });
  }

  return (
    <div aria-busy={pending}>
      <SwitchRow
        id="contact-form-enabled"
        label="Contact form"
        help="Turn off to hide the contact form once it exists (a later phase). Your email address always stays visible."
        checked={shown}
        onChange={change}
      />
    </div>
  );
}

export function LogoutAllDevices() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await logoutAllDevices();
      // This browser's session is gone too; the login page is next.
      router.replace("/admin/login");
    } catch {
      setPending(false);
      toast.error("Couldn't log out other devices. Please try again.");
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Log out of all devices
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Log out of all devices?"
        description="Every signed-in browser, including this one, is signed out. You'll need your password to get back in."
        confirmLabel="Log out everywhere"
        pending={pending}
        onConfirm={confirm}
      />
    </>
  );
}
