"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UPLOAD_RULES } from "@/lib/upload-rules";
import { updateResume } from "@/server/actions/admin/profile";
import { ConfirmDialog } from "./confirm-dialog";
import { FileDrop } from "./file-drop";
import { useUpload } from "./use-upload";

const when = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

const fileName = (url: string) =>
  decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "resume.pdf");

const megabytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * Résumé PDF (SPEC §9.4). Unlike the other uploads it saves on its own: choosing a file uploads it
 * and replaces the résumé right away, so `/resume` serves the new file and the old one is deleted.
 */
export function ResumeField({
  url,
  updatedAt,
  size,
}: {
  url: string | null;
  /** ISO timestamp from the server. */
  updatedAt: string | null;
  size: number | null;
}) {
  const router = useRouter();
  const { start, progress, uploading, error, clearError } = useUpload("resume");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const rule = UPLOAD_RULES.resume;

  async function save(resumeUrl: string | null) {
    setSaving(true);
    try {
      const result = await updateResume({ resumeUrl });
      if (result.ok) {
        toast.success(
          resumeUrl
            ? "Résumé updated — live on your site"
            : "Résumé removed from your site",
        );
        router.refresh();
        return true;
      }
      toast.error(result.error);
      return false;
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onFiles([file]: File[]) {
    clearError();
    const uploaded = await start(file);
    if (uploaded) await save(uploaded);
  }

  return (
    <div className="space-y-3" role="group" aria-labelledby="resume-label">
      <Label id="resume-label">Résumé (PDF)</Label>
      {url ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium break-all">{fileName(url)}</p>
          <p className="text-muted-foreground">
            {[
              size !== null ? megabytes(size) : null,
              updatedAt ? `updated ${when.format(new Date(updatedAt))}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Uploaded"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/resume" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open current résumé
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving || uploading}
              onClick={() => setRemoving(true)}
            >
              <Trash2 aria-hidden /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No résumé yet. The “Résumé” button on your site stays hidden until you
          add one.
        </p>
      )}
      <FileDrop
        accept={rule.types.join(",")}
        progress={progress}
        disabled={uploading || saving}
        buttonLabel={url ? "Replace résumé" : "Upload résumé"}
        hint={`PDF · up to ${rule.maxLabel} · saved and live as soon as it uploads`}
        describedBy="resume-help"
        onFiles={(files) => void onFiles(files)}
      />
      <p id="resume-help" className="text-xs text-muted-foreground">
        Replacing the résumé deletes the old file. Keep it to one or two pages.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Remove your résumé?"
        description="The file is deleted and the Résumé button disappears from your site."
        confirmLabel="Remove résumé"
        pending={saving}
        onConfirm={async () => {
          if (await save(null)) setRemoving(false);
        }}
      />
    </div>
  );
}
