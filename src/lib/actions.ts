"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { linkDecisionToSession } from "@/lib/coach/decisions";
import { requireUser } from "@/lib/data";
import type { SaveSetInput } from "@/lib/training/sets";
import {
  MUSCLE_GROUPS,
  type ExerciseConstraint,
  type LoggedSet,
  type StimulusWeights,
  type TemplateExercise,
} from "@/lib/types";

function readNumber(formData: FormData, field: string): number {
  const value = Number(formData.get(field));
  return Number.isFinite(value) ? value : 0;
}

export async function setMacroTargets(formData: FormData) {
  const { supabase } = await requireUser();

  const values = {
    calories: Math.max(0, readNumber(formData, "calories")),
    protein_g: Math.max(0, readNumber(formData, "protein_g")),
    carbs_g: Math.max(0, readNumber(formData, "carbs_g")),
    fat_g: Math.max(0, readNumber(formData, "fat_g")),
  };

  const existing = await supabase.from("daily_macro_targets").select("id").maybeSingle();

  if (existing.data) {
    await supabase
      .from("daily_macro_targets")
      .update(values)
      .eq("id", existing.data.id);
  } else {
    await supabase.from("daily_macro_targets").insert(values);
  }

  revalidatePath("/");
}

export async function addWater() {
  const { supabase } = await requireUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("water_increment_ml")
    .maybeSingle();

  await supabase
    .from("water_logs")
    .insert({ amount_ml: settings?.water_increment_ml ?? 250 });

  revalidatePath("/");
}

export async function logBodyweight(formData: FormData) {
  const { supabase } = await requireUser();

  const weight_lb = readNumber(formData, "weight_lb");
  if (weight_lb <= 0) return;

  await supabase.from("bodyweight_logs").insert({ weight_lb });
  revalidatePath("/");
  revalidatePath("/progress");
}

function normalizeConstraint(constraint: ExerciseConstraint): ExerciseConstraint {
  const note = constraint.note?.trim() ? constraint.note.trim() : null;

  switch (constraint.type) {
    case "ROM_LIMIT":
      return {
        type: "ROM_LIMIT",
        min_degrees: Number(constraint.min_degrees) || 0,
        max_degrees: Number(constraint.max_degrees) || 0,
        note,
      };
    case "LOAD_CEILING":
      return {
        type: "LOAD_CEILING",
        max_load_lb: Number(constraint.max_load_lb) || 0,
        note,
      };
    case "SEATED":
      return { type: "SEATED", note };
    case "NO_AXIAL":
      return { type: "NO_AXIAL", note };
    case "NO_VALSALVA":
      return { type: "NO_VALSALVA", note };
  }
}

export async function saveExercise(input: {
  id: string | null;
  name: string;
  stimulus_weights: StimulusWeights;
  constraints: ExerciseConstraint[];
}): Promise<{ error: string } | void> {
  const { supabase } = await requireUser();

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  // Only canonical muscle keys are stored; the body tab reads these keys directly.
  const stimulus_weights: StimulusWeights = {};
  for (const muscle of MUSCLE_GROUPS) {
    const weight = input.stimulus_weights[muscle];
    if (typeof weight === "number" && weight > 0) stimulus_weights[muscle] = weight;
  }

  const values = {
    name,
    stimulus_weights,
    constraints: input.constraints.map(normalizeConstraint),
  };

  const result = input.id
    ? await supabase.from("exercises").update(values).eq("id", input.id)
    : await supabase.from("exercises").insert(values);

  if (result.error) return { error: result.error.message };

  revalidatePath("/exercises");
  revalidatePath("/routines");
  redirect("/exercises");
}

export async function saveTemplate(input: {
  id: string | null;
  name: string;
  exercises: TemplateExercise[];
}): Promise<{ error: string } | void> {
  const { supabase } = await requireUser();

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const exercises: TemplateExercise[] = [];
  for (const row of input.exercises) {
    if (!row.exercise_id) continue;
    const prescribed_sets = Math.max(1, Math.trunc(Number(row.prescribed_sets) || 1));
    const rep_min = Math.max(1, Math.trunc(Number(row.rep_min) || 1));
    const rep_max = Math.max(rep_min, Math.trunc(Number(row.rep_max) || rep_min));
    exercises.push({ exercise_id: row.exercise_id, prescribed_sets, rep_min, rep_max });
  }

  if (exercises.length === 0) return { error: "Add at least one exercise." };

  const values = { name, exercises };

  const result = input.id
    ? await supabase.from("exercise_templates").update(values).eq("id", input.id)
    : await supabase.from("exercise_templates").insert(values);

  if (result.error) return { error: result.error.message };

  revalidatePath("/routines");
  revalidatePath("/");
  redirect("/routines");
}

export async function deleteTemplate(id: string) {
  const { supabase } = await requireUser();

  await supabase.from("exercise_templates").delete().eq("id", id);

  revalidatePath("/routines");
  revalidatePath("/");
  redirect("/routines");
}

export async function startSession(templateId: string | null) {
  const { supabase } = await requireUser();

  const { data: open } = await supabase
    .from("sessions")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();

  if (!open) {
    await supabase.from("sessions").insert({ template_id: templateId });
  }

  revalidatePath("/");
  redirect("/workout");
}

export async function finishSession() {
  const { supabase } = await requireUser();

  const { data: open } = await supabase
    .from("sessions")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();

  if (open) {
    await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", open.id);
  }

  revalidatePath("/");
  redirect("/");
}

export async function saveSet(
  input: SaveSetInput,
): Promise<{ set: LoggedSet } | { error: string }> {
  const { supabase } = await requireUser();

  const reps = Math.trunc(input.reps);
  if (!Number.isFinite(input.weight_lb) || input.weight_lb < 0) {
    return { error: "Weight must be zero or more." };
  }
  if (!Number.isFinite(reps) || reps < 1) {
    return { error: "Reps must be at least one." };
  }

  if (input.rpe !== null && (!Number.isFinite(input.rpe) || input.rpe < 1 || input.rpe > 10)) {
    return { error: "RPE must be 1 to 10." };
  }

  const values = {
    session_id: input.session_id,
    exercise_id: input.exercise_id,
    weight_lb: input.weight_lb,
    reps,
    rpe: input.rpe,
    is_warmup: input.is_warmup,
    set_order: input.set_order,
  };

  const result = input.id
    ? await supabase.from("logged_sets").update(values).eq("id", input.id).select().single()
    : await supabase.from("logged_sets").insert(values).select().single();

  if (result.error || !result.data) {
    return { error: result.error?.message ?? "Could not save set." };
  }

  if (!input.is_warmup) {
    await linkDecisionToSession(supabase, input.exercise_id, input.session_id);
  }

  return { set: result.data };
}
