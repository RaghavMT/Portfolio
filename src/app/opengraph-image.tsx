import { ImageResponse } from "next/og";
import { ACCENT_HEX } from "@/lib/accent-colors";
import type { Accent } from "@/lib/validation/site-settings";
import { getSettings } from "@/server/queries/public";

export const alt = "Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image: name + headline on the accent colour (SPEC §8.1). */
export default async function OpenGraphImage() {
  const settings = await getSettings();
  const accent = ACCENT_HEX[(settings?.accent as Accent) ?? "indigo"];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: accent,
        color: "#ffffff",
      }}
    >
      <div style={{ fontSize: 88, fontWeight: 700 }}>
        {settings?.fullName ?? "Portfolio"}
      </div>
      {settings && (
        <div style={{ fontSize: 44, marginTop: 24, opacity: 0.9 }}>
          {settings.headline}
        </div>
      )}
    </div>,
    size,
  );
}
