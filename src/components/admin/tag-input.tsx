"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { addTags, suggestTags } from "@/lib/admin/tags";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  maxLength: number;
  /** Existing tags elsewhere on the site, offered as you type. */
  suggestions?: string[];
  invalid?: boolean;
  describedBy?: string;
};

/** Type + Enter (or a comma) adds a tag; × removes it (SPEC §9.5). */
export function TagInput({
  id,
  value,
  onChange,
  max,
  maxLength,
  suggestions = [],
  invalid,
  describedBy,
}: Props) {
  const [draft, setDraft] = useState("");
  const matches = suggestTags(suggestions, value, draft);

  function commit(text: string) {
    onChange(addTags(value, text, { max, maxLength }));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {value.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-1 rounded-full bg-muted py-0.5 pr-0.5 pl-3 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="flex size-6 items-center justify-center rounded-full hover:bg-background"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        onChange={(e) => {
          const text = e.target.value;
          // Pasting "a, b, c" adds them all.
          if (text.includes(",")) commit(text);
          else setDraft(text);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        disabled={value.length >= max}
        placeholder={
          value.length >= max ? `Limit of ${max} reached` : "Type, then Enter"
        }
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
      />
      {matches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Suggestions:</span>
          {matches.map((m) => (
            <Button
              key={m}
              type="button"
              size="xs"
              variant="outline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(m)}
            >
              {m}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
