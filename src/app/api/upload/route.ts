import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/same-origin";
import { logAction } from "@/lib/logger";
import { requireAdmin, UnauthorizedError } from "@/server/auth/require-admin";
import { tokenOptions } from "@/server/blob";

/**
 * Hands the browser a short-lived Blob upload token (SPEC §10.1). Admin only: the session is checked
 * first (401), then the Origin (403, SPEC §12.7). The file itself goes straight to Blob; the URL is
 * saved only when the form is saved, so there is no `onUploadCompleted` callback.
 */
export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  if (
    !isSameOrigin(request.headers.get("origin"), request.headers.get("host"))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: tokenOptions,
    });
    logAction({ action: "uploadToken", ok: true, startedAt });
    return NextResponse.json(result);
  } catch {
    // Never echo SDK or validation details back to the client.
    logAction({
      action: "uploadToken",
      ok: false,
      startedAt,
      code: "rejected",
    });
    return NextResponse.json({ error: "Upload not allowed" }, { status: 400 });
  }
}
