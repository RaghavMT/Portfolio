"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { Label } from "@/components/ui/label";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Options<S extends z.ZodType, R> = {
  schema: S;
  defaultValues: DefaultValues<z.input<S> & FieldValues>;
  /** Calls the Server Action with the already-validated values. */
  submit: (values: z.output<S>) => Promise<ActionResult<R>>;
  onSaved?: (data: R) => void;
  successMessage?: string;
};

/**
 * react-hook-form wired to the entity's Zod schema (SPEC §9.1, §14.2). The server re-validates;
 * its field errors are mapped back onto the inputs, and the form keeps every value on failure.
 */
export function useEntityForm<S extends z.ZodType, R = void>({
  schema,
  defaultValues,
  submit,
  onSaved,
  successMessage = "Saved — live on your site",
}: Options<S, R>) {
  type In = z.input<S> & FieldValues;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const form = useForm<In, unknown, z.output<S>>({
    // zodResolver's overloads can't see through a generic schema; the value types are asserted by `Options`.
    resolver: zodResolver(schema as never) as never,
    defaultValues,
  });
  useUnsavedChanges(
    form.formState.isDirty && !form.formState.isSubmitSuccessful,
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const result = await submit(values);
      if (result.ok) {
        toast.success(successMessage);
        form.reset(form.getValues());
        onSaved?.(result.data);
        router.refresh();
        return;
      }
      for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(name as Path<In>, { message: messages[0] });
      }
      toast.error(result.error);
    } catch {
      toast.error("Couldn't reach the server. Your changes are still here.");
    } finally {
      setPending(false);
    }
  });

  return { form, onSubmit, pending };
}

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  /** What a recruiter wants to see here (SPEC §9.1). */
  help?: ReactNode;
  error?: string;
  /** Shows a live character counter when `max` is set. */
  count?: number;
  max?: number;
  children: ReactNode;
};

export function Field({
  id,
  label,
  required,
  help,
  error,
  count,
  max,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </Label>
        {max !== undefined && count !== undefined ? (
          <span
            className={`text-xs tabular-nums ${count > max ? "text-destructive" : "text-muted-foreground"}`}
            aria-hidden
          >
            {count}/{max}
          </span>
        ) : null}
      </div>
      {children}
      {help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
