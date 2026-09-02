import {
  INTAKE_RULE_ID,
  INTAKE_RULE_VERSION,
} from "@/lib/onboarding/constants";
import type { BarrierCode, MotivatorCode, TraceEntry } from "@/lib/types";

export type IntakeDimensionInput = {
  dimensionKind: "barrier" | "motivator";
  code: BarrierCode | MotivatorCode;
  /** Current state, 0–100. */
  currentScore: number;
};

export type ScoredIntakeDimension = {
  dimensionKind: "barrier" | "motivator";
  code: string;
  score: number;
  rule_id: string;
  rule_version: string;
  trace: TraceEntry[];
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Deterministic intake score for one dimension. Provenance references the row
 * id that will be written (or was written) for this dimension.
 */
export function scoreIntakeDimension(
  input: IntakeDimensionInput,
  rowId: string,
): ScoredIntakeDimension {
  const score = clampScore(input.currentScore);
  const trace: TraceEntry[] = [
    {
      rule_id: INTAKE_RULE_ID,
      detail: `${input.dimensionKind} ${input.code} current=${score}`,
      rows: [`intake_scores ${rowId}`],
    },
  ];
  return {
    dimensionKind: input.dimensionKind,
    code: input.code,
    score,
    rule_id: INTAKE_RULE_ID,
    rule_version: INTAKE_RULE_VERSION,
    trace,
  };
}

export function scoreIntakeDimensions(
  inputs: IntakeDimensionInput[],
  rowIds: string[],
): ScoredIntakeDimension[] {
  if (inputs.length !== rowIds.length) {
    throw new Error("intake row ids must match dimension count");
  }
  return inputs.map((input, index) => scoreIntakeDimension(input, rowIds[index]));
}
