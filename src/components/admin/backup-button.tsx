"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportBackup } from "@/server/actions/admin/backup";

/** Settings → Backup (SPEC §9.11): builds the file on the server and saves it from the browser. */
export function BackupButton() {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const result = await exportBackup();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([result.data.json], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Saved ${result.data.filename}`);
    } catch {
      toast.error("Couldn't create the backup. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => void download()}
    >
      <Download aria-hidden /> {pending ? "Preparing…" : "Download backup"}
    </Button>
  );
}
