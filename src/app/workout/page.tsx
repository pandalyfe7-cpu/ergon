import { redirect } from "next/navigation";

import { ActiveLogging } from "@/components/workout/active-logging";
import { getWorkoutData } from "@/lib/data";

export default async function WorkoutPage() {
  const data = await getWorkoutData();
  if (!data) redirect("/");

  return <ActiveLogging {...data} />;
}
