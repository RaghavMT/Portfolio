"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { moveItem } from "@/lib/admin/reorder";
import { MAX_PROJECT_IMAGES } from "@/lib/validation/project-image";
import { UPLOAD_RULES } from "@/lib/upload-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDrop } from "./file-drop";
import { useUpload } from "./use-upload";

export type GalleryItem = { url: string; alt: string; caption: string };

type Props = {
  id: string;
  value: GalleryItem[];
  onChange: (value: GalleryItem[]) => void;
  /** Field errors per image index, from the form's validation. */
  errors?: Record<number, { alt?: string; caption?: string }>;
  /** Shown for list-level problems, e.g. too many images. */
  error?: string;
};

/**
 * Project gallery (SPEC §9.5 item 9): multi-upload, alt text per image, caption, ↑/↓ reorder and
 * remove. Everything stays in the form until it is saved (SPEC §10.1). Up to 12 images (§7.2).
 */
export function GalleryField({ id, value, onChange, errors, error }: Props) {
  const {
    start,
    progress,
    uploading,
    error: uploadError,
    clearError,
  } = useUpload("image");
  const rule = UPLOAD_RULES.image;
  const room = MAX_PROJECT_IMAGES - value.length;

  async function add(files: File[]) {
    clearError();
    let next = value;
    for (const file of files.slice(0, room)) {
      const url = await start(file);
      if (!url) break;
      next = [...next, { url, alt: "", caption: "" }];
      onChange(next);
    }
  }

  function patch(index: number, change: Partial<GalleryItem>) {
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  }

  const message = uploadError ?? error;
  return (
    <div className="space-y-3" role="group" aria-labelledby={`${id}-label`}>
      <Label id={`${id}-label`}>
        Gallery ({value.length}/{MAX_PROJECT_IMAGES})
      </Label>
      {value.length > 0 ? (
        <ul className="space-y-3">
          {value.map((item, i) => (
            <li
              key={item.url}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[8rem_1fr]"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted sm:w-32">
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  unoptimized
                  sizes="128px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${i}-alt`}>
                    Describe image {i + 1}
                    <span className="text-destructive" aria-hidden>
                      {" "}
                      *
                    </span>
                    <span className="sr-only"> (required)</span>
                  </Label>
                  <Input
                    id={`${id}-${i}-alt`}
                    value={item.alt}
                    maxLength={180}
                    aria-invalid={!!errors?.[i]?.alt}
                    onChange={(e) => patch(i, { alt: e.target.value })}
                  />
                  {errors?.[i]?.alt ? (
                    <p role="alert" className="text-sm text-destructive">
                      {errors[i].alt}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${i}-caption`}>
                    Caption for image {i + 1} (optional)
                  </Label>
                  <Input
                    id={`${id}-${i}-caption`}
                    value={item.caption}
                    maxLength={220}
                    aria-invalid={!!errors?.[i]?.caption}
                    onChange={(e) => patch(i, { caption: e.target.value })}
                  />
                  {errors?.[i]?.caption ? (
                    <p role="alert" className="text-sm text-destructive">
                      {errors[i].caption}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={i === 0}
                    onClick={() => onChange(moveItem(value, i, i - 1))}
                    aria-label={`Move image ${i + 1} up`}
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={i === value.length - 1}
                    onClick={() => onChange(moveItem(value, i, i + 1))}
                    aria-label={`Move image ${i + 1} down`}
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <Trash2 aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <FileDrop
        accept={rule.types.join(",")}
        multiple
        progress={progress}
        disabled={uploading || room <= 0}
        buttonLabel={room <= 0 ? "Gallery is full" : "Add images"}
        hint={`${rule.typesLabel.replace(/^an? /, "")} · up to ${rule.maxLabel} each · or drop files here`}
        describedBy={`${id}-help`}
        onFiles={(files) => void add(files)}
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        Screenshots or diagrams that show the work. Every image needs a
        description for screen readers. Images are published with the project
        when you save.
      </p>
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
