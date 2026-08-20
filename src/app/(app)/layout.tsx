import { cookies } from "next/headers";

import { Nav } from "@/components/nav";
import { PaletteProvider } from "@/components/palette";
import { QuickAdd, type QuickHabit } from "@/components/quick-add";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { ToastProvider } from "@/components/toast";
import { requireUser } from "@/lib/data";
import { TIME_ZONE_COOKIE } from "@/lib/time";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const zone = cookieStore.get(TIME_ZONE_COOKIE)?.value ?? "";

  // Manually-marked habits get quick-add commands; auto habits mark themselves.
  const { supabase } = await requireUser();
  const { data: habits } = await supabase
    .from("habits")
    .select("slug, name, config")
    .order("sort_order");
  const quickHabits: QuickHabit[] = (habits ?? [])
    .filter((habit) => !habit.config?.auto)
    .map((habit) => ({ slug: habit.slug, name: habit.name }));

  return (
    <ToastProvider>
      <PaletteProvider>
        <TimeZoneSync current={zone} />
        <Nav />
        <QuickAdd habits={quickHabits} />
        <main className="min-h-dvh pb-16 lg:pb-0 lg:pl-56">{children}</main>
      </PaletteProvider>
    </ToastProvider>
  );
}
