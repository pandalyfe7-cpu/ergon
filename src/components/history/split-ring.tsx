import { tokens } from "@/lib/design/tokens";
import { formatMuscleGroup, formatNumber } from "@/lib/format";
import type { MuscleShare } from "@/lib/history/data";

const SIZE = 120;
const RADIUS = 48;
const THICKNESS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Gap between segments, in path units, so adjacent steps stay readable. */
const GAP = 2;

/**
 * Segments are one token at descending opacity rather than separate hues: the
 * palette is monochrome and the ranking is already the information. Largest
 * share is brightest, and the legend reads in the same order.
 */
const OPACITY = [1, 0.82, 0.68, 0.56, 0.46, 0.38, 0.31, 0.25];

/** Past this many the steps stop being distinguishable, so the tail is pooled. */
const NAMED_LIMIT = OPACITY.length - 1;

type Slice = {
  key: string;
  label: string;
  percent: number;
  opacity: number;
  /** Where this segment starts on the ring, in path units. */
  offset: number;
};

function slices(split: MuscleShare[]): Slice[] {
  const named = split.slice(0, NAMED_LIMIT).map((share, index) => ({
    key: share.muscle,
    label: formatMuscleGroup(share.muscle),
    percent: share.percent,
    opacity: OPACITY[index],
  }));

  const rest = split.slice(NAMED_LIMIT);
  const rows =
    rest.length === 0
      ? named
      : [
          ...named,
          {
            key: "rest",
            label: `${rest.length} more`,
            percent: rest.reduce((sum, share) => sum + share.percent, 0),
            opacity: OPACITY[OPACITY.length - 1],
          },
        ];

  let offset = 0;
  return rows.map((row) => {
    const placed = { ...row, offset };
    offset += (row.percent / 100) * CIRCUMFERENCE;
    return placed;
  });
}

export function SplitRing({ split }: { split: MuscleShare[] }) {
  const rows = slices(split);

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-28 shrink-0"
        role="img"
        aria-label={rows
          .map((row) => `${row.label} ${formatNumber(row.percent, 0)}%`)
          .join(", ")}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={tokens.surfaceOverlay}
          strokeWidth={THICKNESS}
        />

        {rows.map((row) => {
          const dash = Math.max((row.percent / 100) * CIRCUMFERENCE - GAP, 0.5);
          return (
            <circle
              key={row.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={tokens.fg}
              strokeOpacity={row.opacity}
              strokeWidth={THICKNESS}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-row.offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          );
        })}
      </svg>

      <ul className="min-w-0 flex-1 space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: tokens.fg, opacity: row.opacity }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px]">{row.label}</span>
            <span className="num text-fg-dim shrink-0 text-[11px]">
              {formatNumber(row.percent, 0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
