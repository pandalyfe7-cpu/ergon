import { cookies } from "next/headers";

import { Nav } from "@/components/nav";
import { PaletteProvider } from "@/components/palette";
import { TimeZoneSync } from "@/components/time-zone-sync";
import { ToastProvider } from "@/components/toast";
import { TIME_ZONE_COOKIE } from "@/lib/time";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const zone = cookieStore.get(TIME_ZONE_COOKIE)?.value ?? "";

  return (
    <ToastProvider>
      <PaletteProvider>
        <TimeZoneSync current={zone} />
        <Nav />
        <main className="min-h-dvh pb-16 lg:pb-0 lg:pl-56">{children}</main>
      </PaletteProvider>
    </ToastProvider>
  );
}
