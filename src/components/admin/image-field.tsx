"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UPLOAD_RULES } from "@/lib/upload-rules";
import { FileDrop } from "./file-drop";
import { imageWidth, useUpload } from "./use-upload";

type Props = {
  /** Used for element ids: `{id}-alt`, `{id}-help`. */
  id: string;
  label: string;
  kind: "image" | "og";
  url: string | null;
  /** Ignored when `withAlt` is false. */
  alt: string | null;
  onChange: (next: { url: string | null; alt: string | null }) => void;
  /** Alt text is required with every content image (default); the share-card image has none. */
  withAlt?: boolean;
  help?: string;
  urlError?: string;
  altError?: string;
  /** Warn (don't block) when a picked image is narrower than this many pixels (SPEC §10.2). */
  minWidth?: number;
  /** Tailwind aspect class for the preview. */
  aspect?: string;
};

/**
 * Upload / replace / remove one image with a preview and alt text (SPEC §9.5, §10.1). The file goes
 * straight to Blob; `onChange` only updates the form, and the URL is saved when the form is saved.
 */
export function ImageField({
  id,
  label,
  kind,
  url,
  alt,
  onChange,
  withAlt = true,
  help,
  urlError,
  altError,
  minWidth,
  aspect = "aspect-video",
}: Props) {
  const { start, progress, uploading, error, clearError } = useUpload(kind);
  const [warning, setWarning] = useState<string | null>(null);
  const rule = UPLOAD_RULES[kind];

  async function onFiles([file]: File[]) {
    setWarning(null);
    const uploaded = await start(file);
    if (!uploaded) return;
    if (minWidth) {
      const width = await imageWidth(file);
      if (width !== null && width < minWidth) {
        setWarning(
          `This image is ${width} px wide. At least ${minWidth} px looks sharper on large screens.`,
        );
      }
    }
    onChange({ url: uploaded, alt: withAlt ? (alt ?? "") : null });
  }

  const message = error ?? urlError;
  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`}>
      <Label id={`${id}-label`}>{label}</Label>
      {url ? (
        <div
          className={`relative w-full max-w-md overflow-hidden rounded-lg border bg-muted ${aspect}`}
        >
          <Image
            src={url}
            alt={withAlt ? (alt ?? "") : ""}
            fill
            unoptimized
            sizes="448px"
            className="object-cover"
          />
        </div>
      ) : null}
      <FileDrop
        accept={rule.types.join(",")}
        progress={progress}
        disabled={uploading}
        buttonLabel={url ? "Replace image" : "Choose image"}
        hint={`${rule.typesLabel.replace(/^an? /, "")} · up to ${rule.maxLabel} · or drop a file here`}
        describedBy={`${id}-help`}
        onFiles={(files) => {
          clearError();
          void onFiles(files);
        }}
      >
        {url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              clearError();
              setWarning(null);
              onChange({ url: null, alt: null });
            }}
          >
            <Trash2 aria-hidden /> Remove image
          </Button>
        ) : null}
      </FileDrop>
      {help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
      {warning ? (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </p>
      ) : null}
      {message ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {withAlt && url ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-alt`}>
            Describe the image
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </Label>
          <Input
            id={`${id}-alt`}
            value={alt ?? ""}
            maxLength={180}
            aria-invalid={!!altError}
            aria-describedby={`${id}-alt-help`}
            onChange={(e) => onChange({ url, alt: e.target.value })}
          />
          <p id={`${id}-alt-help`} className="text-xs text-muted-foreground">
            For screen readers and search engines, e.g. “Dashboard showing
            weekly sales by region”.
          </p>
          {altError ? (
            <p role="alert" className="text-sm text-destructive">
              {altError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
