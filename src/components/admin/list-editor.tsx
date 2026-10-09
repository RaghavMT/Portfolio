"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { moveItem } from "@/lib/admin/reorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  maxLength: number;
  /** Singular noun, e.g. "highlight". */
  noun: string;
  placeholder?: string;
};

/** Editable list of short text lines with add / remove / ↑↓ (SPEC §9.6 highlights, max 8). */
export function ListEditor({
  id,
  value,
  onChange,
  max,
  maxLength,
  noun,
  placeholder,
}: Props) {
  function set(index: number, text: string) {
    onChange(value.map((v, i) => (i === index ? text : v)));
  }

  return (
    <div className="space-y-2">
      {value.map((line, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            id={i === 0 ? id : undefined}
            value={line}
            maxLength={maxLength + 20}
            placeholder={placeholder}
            aria-label={`${noun} ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={i === 0}
            onClick={() => onChange(moveItem(value, i, i - 1))}
            aria-label={`Move ${noun} ${i + 1} up`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={i === value.length - 1}
            onClick={() => onChange(moveItem(value, i, i + 1))}
            aria-label={`Move ${noun} ${i + 1} down`}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remove ${noun} ${i + 1}`}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= max}
        onClick={() => onChange([...value, ""])}
      >
        <Plus aria-hidden /> Add {noun}
        {value.length >= max ? ` (limit ${max})` : ""}
      </Button>
    </div>
  );
}
