"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

type Props = {
  visible: boolean;
  /** Names the item for screen readers, e.g. "GitHub". */
  label: string;
  onChange: (visible: boolean) => Promise<ActionResult<void>>;
  /** Wording for the two states; projects use Published / Draft. */
  onLabel?: string;
  offLabel?: string;
};

/** Eye button that flips visibility instantly (SPEC §9.1) and rolls back with a toast on failure. */
export function VisibilityToggle({
  visible,
  label,
  onChange,
  onLabel = "Visible",
  offLabel = "Hidden",
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(visible);

  function toggle() {
    const next = !shown;
    start(async () => {
      setShown(next);
      const result = await onChange(next);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      disabled={pending}
      aria-pressed={shown}
      aria-label={`${label}: ${shown ? onLabel : offLabel}. Click to ${shown ? "hide" : "show"}`}
      title={shown ? onLabel : offLabel}
    >
      {shown ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
    </Button>
  );
}
