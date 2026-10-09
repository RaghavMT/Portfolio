import { NextResponse } from "next/server";
import { getSettings } from "@/server/queries/public";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** 302 to the current resume PDF; a small 404 page with a contact link when there is none (§8.1). */
export async function GET() {
  const settings = await getSettings();
  if (settings?.resumeUrl)
    return NextResponse.redirect(settings.resumeUrl, 302);

  const email = settings ? escapeHtml(settings.contactEmail) : "";
  const contact = email
    ? `<p>Please <a href="mailto:${email}">email me</a> and I'll send it over.</p>`
    : "";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Resume not available</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Resume not available yet</h1>${contact}<p><a href="/">Back to the home page</a></p></body></html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
