"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage, type ContactState } from "@/server/actions/contact";

const initial: ContactState = { status: "idle" };

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Contact form (SPEC §11). Plain `<form action>` + `useActionState`, no form library, to keep
 * public JS small (§13.1). The render stamp is set in the browser because this page is cached.
 */
export function ContactForm() {
  const [state, action, pending] = useActionState(sendMessage, initial);
  const stamp = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // defaultValue (not value) so React's post-submit form reset keeps the stamp.
    if (stamp.current) stamp.current.defaultValue = String(Date.now());
  }, []);

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="max-w-xl rounded-lg border bg-card p-6 text-card-foreground"
      >
        <p className="font-medium">{state.message}</p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const aria = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-error` : undefined,
  });

  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      <input type="hidden" name="renderedAt" ref={stamp} defaultValue="" />
      {/* Honeypot: invisible and unreachable for people, tempting for bots (SPEC §11.1). */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" label="Name" error={errors.name?.[0]}>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            defaultValue={values?.name}
            className="h-10"
            {...aria("name")}
          />
        </Field>
        <Field id="contact-email" label="Email" error={errors.email?.[0]}>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            defaultValue={values?.email}
            className="h-10"
            {...aria("email")}
          />
        </Field>
        <Field
          id="contact-company"
          label="Company"
          optional
          error={errors.company?.[0]}
        >
          <Input
            id="contact-company"
            name="company"
            autoComplete="organization"
            maxLength={120}
            defaultValue={values?.company}
            className="h-10"
            {...aria("company")}
          />
        </Field>
        <Field
          id="contact-subject"
          label="Subject"
          optional
          error={errors.subject?.[0]}
        >
          <Input
            id="contact-subject"
            name="subject"
            maxLength={150}
            defaultValue={values?.subject}
            className="h-10"
            {...aria("subject")}
          />
        </Field>
      </div>
      <Field id="contact-body" label="Message" error={errors.body?.[0]}>
        <Textarea
          id="contact-body"
          name="body"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          defaultValue={values?.body}
          className="min-h-32"
          {...aria("body")}
        />
      </Field>

      <p
        role="alert"
        aria-live="polite"
        className="min-h-5 text-sm text-destructive"
      >
        {state.status === "error" ? state.message : null}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send className="size-4" aria-hidden />
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
