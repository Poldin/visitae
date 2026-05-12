"use client";

type ProductHeroImageColumnProps = {
  imageUrl: string;
  /** Classi sul wrapper (border, larghezza, breakpoint). */
  className?: string;
};

/** Colonna di anteprima immagine prodotto (desktop / tablet). */
export function ProductHeroImageColumn({ imageUrl, className = "" }: ProductHeroImageColumnProps) {
  return (
    <aside className={`shrink-0 ${className}`} aria-label="Immagine prodotto">
      <div className="sticky top-0 flex max-h-[min(72vh,520px)] flex-col gap-2 p-3 lg:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Immagine prodotto</p>
        <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-slate-200/90 bg-white p-3 shadow-[inset_0_1px_0_rgba(15,23,42,0.04)]">
          <img
            src={imageUrl}
            alt=""
            className="max-h-[min(64vh,480px)] w-full max-w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </aside>
  );
}
