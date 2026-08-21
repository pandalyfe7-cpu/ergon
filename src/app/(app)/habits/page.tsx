import { HabitCard, type HabitCardData } from "@/components/habits/habit-card";
import { Card } from "@/components/ui";
import { getErgosContext, loadHabits } from "@/lib/ergos/data";
import { localDate, shiftDate } from "@/lib/time";

export default async function HabitsPage() {
  const ctx = await getErgosContext();
  const habits = await loadHabits(ctx);

  const cards: HabitCardData[] = habits.map((row) => {
    const markDates = new Set(
      row.events
        .filter((e) => e.event_type === "completed" || e.event_type === "floor")
        .map((e) => e.event_date),
    );
    const createdOn = localDate(ctx.timeZone, new Date(row.habit.created_at));
    return {
      slug: row.habit.slug,
      name: row.habit.name,
      state: row.habit.state,
      stateMeaning: row.habit.state_meanings[row.habit.state],
      advanceRule: row.habit.advance_rule,
      floorAction: row.habit.floor_action,
      streak: row.streak,
      markedToday: row.markedToday,
      daysLeft: row.daysLeft,
      auto: Boolean(row.habit.config.auto),
      strip: Array.from({ length: 14 }, (_, i) => {
        const date = shiftDate(ctx.today, i - 13);
        if (date < createdOn) return { date, outcome: "unknown" as const };
        if (markDates.has(date)) return { date, outcome: "met" as const };
        // No explicit miss event exists yet; an unmarked day is unknown, not a miss.
        return { date, outcome: "unknown" as const };
      }),
    };
  });

  return (
    <div>
      <header className="mb-5 max-w-[720px] xl:max-w-none">
        <h1 className="text-text-hi text-xl font-semibold">Habits</h1>
        <p className="text-text-mid mt-0.5 max-w-[75ch] text-sm">
          Build, Hold, Recover, Dormant. Struggle lowers the bar; it never
          raises the pressure.
        </p>
      </header>

      {cards.length === 0 ? (
        <Card className="max-w-[75ch]">
          <p className="text-text-hi text-sm font-medium">No habits seeded.</p>
          <p className="text-text-mid mt-1 text-sm">
            Run <span className="num">npm run db:seed</span> and reload.
          </p>
        </Card>
      ) : (
        <ul className="grid max-w-[720px] grid-cols-1 gap-3 xl:max-w-none xl:grid-cols-2 3xl:grid-cols-3">
          {cards.map((card, index) => (
            <HabitCard key={card.slug} habit={card} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
