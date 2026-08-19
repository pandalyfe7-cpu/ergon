/**
 * Ergon design tokens.
 *
 * This file is the source of truth for raw color values. The same values are
 * declared as Tailwind theme variables in src/app/globals.css; every token name
 * here maps to a CSS variable of the same name in kebab-case, e.g.
 * `surfaceRaised` -> `--color-surface-raised` -> `bg-surface-raised`.
 * If you change a value, change it in both places.
 *
 * Use the Tailwind utility in markup. Import from this file only where a raw
 * string is required (SVG fill/stroke attributes, canvas, chart configs).
 *
 * Usage rules, not stylistic preferences:
 * - `accent` appears only on active states and the single primary action of a
 *   screen. It is not a brand color and never decorates anything.
 * - `statusAmber`, `statusRed`, `statusGreen` appear only where they carry
 *   their status meaning. They are never used for emphasis or celebration.
 * - No color outside this file. Dark only; there is no light theme.
 */
export const tokens = {
  background: "#0a0a0a",

  surface: "#141414",
  surfaceRaised: "#1c1c1c",
  surfaceOverlay: "#242424",

  border: "#2a2a2a",
  borderStrong: "#3a3a3a",

  fg: "#ededed",
  fgDim: "#a8a8a8",

  accent: "#7a8a9a",

  statusAmber: "#c4a06a",
  statusRed: "#b86b6b",
  statusGreen: "#7a9a7a",
} as const;

export type TokenName = keyof typeof tokens;

/**
 * Every number in the app renders in the monospace face. Apply the `num`
 * utility (defined in globals.css) rather than reaching for `font-mono`
 * directly, so numeric alignment stays consistent across screens.
 */
export const NUMERIC_CLASS = "num";
