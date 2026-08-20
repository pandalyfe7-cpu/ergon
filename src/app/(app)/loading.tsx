import { Skeleton } from "@/components/ui";

/** Skeleton matching the Today layout: header, entry card, rec card, session. */
export default function TodayLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-5 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
