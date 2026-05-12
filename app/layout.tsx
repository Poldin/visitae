import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visitae – Prenota la tua visita",
  description:
    "Prenota una visita medica online in pochi click. Trova il tuo medico e scegli il momento più comodo per te.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
