import { Skeleton } from "@/components/ui";

export default function HistoryLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-5 space-y-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
