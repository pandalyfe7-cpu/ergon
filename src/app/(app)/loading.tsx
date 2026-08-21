import { Skeleton } from "@/components/ui";

/** Skeleton matching the Today layout: header plus density-tiered columns. */
export default function TodayLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-5 grid max-w-[720px] grid-cols-1 items-start gap-6 xl:max-w-none xl:grid-cols-[minmax(0,1fr)_380px] 3xl:grid-cols-[400px_minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4 3xl:order-2">
          <Skeleton className="h-40 w-full max-w-[75ch]" />
          <Skeleton className="h-80 w-full" />
        </div>
        <Skeleton className="h-44 w-full min-w-0 3xl:order-1" />
        <Skeleton className="h-28 w-full min-w-0 xl:col-start-2 3xl:col-start-auto 3xl:order-3" />
      </div>
    </div>
  );
}
