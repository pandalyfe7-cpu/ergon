/**
 * Persistence for engine output. Refresh runs on load and after any write:
 * today's rows are upserted in place (stable identity per action per day), so
 * accept/dismiss/snooze survive refreshes and the table does not grow
 * unboundedly. Rows the engine no longer produces expire.
 */

import { ENGINE_VERSION, runEngine } from "@/lib/engine/engine";
import type { EngineOutput } from "@/lib/engine/types";
import type { ErgosContext, LoadedEngineData } from "@/lib/ergos/data";
import { loadEngineData } from "@/lib/ergos/data";
import type { Recommendation } from "@/lib/types";

export type GuidanceData = {
  output: EngineOutput;
  /** Persisted rows for today's surfaced recommendations, in display order. */
  rows: Recommendation[];
  /** Today's acted-on rows (accepted, dismissed, snoozed), newest action first. */
  actedOn: Recommendation[];
  loaded: LoadedEngineData;
};

export async function refreshRecommendations(ctx: ErgosContext): Promise<GuidanceData> {
  const { data: profile } = await ctx.supabase
    .from("user_profile")
    .select("onboarding_step")
    .maybeSingle();

  const loaded = await loadEngineData(ctx);

  // Missing profile is unknown, not step 0. Do not insert a default row.
  if (profile == null || profile.onboarding_step < 4) {
    const now = new Date().toISOString();
    await ctx.supabase
      .from("recommendations")
      .update({ status: "expired", status_at: now })
      .eq("rec_date", ctx.today)
      .eq("status", "active");

    return {
      output: {
        recommendations: [],
        coldStart: false,
        waitingOn: [],
        engineVersion: ENGINE_VERSION,
        notReady: "Recommendations stay off until intake steps 1 to 4 are recorded.",
      },
      rows: [],
      actedOn: [],
      loaded,
    };
  }

  const output = runEngine(loaded.state);

  const { data: existing } = await ctx.supabase
    .from("recommendations")
    .select("*")
    .eq("rec_date", ctx.today);
  const byKey = new Map<string, Recommendation>(
    (existing ?? []).map((row) => [`${row.action_kind}|${row.action_ref}`, row]),
  );

  const now = new Date().toISOString();
  const rows: Recommendation[] = [];
  const seenKeys = new Set<string>();

  let slot = 0;
  for (const rec of output.recommendations) {
    const key = `${rec.kind}|${rec.ref}`;
    seenKeys.add(key);
    const row = byKey.get(key);

    const values = {
      slot,
      title: rec.title,
      reason: rec.reason,
      est_minutes: rec.estMinutes,
      moves: rec.moves,
      score: rec.score,
      rule_ids: rec.ruleIds,
      trace: rec.trace,
      engine_version: ENGINE_VERSION,
      seed_versions: loaded.state.seedVersions,
    };

    if (!row) {
      const { data: inserted } = await ctx.supabase
        .from("recommendations")
        .insert({
          rec_date: ctx.today,
          action_kind: rec.kind,
          action_ref: rec.ref,
          ...values,
        })
        .select()
        .single();
      if (inserted) {
        rows.push(inserted);
        slot++;
      }
      continue;
    }

    if (row.status === "accepted" || row.status === "dismissed") {
      // Acted on today; stays hidden even if the engine still produces it.
      continue;
    }
    if (row.status === "snoozed" && row.snoozed_until && row.snoozed_until > now) {
      continue;
    }

    const { data: updated } = await ctx.supabase
      .from("recommendations")
      .update({ ...values, status: "active", snoozed_until: null })
      .eq("id", row.id)
      .select()
      .single();
    if (updated) {
      rows.push(updated);
      slot++;
    }
  }

  // Anything active in the table that the engine no longer produces expires.
  for (const row of existing ?? []) {
    const key = `${row.action_kind}|${row.action_ref}`;
    if (!seenKeys.has(key) && row.status === "active") {
      await ctx.supabase
        .from("recommendations")
        .update({ status: "expired", status_at: now })
        .eq("id", row.id);
    }
  }

  const actedOn = (existing ?? [])
    .filter((row) => ["accepted", "dismissed", "snoozed"].includes(row.status))
    .sort((a, b) => (b.status_at ?? "").localeCompare(a.status_at ?? ""));

  return { output, rows, actedOn, loaded };
}

export type RuleFeedback = {
  rule_id: string;
  shown: number;
  accepted: number;
  dismissed: number;
  ignored: number;
};

/** The last 7 days of feedback, grouped by rule id, worst-ignored first. */
export async function getWeeklyRuleFeedback(ctx: ErgosContext): Promise<RuleFeedback[]> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await ctx.supabase
    .from("recommendations")
    .select("rule_ids, status")
    .gte("rec_date", weekAgo);

  const byRule = new Map<string, RuleFeedback>();
  for (const row of data ?? []) {
    for (const ruleId of row.rule_ids) {
      const entry =
        byRule.get(ruleId) ??
        ({ rule_id: ruleId, shown: 0, accepted: 0, dismissed: 0, ignored: 0 } as RuleFeedback);
      entry.shown++;
      if (row.status === "accepted") entry.accepted++;
      if (row.status === "dismissed") entry.dismissed++;
      if (row.status === "expired") entry.ignored++;
      byRule.set(ruleId, entry);
    }
  }
  return [...byRule.values()].sort(
    (a, b) => b.dismissed + b.ignored - (a.dismissed + a.ignored),
  );
}
