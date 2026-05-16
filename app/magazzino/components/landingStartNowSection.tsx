"use client";

import { useState } from "react";

// ─── Data ───────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  brand: string;
}

interface Category {
  id: string;
  label: string;
  products: Product[];
}

const CATEGORIES: Category[] = [
  {
    id: "conservativa",
    label: "Conservativa e Restauro",
    products: [
      { id: "filtek", name: "Filtek Supreme XTE", brand: "3M" },
      { id: "tetric", name: "Tetric EvoCeram", brand: "Ivoclar" },
      { id: "omni", name: "Omnichroma", brand: "Tokuyama" },
      { id: "gaenial", name: "G-ænial / Essentia", brand: "GC Corporation" },
      { id: "scotch", name: "Adper Scotchbond Universal", brand: "3M" },
      { id: "enamelplus", name: "Enamel Plus HRi", brand: "Micerium" },
      { id: "venus", name: "Venus Pearl/Diamond", brand: "Kulzer" },
      { id: "admira", name: "Admira Fusion", brand: "VOCO" },
      { id: "ceramx", name: "Ceram.x Spectra ST", brand: "Dentsply Sirona" },
      { id: "clearfil", name: "Clearfil Majesty", brand: "Kuraray" },
    ],
  },
  {
    id: "monouso",
    label: "Monouso e Protezione",
    products: [
      { id: "guanti", name: "Guanti in Nitrile", brand: "Ansell / Aurelia" },
      { id: "mascherine", name: "Mascherine chirurgiche IIR", brand: "Euronda" },
      { id: "aspirasaliva", name: "Aspirasaliva Monoart", brand: "Euronda" },
      { id: "bicchieri", name: "Bicchieri in plastica/carta", brand: "DPI / Omnia" },
      { id: "mantelline", name: "Mantelline con laccetti", brand: "Akzenta / Euronda" },
      { id: "rulli", name: "Rulli di cotone Luna", brand: "Coltene" },
      { id: "diga", name: "Diga di gomma Nic Tone", brand: "MDC Dental" },
      { id: "vassoi", name: "Vassoi monouso", brand: "Zhermack" },
    ],
  },
  {
    id: "impronte",
    label: "Impronte e Diagnostica",
    products: [
      { id: "hydrogum", name: "Hydrogum 5 (Alginato)", brand: "Zhermack" },
      { id: "elite", name: "Elite HD+ (Silicone)", brand: "Zhermack" },
      { id: "impregum", name: "Impregum (Polietere)", brand: "3M" },
      { id: "variotime", name: "Variotime", brand: "Kulzer" },
      { id: "punte", name: "Punte miscelatrici", brand: "Sulzer Mixpac" },
    ],
  },
  {
    id: "chirurgia",
    label: "Chirurgia e Anestesia",
    products: [
      { id: "articaina", name: "Articaina (Septanest)", brand: "Septodont" },
      { id: "aghi", name: "Aghi Septoject", brand: "Septodont" },
      { id: "suture", name: "Suture Vicryl/Ethicon", brand: "J&J" },
      { id: "lame", name: "Lame bisturi", brand: "Swann-Morton" },
    ],
  },
  {
    id: "endo",
    label: "Endodonzia",
    products: [
      { id: "protaper", name: "Protaper Gold / WaveOne", brand: "Dentsply Sirona" },
      { id: "reciproc", name: "Reciproc / Mtwo", brand: "VDW" },
      { id: "niclor", name: "Ipoclorito di Sodio Niclor", brand: "Ogna" },
      { id: "ahplus", name: "Canal Sealer AH Plus", brand: "Dentsply Sirona" },
    ],
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface SelectedProduct extends Product {
  qty: string;
  exp: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvailableChip({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50 px-2"
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        +
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {product.name}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {product.brand}
        </span>
      </span>
    </button>
  );
}

function SelectedItem({
  product,
  onRemove,
  onUpdate,
}: {
  product: SelectedProduct;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: "qty" | "exp", value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-none">
      <div className="flex items-start gap-2">
      <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-[10px] text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label={`Rimuovi ${product.name}`}
        >
          ✕
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {product.name}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {product.brand}
          </p>
        </div>

      </div>
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Quantità
          </label>
          <input
            type="number"
            min="1"
            placeholder="es. 10"
            value={product.qty}
            onChange={(e) => onUpdate(product.id, "qty", e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Scadenza
          </label>
          <input
            type="date"
            value={product.exp}
            onChange={(e) => onUpdate(product.id, "exp", e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingStartNowSection() {
  const [activeCatId, setActiveCatId] = useState<string>(CATEGORIES[0].id);
  const [selected, setSelected] = useState<Record<string, SelectedProduct>>({});
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const activeCat = CATEGORIES.find((c) => c.id === activeCatId)!;
  const availableInCat = activeCat.products.filter((p) => !selected[p.id]);
  const selectedList = Object.values(selected);

  function countSelectedInCat(catId: string) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    return cat?.products.filter((p) => selected[p.id]).length ?? 0;
  }

  function handleAdd(product: Product) {
    setSelected((prev) => ({
      ...prev,
      [product.id]: { ...product, qty: "", exp: "" },
    }));
  }

  function handleRemove(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleUpdate(id: string, field: "qty" | "exp", value: string) {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function handleSubmit() {
    if (!email || selectedList.length === 0) return;

    // TODO: sostituisci con la tua chiamata API
    // await fetch("/api/waitlist", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ email, products: selectedList }),
    // });

    setSubmitted(true);
  }

  const canSubmit = email.includes("@") && selectedList.length > 0;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Inizia subito. Proprio adesso 👇👇👇
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 md:text-3xl">
          Quali prodotti avete in studio?
        </h2>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Seleziona i prodotti che usate di solito e lascia la tua mail in fondo
          per iscriverti: in 5 min avete già una parte del magazzino tracciato!
        </p>
      </div>

      {/* Category tabs & Available Products Container */}
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const count = countSelectedInCat(cat.id);
            const isActive = cat.id === activeCatId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCatId(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                      isActive
                        ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Available products */}
        <div>
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            Disponibili in questa categoria
          </p>
          {availableInCat.length === 0 ? (
            <div className="text-sm text-zinc-400 dark:text-zinc-500 py-2 pl-2">
              Tutti i prodotti di questa categoria sono stati aggiunti.
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {availableInCat.map((p) => (
                <AvailableChip key={p.id} product={p} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single Column Area: Selected products */}
      <div className="w-full pt-2">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          Nel tuo studio
          {selectedList.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
              {selectedList.length}
            </span>
          )}
        </p>
        {selectedList.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            Clicca sui prodotti in alto per aggiungerli.
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {selectedList.map((p) => (
              <SelectedItem
                key={p.id}
                product={p}
                onRemove={handleRemove}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      {submitted ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          ✓ Iscrizione ricevuta! Ti avviseremo quando potrai importare questi
          dati in Visitae.
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end w-fit pt-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="waitlist-email"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500"
            >
              La tua mail
            </label>
            <input
              id="waitlist-email"
              type="email"
              placeholder="nome@studiodentistico.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-fit min-w-80 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-fit inline-flex items-center justify-center rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:opacity-40"
          >
            {selectedList.length > 0
              ? `Iscriviti con ${selectedList.length} prodott${selectedList.length === 1 ? "o" : "i"}`
              : "Iscriviti"}
          </button>
        </div>
      )}
    </section>
  );
}