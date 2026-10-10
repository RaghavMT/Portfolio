"use client";

import { Upload } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A button + drop zone that hands the chosen file(s) to `onFiles`. The button is the accessible
 * path (keyboard, screen readers, phones); drag-and-drop is a convenience on top.
 */
export function FileDrop({
  accept,
  multiple = false,
  disabled,
  progress,
  buttonLabel,
  hint,
  describedBy,
  onFiles,
  children,
}: {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  /** 0–100 while uploading, otherwise null. */
  progress: number | null;
  buttonLabel: string;
  hint?: ReactNode;
  describedBy?: string;
  onFiles: (files: File[]) => void;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const progressId = useId();
  const busy = progress !== null;

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled || busy) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && !busy) pick(e.dataTransfer.files);
      }}
      className={`rounded-lg border border-dashed p-3 transition-colors ${over ? "border-foreground bg-muted" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy}
          aria-describedby={describedBy}
          onClick={() => input.current?.click()}
        >
          <Upload aria-hidden /> {buttonLabel}
        </Button>
        <span className="text-xs text-muted-foreground">
          {hint ?? "or drop a file here"}
        </span>
      </div>
      {busy ? (
        <div className="mt-3">
          <label htmlFor={progressId} className="sr-only">
            Upload progress
          </label>
          <progress
            id={progressId}
            className="h-2 w-full"
            value={progress}
            max={100}
          />
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
            Uploading… {progress}%
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
