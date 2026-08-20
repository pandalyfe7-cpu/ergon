import { Skeleton } from "@/components/ui";

export default function MetricsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="mt-5 space-y-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  );
}
