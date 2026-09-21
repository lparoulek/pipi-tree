import type { Metadata, Viewport } from "next";
import { Baloo_2, Lobster } from "next/font/google";
import "./globals.css";

/**
 * Oba fonty musí mít `latin-ext`, jinak se rozsypou háčky a čárky ve jménech
 * (Štěpán, Žofie, Řehoř). Pozor: nejvánočnější font „Mountains of Christmas“
 * umí jen `latin`, proto tu není.
 */
const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  variable: "--font-baloo",
  display: "swap",
});

const lobster = Lobster({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-lobster",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pipi Tree — vánoční losování dárků",
  description: "Vylosuj si, koho obdaruješ. Dárek musí začínat na stejné písmeno.",
};

export const viewport: Viewport = {
  themeColor: "#2a0a3f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs" className={`${baloo.variable} ${lobster.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
