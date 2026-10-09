"use client";

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moveItem } from "@/lib/admin/reorder";
import { skillSchema } from "@/lib/validation/skill";
import {
  createSkill,
  deleteSkill,
  reorderSkills,
} from "@/server/actions/admin/skills";
import type { AdminSkill } from "@/server/admin/queries";

/**
 * The chips of one skill group (SPEC §9.7): type + Enter adds, × removes, ←/→ buttons reorder.
 * Every change is saved straight away; buttons are disabled while a save is in flight.
 */
export function SkillChips({
  groupId,
  groupName,
  skills,
}: {
  groupId: string;
  groupName: string;
  skills: AdminSkill[];
}) {
  const router = useRouter();
  const [ordered, setOrdered] = useState(skills);
  const [seen, setSeen] = useState(skills);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Fresh server data after router.refresh() wins over local state.
  if (skills !== seen) {
    setSeen(skills);
    setOrdered(skills);
  }

  async function run(work: () => Promise<boolean>) {
    setBusy(true);
    try {
      const saved = await work();
      if (!saved) setOrdered(skills);
    } catch {
      toast.error("Couldn't reach the server. Nothing was changed.");
      setOrdered(skills);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function add() {
    const parsed = skillSchema.safeParse({ name: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a skill");
      return;
    }
    setError(undefined);
    await run(async () => {
      const result = await createSkill(groupId, parsed.data);
      if (!result.ok) {
        setError(result.fieldErrors?.name?.[0] ?? result.error);
        return false;
      }
      setDraft("");
      toast.success("Skill added — live on your site");
      return true;
    });
  }

  async function remove(skill: AdminSkill) {
    await run(async () => {
      const result = await deleteSkill(skill.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Skill removed");
      return result.ok;
    });
  }

  async function move(from: number, to: number) {
    const next = moveItem(ordered, from, to);
    setOrdered(next);
    await run(async () => {
      const result = await reorderSkills(
        groupId,
        next.map((s) => s.id),
      );
      if (!result.ok) toast.error(result.error);
      else toast.success("Order saved — live on your site");
      return result.ok;
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void add();
    }
  }

  const inputId = `skill-input-${groupId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="mt-3 space-y-3">
      {ordered.length > 0 ? (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label={`${groupName} skills`}
        >
          {ordered.map((skill, i) => (
            <li
              key={skill.id}
              className="flex items-center rounded-full bg-muted pl-1 text-sm"
            >
              <button
                type="button"
                disabled={busy || i === 0}
                onClick={() => void move(i, i - 1)}
                className="flex size-6 items-center justify-center rounded-full hover:bg-background disabled:opacity-30"
                aria-label={`Move ${skill.name} left`}
              >
                <ChevronLeft className="size-3.5" aria-hidden />
              </button>
              <span className="px-1">{skill.name}</span>
              <button
                type="button"
                disabled={busy || i === ordered.length - 1}
                onClick={() => void move(i, i + 1)}
                className="flex size-6 items-center justify-center rounded-full hover:bg-background disabled:opacity-30"
                aria-label={`Move ${skill.name} right`}
              >
                <ChevronRight className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(skill)}
                className="mr-0.5 flex size-6 items-center justify-center rounded-full hover:bg-background disabled:opacity-30"
                aria-label={`Remove ${skill.name}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No skills in this group.
        </p>
      )}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a skill, then Enter"
          aria-label={`Add a skill to ${groupName}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          disabled={busy}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void add()}
          aria-label={`Add skill to ${groupName}`}
        >
          <Plus aria-hidden /> Add
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
