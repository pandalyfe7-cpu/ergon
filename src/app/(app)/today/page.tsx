import { loadTodayList } from "@/lib/today/data";
import { TodayListView } from "@/components/today/today-list";
import { formatWeekday } from "@/lib/time";
import { getErgosContext } from "@/lib/ergos/data";

export default async function TodayPage() {
  const ctx = await getErgosContext();
  const list = await loadTodayList();

  return (
    <div className="mx-auto max-w-[720px]">
      <header className="mb-5">
        <h1 className="text-text-hi text-xl font-semibold">Today</h1>
        <p className="text-text-mid mt-0.5 text-sm">{formatWeekday(ctx.timeZone)}</p>
      </header>

      <TodayListView list={list} />
    </div>
  );
}
