import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: { default: "Justice for CSJDM29 — evidence & pet identification registry", template: "%s · Justice for CSJDM29" },
  description:
    "A community evidence and identification registry for pet owners affected by the San Jose del Monte animal remains discovery. Documents information and potential matches; does not determine legal responsibility.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
