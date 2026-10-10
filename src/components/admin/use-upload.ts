"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { checkFile, uploadPathname, type UploadKind } from "@/lib/upload-rules";

/** Width in pixels of an image file, or null when the browser can't tell. */
export async function imageWidth(file: File): Promise<number | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width } = bitmap;
    bitmap.close();
    return width;
  } catch {
    return null;
  }
}

/**
 * Browser side of an upload (SPEC §10.1): check the file first for fast feedback, then send it
 * straight to Blob with a token from `/api/upload`. Resolves to the file's URL, or null after setting
 * `error`. The URL is only saved when the surrounding form is saved.
 */
export function useUpload(kind: UploadKind) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function start(file: File): Promise<string | null> {
    if (busy.current) return null;
    setError(null);
    const problem = checkFile(kind, file);
    if (problem) {
      setError(problem);
      return null;
    }
    busy.current = true;
    setProgress(0);
    try {
      const blob = await upload(uploadPathname(kind, file.name), file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ kind }),
        contentType: file.type,
        onUploadProgress: (event) => setProgress(Math.round(event.percentage)),
      });
      return blob.url;
    } catch {
      setError("The upload failed. Check your connection and try again.");
      return null;
    } finally {
      busy.current = false;
      setProgress(null);
    }
  }

  return {
    start,
    progress,
    uploading: progress !== null,
    error,
    clearError: () => setError(null),
  };
}
