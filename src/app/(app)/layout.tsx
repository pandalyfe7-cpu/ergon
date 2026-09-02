import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Nav } from "@/components/nav";
import { PaletteProvider } from "@/components/palette";
import { QuickAdd, type QuickHabit } from "@/components/quick-add";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { ToastProvider } from "@/components/toast";
import { requireUser } from "@/lib/data";
import { ensureSeeded } from "@/lib/ergos/seed";
import { getOnboardingState } from "@/lib/onboarding/profile";
import { TIME_ZONE_COOKIE } from "@/lib/time";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const zone = cookieStore.get(TIME_ZONE_COOKIE)?.value ?? "";

  const { supabase } = await requireUser();
  const onboarding = await getOnboardingState(supabase);
  if (!onboarding.complete) redirect("/onboarding");

  await ensureSeeded(supabase);

  // Manually-marked habits get quick-add commands; auto habits mark themselves.
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
        <QuickAdd habits={quickHabits} />
        <div className="flex min-h-dvh">
          <Nav />
          <main className="min-w-0 flex-1 pb-16 md:pb-0">
            <div className="mx-auto w-full max-w-[1680px] px-6 py-8 xl:px-8 3xl:px-12">
              {children}
            </div>
          </main>
        </div>
      </PaletteProvider>
    </ToastProvider>
  );
}
