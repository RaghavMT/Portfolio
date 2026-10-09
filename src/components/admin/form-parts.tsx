"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/** A labelled on/off row, used inside `<Controller>` for `visible`, `isExpected`, etc. */
export function SwitchRow({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div>
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
        {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Save / Cancel row for side-sheet forms. */
export function FormActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
      <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
