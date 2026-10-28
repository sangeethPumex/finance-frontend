import { ImageResponse } from "next/og";

// Android install needs 192 and 512 PNGs; draw the same "C" tile as the Apple icon.
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const px = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", color: "#ffffff", fontSize: px * 0.6, fontWeight: 600 }}>C</div>, { width: px, height: px });
}
