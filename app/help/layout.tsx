import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Centro assistenza · Visitae",
  description:
    "Guide e informazioni su Visitae: magazzino clinico, carico e scarico, inventario, DDT, lettura codici e altro.",
};

export default function HelpLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
