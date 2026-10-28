import { ImageResponse } from "next/og";

// The home-screen icon iOS asks for. It only takes PNG, so draw one.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", color: "#ffffff", fontSize: 110, fontWeight: 600 }}>C</div>, size);
}
