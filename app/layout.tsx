import type { Metadata } from "next";
import { Wix_Madefor_Display, Manrope, JetBrains_Mono } from "next/font/google";
import { Theme } from "@astryxdesign/core";
import { razborTheme } from "../razbor";
import "./globals.css";

// Headings. Cyrillic is non-negotiable here — the whole interface is Russian,
// and a face without it (Figtree, DM Sans) silently renders every heading in
// the system fallback instead.
const display = Wix_Madefor_Display({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Разбор полётов — симулятор управленческих переговоров",
  description: "Тренажёр сложных разговоров с сотрудником. Состояние считает движок, а не нейросеть.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
      {/* The product is light-only. The body used to carry the old dark
          palette, which left new screens painting near-black text on a
          near-black background. Both background and text now come from the
          theme. */}
      <body className="min-h-full bg-body text-primary antialiased">
        <Theme theme={razborTheme} mode="light">
          {children}
        </Theme>
      </body>
    </html>
  );
}
