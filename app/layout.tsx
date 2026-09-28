import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import { Theme } from "@astryxdesign/core";
import { razborTheme } from "../razbor";
import "./globals.css";

const display = Unbounded({
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
      {/* mode="light" rather than "system": the call screen is designed light,
          and the remaining screens still run on the hardcoded dark legacy
          palette — following the OS would only desynchronise the two. The
          theme does define full dark pairs, so this is a one-word change once
          those screens move over. */}
      <body className="min-h-full bg-void text-ink antialiased">
        <Theme theme={razborTheme} mode="light">
          {children}
        </Theme>
      </body>
    </html>
  );
}
