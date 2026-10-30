import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/latin-300.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-mono/latin-400.css";
import "@fontsource/dm-mono/latin-500.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Catalyst", description: "Personal finance", icons: { icon: "/catalyst-short.svg" },
  appleWebApp: { capable: true, title: "Catalyst", statusBarStyle: "default" }, formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#faf9f7", colorScheme: "light", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
