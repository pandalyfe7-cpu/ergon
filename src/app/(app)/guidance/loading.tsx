import { Skeleton } from "@/components/ui";

export default function GuidanceLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-12">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
