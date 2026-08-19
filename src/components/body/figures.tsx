import { MALE_BACK, MALE_FRONT, type BodyDiagram } from "@musclemap/assets";

import { formatMuscleGroup } from "@/lib/format";
import type { MuscleGroup } from "@/lib/types";

import { SILHOUETTE, type RegionStyle } from "./palette";

/**
 * The asset's coarse group is already one-to-one with MUSCLE_GROUPS, so the
 * mapping is a lookup rather than id parsing. Anything absent here is drawn as
 * neutral anatomy and is not fillable.
 */
const GROUP_TO_MUSCLE: Record<string, MuscleGroup> = {
  CHEST: "chest",
  SHOULDERS_FRONT: "front_delts",
  SHOULDERS_SIDE: "side_delts",
  SHOULDERS_REAR: "rear_delts",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  TRAPEZIUS: "traps",
  LATS: "lats",
  RHOMBOIDS: "upper_back",
  BACK_LOWER: "lower_back",
  CORE: "abs",
  OBLIQUES: "obliques",
  GLUTES: "glutes",
  QUADS: "quads",
  HAMSTRINGS: "hamstrings",
  ADDUCTORS: "adductors",
  ABDUCTORS: "abductors",
  CALVES: "calves",
};

/**
 * MUSCLE_GROUPS carries a neck and the traced asset does not, so these two
 * regions are drawn here against the same 1024x1536 viewBox. Front is the
 * sternocleidomastoid pair converging on the sternal notch; back is the
 * cervical strip the trapezius leaves open between its two heads.
 */
const NECK_PATH: Record<"FRONT" | "BACK", string> = {
  FRONT:
    "M 477 188 C 481 210 492 238 505 257 L 515 257 C 503 236 493 209 489 188 Z " +
    "M 547 188 C 543 210 532 238 519 257 L 509 257 C 521 236 531 209 535 188 Z",
  BACK:
    "M 495 205 C 494 223 496 243 500 262 L 524 262 C 528 243 530 223 529 205 " +
    "C 518 210 506 210 495 205 Z",
};

export type RegionStyles = Record<MuscleGroup, RegionStyle>;

function Figure({
  diagram,
  styles,
  label,
}: {
  diagram: BodyDiagram;
  styles: RegionStyles;
  label: string;
}) {
  const neck = NECK_PATH[diagram.view];

  return (
    <figure className="min-w-0 flex-1">
      <svg
        viewBox={diagram.viewBox}
        role="img"
        aria-label={`${label} view`}
        className="h-auto w-full"
      >
        {diagram.outline.map((path, index) => (
          <path
            key={`outline-${index}`}
            d={path.d}
            fill={SILHOUETTE.fill}
            stroke={SILHOUETTE.stroke}
            strokeWidth={2}
          />
        ))}

        {diagram.muscles.map((path, index) => {
          const muscle = GROUP_TO_MUSCLE[path.group];

          if (!muscle) {
            return (
              <path
                key={`neutral-${index}`}
                d={path.d}
                fill={SILHOUETTE.fill}
                stroke={SILHOUETTE.stroke}
                strokeWidth={1}
              />
            );
          }

          return (
            <Region
              key={`${path.id ?? path.group}-${index}`}
              d={path.d}
              muscle={muscle}
              style={styles[muscle]}
            />
          );
        })}

        <Region d={neck} muscle="neck" style={styles.neck} />
      </svg>

      <figcaption className="text-fg-dim mt-1 text-center text-[11px]">{label}</figcaption>
    </figure>
  );
}

function Region({
  d,
  muscle,
  style,
}: {
  d: string;
  muscle: MuscleGroup;
  style: RegionStyle;
}) {
  return (
    <path
      d={d}
      data-muscle={muscle}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      className="cursor-pointer"
    >
      <title>{formatMuscleGroup(muscle)}</title>
    </path>
  );
}

export function Figures({ styles }: { styles: RegionStyles }) {
  return (
    <div className="flex gap-2">
      <Figure diagram={MALE_FRONT} styles={styles} label="Front" />
      <Figure diagram={MALE_BACK} styles={styles} label="Back" />
    </div>
  );
}
