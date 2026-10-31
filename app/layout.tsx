import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display-face", weight: ["500", "600", "700"] });
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "OneDoor — one door to NYC energy bill help",
  description:
    "A 5-minute, multilingual screener that routes every NYC household to the right Con Edison discount — including when the bill is in someone else's name.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#0f4c5c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <LangProvider>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:m-2 focus:rounded focus:bg-paper focus:p-2">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
