import Link from "next/link";

import { TimeZoneSync } from "@/components/time-zone-sync";
import { MacroStatus } from "@/components/today/macro-status";
import { LogWeight, WaterControl } from "@/components/today/quick-logs";
import { SessionSection } from "@/components/today/session-section";
import { TargetsSheet } from "@/components/today/targets-sheet";
import { buttonClass, Panel } from "@/components/ui";
import { getTodayData } from "@/lib/data";

export default async function TodayPage() {
  const today = await getTodayData();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-12">
      <TimeZoneSync current={today.timeZone} />

      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Today</h1>
          <p className="text-fg-dim text-xs">{today.dateLabel}</p>
        </div>
        <TargetsSheet target={today.target} trigger="gear" />
      </header>

      <div className="space-y-3">
        <Panel>
          {today.target ? (
            <MacroStatus target={today.target} consumed={today.consumed} />
          ) : (
            <div className="space-y-3">
              <p className="text-fg-dim text-sm">No macro targets set.</p>
              <TargetsSheet target={null} trigger="action" />
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <WaterControl
            current={today.waterMl}
            target={today.settings.daily_water_target_ml}
          />
          <LogWeight />
        </div>

        <Link href="/log-food" className={buttonClass("secondary", "block text-center")}>
          Log food
        </Link>

        <SessionSection
          openSession={today.openSession}
          templates={today.templates}
        />

        <div className="grid grid-cols-2 gap-3">
          <Link href="/body" className={buttonClass("secondary", "block text-center")}>
            Body
          </Link>
          <Link href="/coach" className={buttonClass("secondary", "block text-center")}>
            Coach
          </Link>
          <Link href="/progress" className={buttonClass("secondary", "block text-center")}>
            Progress
          </Link>
          <Link href="/history" className={buttonClass("secondary", "block text-center")}>
            History
          </Link>
        </div>
      </div>
    </main>
  );
}
