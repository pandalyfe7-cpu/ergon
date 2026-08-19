import { tokens } from "@/lib/design/tokens";
import type { StimulusBand, TrendDirection } from "@/lib/training/stimulus";

export type RegionStyle = {
  fill: string;
  stroke: string;
  strokeWidth: number;
};

/** Unworked regions sit at the silhouette's own fill, so only the outline reads. */
export const UNFILLED: RegionStyle = {
  fill: tokens.surface,
  stroke: tokens.borderStrong,
  strokeWidth: 1.5,
};

/**
 * For screens that only say whether a muscle was worked, with no amount behind
 * it. One filled step, so nothing implies a scale that is not being shown.
 */
export const TOUCH_STYLE: Record<"touched" | "untouched", RegionStyle> = {
  touched: { fill: tokens.fgDim, stroke: tokens.borderStrong, strokeWidth: 1.5 },
  untouched: UNFILLED,
};

export const SILHOUETTE = {
  fill: tokens.surface,
  stroke: tokens.border,
} as const;

/**
 * Volume ramp is monochrome; amber marks the over-20 band as a warning only.
 * `low` uses borderStrong rather than surfaceOverlay because the darker step
 * is indistinguishable from an unfilled region against the silhouette.
 */
export const BAND_STYLE: Record<StimulusBand, RegionStyle> = {
  none: UNFILLED,
  low: { fill: tokens.borderStrong, stroke: tokens.fgDim, strokeWidth: 1 },
  in_range: { fill: tokens.fgDim, stroke: tokens.borderStrong, strokeWidth: 1.5 },
  high: { fill: tokens.fg, stroke: tokens.statusAmber, strokeWidth: 3 },
};

export const BAND_LABEL: Record<StimulusBand, string> = {
  none: "none",
  low: "low",
  in_range: "in range",
  high: "high",
};

export const DIRECTION_STYLE: Record<TrendDirection, RegionStyle> = {
  none: UNFILLED,
  rising: { fill: tokens.statusGreen, stroke: tokens.borderStrong, strokeWidth: 1.5 },
  flat: { fill: tokens.statusAmber, stroke: tokens.borderStrong, strokeWidth: 1.5 },
  falling: { fill: tokens.statusRed, stroke: tokens.borderStrong, strokeWidth: 1.5 },
};

export const DIRECTION_LABEL: Record<TrendDirection, string> = {
  none: "none",
  rising: "rising",
  flat: "flat",
  falling: "falling",
};
