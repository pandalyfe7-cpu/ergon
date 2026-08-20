import { HabitCard, type HabitCardData } from "@/components/habits/habit-card";
import { Card } from "@/components/ui";
import { getErgosContext, loadHabits } from "@/lib/ergos/data";
import { shiftDate } from "@/lib/time";

export default async function HabitsPage() {
  const ctx = await getErgosContext();
  const habits = await loadHabits(ctx);

  const cards: HabitCardData[] = habits.map((row) => {
    const markDates = new Set(
      row.events
        .filter((e) => e.event_type === "completed" || e.event_type === "floor")
        .map((e) => e.event_date),
    );
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
        return { date, marked: markDates.has(date) };
      }),
    };
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">Habits</h1>
        <p className="text-text-mid mt-0.5 text-sm">
          Build, Hold, Recover, Dormant. Struggle lowers the bar; it never
          raises the pressure.
        </p>
      </header>

      {cards.length === 0 ? (
        <Card>
          <p className="text-text-hi text-sm font-medium">No habits seeded.</p>
          <p className="text-text-mid mt-1 text-sm">
            Run <span className="num">npm run db:seed</span> and reload.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {cards.map((card, index) => (
            <HabitCard key={card.slug} habit={card} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
