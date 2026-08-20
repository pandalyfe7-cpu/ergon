import { Skeleton } from "@/components/ui";

export default function HabitsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
