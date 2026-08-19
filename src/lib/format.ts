/** Trims trailing zeros so 135.00 reads as 135 and 2.50 as 2.5. */
export function formatNumber(value: number, maxDecimals = 1): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Number(value.toFixed(maxDecimals));
  return String(rounded);
}

/** "front_delts" reads as "Front delts". */
export function formatMuscleGroup(muscle: string): string {
  const words = muscle.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Signed, for "remaining" figures that can go negative. */
export function formatSigned(value: number, maxDecimals = 0): string {
  const text = formatNumber(Math.abs(value), maxDecimals);
  return value < 0 ? `-${text}` : text;
}
