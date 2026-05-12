import type { CSSProperties } from "react";

/** Transizioni superficie (hover): rapide e senza delay. Opacity/transform: durata rail + delay scaglionato. */
const SURFACE_MS = 100;

export function docRailLinkMotionStyle(
  staggerDelayMs: number,
  open: boolean,
  reduced: boolean,
  linkMs: number,
  railEase: string,
): CSSProperties {
  const fast = `${SURFACE_MS}ms ease`;
  const surface = `color ${fast}, background-color ${fast}, border-color ${fast}, box-shadow ${fast}`;
  const delay = `${staggerDelayMs}ms`;
  const motionPair = `opacity ${linkMs}ms ${railEase} ${delay}, transform ${linkMs}ms ${railEase} ${delay}`;

  if (reduced) {
    return {
      transition: surface,
      opacity: open ? 1 : 0,
      transform: open ? "translateY(0) scale(1)" : "translateY(0.35rem) scale(0.94)",
    };
  }

  return {
    transition: open ? `${motionPair}, ${surface}` : motionPair,
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0) scale(1)" : "translateY(0.35rem) scale(0.94)",
  };
}
