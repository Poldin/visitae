import type { LandingBrand } from "@/lib/getLandingBrands";

function distributeBrandsToRows(brands: LandingBrand[]): [
  LandingBrand[],
  LandingBrand[],
  LandingBrand[],
] {
  if (brands.length === 0) return [[], [], []];

  const rows: [LandingBrand[], LandingBrand[], LandingBrand[]] = [[], [], []];
  brands.forEach((b, i) => {
    rows[i % 3].push(b);
  });

  for (let r = 0; r < 3; r++) {
    if (rows[r].length === 0) rows[r] = [...brands];
  }

  return rows;
}

function BrandChip({ brand }: { brand: LandingBrand }) {
  return (
    <div className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-2.5 pr-4 dark:border-zinc-700 dark:bg-zinc-900">
      {brand.image_url ? (
        <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-zinc-200/90 dark:bg-white dark:ring-zinc-300/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL da storage/catalogo pubblico senza configurare domini remoti */}
          <img
            src={brand.image_url}
            alt=""
            className="h-full w-full rounded-full object-contain p-1.5"
            draggable={false}
          />
        </span>
      ) : (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {brand.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="whitespace-nowrap text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {brand.name}
      </span>
    </div>
  );
}

function MarqueeRow({
  brands,
  reverse,
  durationSec,
}: {
  brands: LandingBrand[];
  reverse?: boolean;
  durationSec: number;
}) {
  if (brands.length === 0) return null;

  const sequence = [...brands, ...brands];

  return (
    <div className="landing-brand-marquee-clip overflow-hidden py-1">
      <div
        className={`landing-brand-marquee-track flex gap-4 ${reverse ? "landing-brand-marquee-track-reverse" : ""}`}
        style={{
          animationDuration: `${durationSec}s`,
        }}
      >
        {sequence.map((b, i) => (
          <BrandChip key={`${b.id}-${i}`} brand={b} />
        ))}
      </div>
    </div>
  );
}

const SKELETON_SLOT_COUNT = 10;

function SkeletonMarqueeRow({
  reverse,
  durationSec,
}: {
  reverse?: boolean;
  durationSec: number;
}) {
  const half = Array.from({ length: SKELETON_SLOT_COUNT }, (_, i) => `a-${i}`);
  const sequence = [...half, ...half];

  return (
    <div className="landing-brand-marquee-clip overflow-hidden py-1">
      <div
        className={`landing-brand-marquee-track flex gap-4 ${reverse ? "landing-brand-marquee-track-reverse" : ""}`}
        style={{
          animationDuration: `${durationSec}s`,
        }}
      >
        {sequence.map((slot, idx) => (
          <div
            key={`${slot}-${idx}`}
            className="inline-flex h-11 w-38 shrink-0 rounded-full bg-zinc-200/90 motion-safe:animate-pulse dark:bg-zinc-700/70"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

type LandingBrandsMarqueeProps = {
  brands: LandingBrand[];
};

export default function LandingBrandsMarquee({ brands }: LandingBrandsMarqueeProps) {
  const hasBrands = brands.length > 0;
  const [rowA, rowB, rowC] = hasBrands
    ? distributeBrandsToRows(brands)
    : [[], [], []];

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        {hasBrands ? (
          <>
            <MarqueeRow brands={rowA} durationSec={48} />
            <MarqueeRow brands={rowB} reverse durationSec={62} />
            <MarqueeRow brands={rowC} durationSec={55} />
          </>
        ) : (
          <>
            <SkeletonMarqueeRow durationSec={48} />
            <SkeletonMarqueeRow reverse durationSec={62} />
            <SkeletonMarqueeRow durationSec={55} />
          </>
        )}
      </div>
    </section>
  );
}
