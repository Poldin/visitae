import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop – Visitae",
  description:
    "Ordina prodotti dai fornitori per la tua struttura: consumabili, strumentario e materiali medici.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
